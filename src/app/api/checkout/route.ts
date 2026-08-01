import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16" as any,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      items,
      shippingCost,
      customerAddress,
      shippingRateId,
      shippingProvider,
    } = body;

    if (!shippingRateId) {
      return NextResponse.json(
        { error: "Debes seleccionar una paquetería antes de pagar." },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });
    }

    if (!customerAddress) {
      return NextResponse.json({ error: "Faltan datos de envío" }, { status: 400 });
    }

    const subtotal = items.reduce(
      (sum: number, item: any) => sum + Number(item.price) * (item.quantity || 1),
      0
    );
    const total = subtotal + Number(shippingCost || 0);

    const order = await db.order.create({
      data: {
        channel: "WEB",
        status: "PENDING",
        total,
        subtotal,
        fullName: customerAddress.name || "Sin nombre",
        email: customerAddress.email || "sin@correo.com",
        phone: String(customerAddress.phone || ""),
        street: customerAddress.street || "",
        number: String(customerAddress.number || ""),
        zipCode: String(customerAddress.zip || ""),
        city: customerAddress.city || "Ciudad",
        state: customerAddress.state || "Estado",
        neighborhood: customerAddress.neighborhood || "",
        reference: customerAddress.reference || "",
        shippingCost: Number(shippingCost || 0),
        shippingRateId,
        shippingProvider,
        paymentMethod: "STRIPE",
        orderItems: {
          create: items.map((item: any) => ({
            productId: item.id || null,
            productName: item.name || "Pack Pormucha",
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.price),
            subtotal: Number(item.price) * (Number(item.quantity) || 1),
            composition: {
              create: (item.composition || []).map((comp: any) => ({
                flavorId: comp.flavorId,
                quantity: Number(comp.quantity),
              })),
            },
          })),
        },
      },
    });

    const line_items = items.map((item: any) => ({
      price_data: {
        currency: "mxn",
        product_data: {
          name: item.name || item.title || "Producto Pormucha",
        },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity || 1,
    }));

    if (Number(shippingCost) > 0) {
      line_items.push({
        price_data: {
          currency: "mxn",
          product_data: {
            name: shippingProvider ? `Costo de envío (${shippingProvider})` : "Costo de envío",
          },
          unit_amount: Math.round(Number(shippingCost) * 100),
        },
        quantity: 1,
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      customer_email: customerAddress.email,
      success_url: `${baseUrl}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout`,
      metadata: {
        orderId: order.id,
      },
    });

    await db.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Error en Stripe Checkout:", error);
    return NextResponse.json(
      {
        error: "Error al crear el pago",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
