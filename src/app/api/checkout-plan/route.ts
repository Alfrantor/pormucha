import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type CheckoutPlanBody = {
  planId?: string;
};

type MissingField = "nombre" | "correo" | "teléfono" | "dirección de envío";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const customerEmail = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
    const customerName = `${clerkUser?.firstName || ""} ${clerkUser?.lastName || ""}`.trim();

    const { planId } = (await req.json()) as CheckoutPlanBody;
    if (!planId) {
      return NextResponse.json({ error: "Falta el planId" }, { status: 400 });
    }

    const plan = await db.plan.findFirst({
      where: {
        OR: [{ id: planId }, { productId: planId }],
        isActive: true,
      },
      include: { product: true },
      orderBy: { createdAt: "asc" },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    const client = await db.client.findUnique({
      where: { clerkUserId: userId },
      include: { addresses: true },
    });

    const shippingAddress = client?.addresses.find((address) => address.type === "ENVIO");
    const missingFields: MissingField[] = [];

    if (!customerName && !client?.fullName) missingFields.push("nombre");
    if (!customerEmail && !client?.email) missingFields.push("correo");
    if (!client?.phone) missingFields.push("teléfono");
    if (!shippingAddress) missingFields.push("dirección de envío");

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: "Completa tu perfil antes de suscribirte.",
          missingFields,
          redirectTo: "/perfil?complete=1",
        },
        { status: 422 }
      );
    }

    let stripePriceId = plan.stripePriceId;

    if (!stripePriceId) {
      const stripeProduct = await stripe.products.create({
        name: plan.name,
        metadata: { planId: plan.id },
      });

      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(Number(plan.price) * 100),
        currency: "mxn",
        recurring: {
          interval: (plan.interval as "month" | "week" | "year") ?? "month",
          interval_count: plan.intervalCount ?? 1,
        },
        metadata: { planId: plan.id },
      });

      stripePriceId = stripePrice.id;

      await db.plan.update({
        where: { id: plan.id },
        data: { stripePriceId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: stripePriceId, quantity: 1 }],
      customer_email: customerEmail ?? undefined,
      success_url: `${process.env.NEXT_PUBLIC_URL}/thanks?session_id={CHECKOUT_SESSION_ID}&type=suscripcion`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/suscripciones`,
      metadata: { planId: plan.id, clerkUserId: userId },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear checkout";
    console.error("Error en Checkout Plan:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
