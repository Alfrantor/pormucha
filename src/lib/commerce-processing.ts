import Stripe from "stripe";
import { db } from "@/lib/db";
import {
  addPlanInterval,
  buildSubscriptionComposition,
  ensureSubscriptionScheduleSchema,
  getSubscriptionOrderCycleNote,
  getSubscriptionShipmentDate,
  isSubscriptionShipmentDue,
  normalizeStoredFlavorSelection,
} from "@/lib/subscriptions";
import { sendPurchaseConfirmationEmail, sendSubscriptionConfirmationEmail } from "@/lib/order-emails";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

function getStripeCurrentPeriodEnd(
  subscription: Stripe.Subscription,
) {
  const typedSubscription = subscription as Stripe.Subscription & {
    current_period_end?: number;
    items: {
      data: Array<{ current_period_end?: number }>;
    };
  };

  return (
    typedSubscription.current_period_end ||
    typedSubscription.items.data[0]?.current_period_end ||
    null
  );
}

async function getDefaultFulfillmentLocation() {
  const defaultLocation = await db.location.findFirst({
    where: { isDefault: true, isArchived: false },
  });

  if (!defaultLocation) {
    throw new Error("No hay una bodega principal configurada para surtir pedidos.");
  }

  return defaultLocation;
}

async function applyOrderCompositionInventory(orderId: string, reason: string, userId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: {
          composition: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error("La orden no existe.");
  }

  const defaultLocation = await getDefaultFulfillmentLocation();
  const existingMovements = await db.inventoryMovement.count({
    where: {
      locationId: defaultLocation.id,
      type: "OUT",
      reason,
    },
  });

  if (existingMovements > 0) {
    return { order, defaultLocation, inventoryProcessed: false };
  }

  for (const item of order.orderItems) {
    for (const comp of item.composition) {
      const totalToDecrement = Number(comp.quantity) * Number(item.quantity || 1);
      if (!(totalToDecrement > 0)) continue;

      await db.stock.upsert({
        where: {
          flavorId_locationId: {
            flavorId: comp.flavorId,
            locationId: defaultLocation.id,
          },
        },
        update: {
          quantity: { decrement: totalToDecrement },
        },
        create: {
          flavorId: comp.flavorId,
          locationId: defaultLocation.id,
          quantity: -totalToDecrement,
        },
      });

      await db.inventoryMovement.create({
        data: {
          flavorId: comp.flavorId,
          locationId: defaultLocation.id,
          type: "OUT",
          quantity: totalToDecrement,
          reason,
          userId,
        },
      });
    }
  }

  return { order, defaultLocation, inventoryProcessed: true };
}

type SubscriptionContext = Awaited<ReturnType<typeof getSubscriptionContext>>;

async function getSubscriptionContext(subscriptionId: string) {
  return db.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      client: {
        include: {
          addresses: true,
        },
      },
      plan: {
        include: {
          product: true,
        },
      },
    },
  });
}

async function createSubscriptionOrderFromContext(
  subscription: NonNullable<SubscriptionContext>,
  shipmentDate: Date,
  paymentReference: string,
  paymentNote: string,
  paymentMethod: string,
) {
  const cycleNote = getSubscriptionOrderCycleNote(shipmentDate);
  const existingOrder = await db.order.findFirst({
    where: {
      subscriptionId: subscription.id,
      notes: {
        contains: cycleNote,
      },
    },
  });

  if (existingOrder) {
    return { success: true, order: existingOrder, duplicated: true as const };
  }

  const shippingAddress = subscription.client.addresses.find((address) => address.type === "ENVIO");
  if (!shippingAddress) {
    return { success: false, reason: "missing_shipping_address" as const };
  }

  const activeFlavors = await db.flavor.findMany({
    where: { isArchived: false },
    select: {
      id: true,
      name: true,
    },
  });

  const normalizedSelection = normalizeStoredFlavorSelection(subscription.selectedFlavors, activeFlavors);
  let composition;

  try {
    composition = buildSubscriptionComposition(normalizedSelection, activeFlavors, subscription.plan.unitCount);
  } catch (error) {
    return {
      success: false,
      reason: "invalid_flavor_selection" as const,
      message: error instanceof Error ? error.message : "Selección de sabores inválida",
    };
  }

  const defaultLocation = await getDefaultFulfillmentLocation();
  const planAmount = Number(subscription.plan.price || 0);

  const order = await db.order.create({
    data: {
      channel: "SUBSCRIPTION",
      status: "PAID",
      clientId: subscription.clientId,
      subscriptionId: subscription.id,
      paymentMethod,
      paymentId: paymentReference,
      total: planAmount,
      subtotal: planAmount,
      amountPaid: planAmount,
      isPaid: true,
      fullName: subscription.client.fullName,
      email: subscription.client.email || undefined,
      phone: subscription.client.phone || undefined,
      street: shippingAddress.street,
      number: shippingAddress.number,
      neighborhood: shippingAddress.neighborhood || undefined,
      zipCode: shippingAddress.zipCode,
      city: shippingAddress.city,
      state: shippingAddress.state,
      reference: shippingAddress.reference || undefined,
      locationId: defaultLocation.id,
      notes: `${cycleNote} | Surtido recurrente de suscripción`,
      orderItems: {
        create: [
          {
            productId: subscription.plan.productId || null,
            productName: subscription.plan.product?.name || subscription.plan.name,
            quantity: 1,
            unitPrice: planAmount,
            subtotal: planAmount,
            composition: {
              create: composition.map((item) => ({
                flavorId: item.flavorId,
                quantity: item.quantity,
              })),
            },
          },
        ],
      },
      payments: {
        create: [
          {
            amount: planAmount,
            paymentMethod,
            note: paymentNote,
          },
        ],
      },
    },
  });

  const reason = `Suscripción - Orden #${order.id.slice(-6).toUpperCase()} - ${cycleNote}`;
  const { inventoryProcessed } = await applyOrderCompositionInventory(
    order.id,
    reason,
    paymentMethod === "STRIPE" ? "subscription-checkout" : "subscription-renewal",
  );

  await db.subscription.update({
    where: { id: subscription.id },
    data: {
      nextShipmentDate: addPlanInterval(shipmentDate, subscription.plan),
    },
  });

  return { success: true, order, inventoryProcessed, duplicated: false as const };
}

export async function tryFulfillDueSubscriptionShipment(
  subscriptionId: string,
  options?: {
    paymentReference?: string | null;
    paymentMethod?: string;
    paymentNote?: string;
    forceDue?: boolean;
  },
) {
  await ensureSubscriptionScheduleSchema();

  const subscription = await getSubscriptionContext(subscriptionId);
  if (!subscription) {
    return { success: false, reason: "subscription_not_found" as const };
  }

  const shipmentDate = getSubscriptionShipmentDate(subscription);
  if (!options?.forceDue && !isSubscriptionShipmentDue(subscription)) {
    return { success: false, reason: "shipment_not_due" as const };
  }

  return createSubscriptionOrderFromContext(
    subscription,
    shipmentDate,
    options?.paymentReference || `subscription-${subscription.id}`,
    options?.paymentNote || `Surtido de suscripción ${getSubscriptionOrderCycleNote(shipmentDate)}`,
    options?.paymentMethod || "STRIPE_SUBSCRIPTION",
  );
}

export async function processPaidWebOrder(orderId: string, paymentId?: string | null) {
  const reason = `Venta Web - Orden #${orderId.slice(-6).toUpperCase()}`;
  const { order, defaultLocation, inventoryProcessed } = await applyOrderCompositionInventory(
    orderId,
    reason,
    "web-checkout",
  );

  const updatedOrder = await db.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      paymentId: paymentId || order.paymentId,
      locationId: defaultLocation.id,
      reference: order.reference || undefined,
    },
  });

  const orderEmail = updatedOrder.email || order.email;
  if (orderEmail && orderEmail !== "sin@correo.com") {
    try {
      await sendPurchaseConfirmationEmail({
        to: orderEmail,
        name: updatedOrder.fullName || order.fullName || null,
        orderNumber: updatedOrder.id.slice(-6).toUpperCase(),
        total: Number(updatedOrder.total || 0),
        shippingCost: Number(updatedOrder.shippingCost || 0),
        shippingProvider: updatedOrder.shippingProvider || null,
        items: order.orderItems.map((item) => ({
          name: item.productName || "Producto Pormucha",
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unitPrice || 0),
          subtotal: Number(item.subtotal || 0),
        })),
      });
    } catch (error) {
      console.error("No se pudo enviar el correo de compra:", error);
    }
  }

  return {
    order: updatedOrder,
    inventoryProcessed,
  };
}

export async function processPaidSubscriptionSession(session: Stripe.Checkout.Session) {
  await ensureSubscriptionScheduleSchema();

  const planId = session.metadata?.planId;
  const clerkUserId = session.metadata?.clerkUserId;
  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name;
  const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : null;

  if (!planId || (!clerkUserId && !customerEmail) || !stripeSubscriptionId) {
    return { success: false, reason: "missing_metadata" as const };
  }

  let client;

  if (clerkUserId) {
    client = await db.client.upsert({
      where: { clerkUserId },
      update: {
        ...(customerEmail ? { email: customerEmail } : {}),
      },
      create: {
        clerkUserId,
        email: customerEmail ?? `clerk_${clerkUserId}@pormucha.com`,
        fullName: customerName || "Nuevo miembro",
      },
    });
  } else {
    client = await db.client.upsert({
      where: { email: customerEmail! },
      update: {},
      create: {
        email: customerEmail!,
        fullName: customerName || "Cliente nuevo",
      },
    });
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const periodEndSeconds = getStripeCurrentPeriodEnd(stripeSubscription);
  const currentPeriodEnd = periodEndSeconds
    ? new Date(Number(periodEndSeconds) * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const existing = await db.subscription.findFirst({
    where: { stripeSubscriptionId },
  });

  let subscription;

  if (existing) {
    subscription = await db.subscription.update({
      where: { id: existing.id },
      data: {
        clientId: client.id,
        planId,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : existing.stripeCustomerId,
        status: "active",
        currentPeriodEnd,
        nextShipmentDate: existing.nextShipmentDate ?? new Date(),
      },
    });
  } else {
    subscription = await db.subscription.create({
      data: {
        clientId: client.id,
        planId,
        stripeSubscriptionId,
        stripeCustomerId: session.customer as string,
        status: "active",
        currentPeriodEnd,
        nextShipmentDate: new Date(),
      },
    });
  }

  const initialFulfillment = await tryFulfillDueSubscriptionShipment(subscription.id, {
    paymentReference:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : typeof session.id === "string"
          ? session.id
          : `checkout-session-${subscription.id}`,
    paymentMethod: "STRIPE_SUBSCRIPTION",
    paymentNote: "Alta inicial de suscripción",
    forceDue: true,
  });

  if (initialFulfillment.success && !initialFulfillment.duplicated) {
    const subscriptionDetails = await getSubscriptionContext(subscription.id);
    if (subscriptionDetails?.client?.email) {
      try {
        await sendSubscriptionConfirmationEmail({
          to: subscriptionDetails.client.email,
          name: subscriptionDetails.client.fullName || customerName || null,
          planName: subscriptionDetails.plan.product?.name || subscriptionDetails.plan.name,
          unitCount: subscriptionDetails.plan.unitCount,
          nextShipmentDate: subscriptionDetails.nextShipmentDate,
        });
      } catch (error) {
        console.error("No se pudo enviar el correo de suscripción:", error);
      }
    }
  }

  return { success: true, subscription, initialFulfillment };
}

export async function syncStripeSubscriptionState(subscription: Stripe.Subscription) {
  await ensureSubscriptionScheduleSchema();

  const stripeSubscriptionId = subscription.id;
  const periodEndSeconds = getStripeCurrentPeriodEnd(subscription);
  const currentPeriodEnd = periodEndSeconds
    ? new Date(Number(periodEndSeconds) * 1000)
    : undefined;

  const existing = await db.subscription.findFirst({
    where: { stripeSubscriptionId },
  });

  if (!existing) {
    return { success: false, reason: "not_found" as const };
  }

  const updated = await db.subscription.update({
    where: { id: existing.id },
    data: {
      stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : existing.stripeCustomerId,
      status: subscription.status,
      ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
      ...(existing.nextShipmentDate ? {} : { nextShipmentDate: new Date() }),
    },
  });

  return { success: true, subscription: updated };
}

export async function processPaidSubscriptionInvoice(invoice: Stripe.Invoice) {
  await ensureSubscriptionScheduleSchema();

  const invoiceLike = invoice as Stripe.Invoice & {
    subscription?: string | { id?: string | null } | null;
    payment_intent?: string | null;
    period_end?: number | null;
  };
  const stripeSubscriptionId =
    typeof invoiceLike.subscription === "string"
      ? invoiceLike.subscription
      : invoiceLike.subscription?.id;

  if (!stripeSubscriptionId) {
    return { success: false, reason: "missing_subscription" as const };
  }

  const subscription = await db.subscription.findFirst({
    where: { stripeSubscriptionId },
    include: {
      plan: true,
    },
  });

  if (!subscription) {
    return { success: false, reason: "subscription_not_found" as const };
  }

  const periodEndSeconds =
    invoice.lines.data[0]?.period?.end ||
    invoiceLike.period_end ||
    Math.floor(subscription.currentPeriodEnd.getTime() / 1000);
  const paidThroughDate = new Date(Number(periodEndSeconds) * 1000);

  await db.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "active",
      currentPeriodEnd: paidThroughDate,
      nextShipmentDate: subscription.nextShipmentDate ?? new Date(),
    },
  });

  return tryFulfillDueSubscriptionShipment(subscription.id, {
    paymentReference: typeof invoiceLike.payment_intent === "string" ? invoiceLike.payment_intent : invoice.id,
    paymentMethod: "STRIPE_SUBSCRIPTION",
    paymentNote: `Cobro recurrente ${getSubscriptionOrderCycleNote(paidThroughDate)}`,
  });
}
