import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import Stripe from "stripe";

// Inicializamos Stripe con la clave secreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16" as any,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, shippingCost, customerAddress } = body;

    // VALIDACIÓN 1: Carrito vacío
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });
    }

    // VALIDACIÓN 2: Dirección faltante
    if (!customerAddress) {
      return NextResponse.json({ error: "Faltan datos de envío" }, { status: 400 });
    }

    // 1. GUARDAR LA ORDEN EN LA BASE DE DATOS (NEON)
    // Se guarda como PENDING. Se actualizará a PAID cuando Stripe confirme el pago
    const order = await db.order.create({
      data: {
        userId: "invitado", // Después lo podemos atar al ID de Clerk
        status: "PENDING",
        total: items.reduce((sum: number, item: any) => sum + (Number(item.price) * (item.quantity || 1)), 0) + Number(shippingCost || 0),

        // Datos de envío del cliente (Mapeados a tu schema)
        fullName: customerAddress.name || "Sin nombre",
        email: customerAddress.email || "sin@correo.com",
        phone: String(customerAddress.phone || ""),
        street: customerAddress.street || "",
        zipCode: String(customerAddress.zip || ""),
        city: customerAddress.city || "Ciudad",
        state: customerAddress.state || "Estado",
        neighborhood: customerAddress.neighborhood || "",
        shippingCost: Number(shippingCost || 0),

        // Guardamos los items que compró
        orderItems: {
          create: items.map((item: any) => ({
            productId: item.id || "producto-desconocido",
            price: Number(item.price),
            flavorSelection: item.flavorSelection || {} // Aquí guardamos qué sabores eligieron en el pack
          }))
        }
      }
    });

    // 2. PREPARAR LOS PRODUCTOS PARA STRIPE
    const line_items = items.map((item: any) => ({
      price_data: {
        currency: "mxn",
        product_data: {
          name: item.name || item.title || "Producto Pormucha",
        },
        // STRIPE COBRA EN CENTAVOS: Multiplicamos por 100 y redondeamos
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity || 1,
    }));

    // 3. AÑADIR EL COSTO DE ENVÍO COMO UN "PRODUCTO" EXTRA
    if (Number(shippingCost) > 0) {
      line_items.push({
        price_data: {
          currency: "mxn",
          product_data: {
            name: "Costo de Envío (Skydropx)",
          },
          unit_amount: Math.round(Number(shippingCost) * 100),
        },
        quantity: 1,
      });
    }

    // 4. CREAR LA SESIÓN DE PAGO EN STRIPE
    // Usamos variables de entorno para la URL, con localhost como respaldo
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      customer_email: customerAddress.email, // Autocompleta el correo del cliente en la pantalla de pago
      success_url: `${baseUrl}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout`,
      metadata: {
        orderId: order.id, // VITAL: Le pasamos a Stripe el ID de Neon para que nos lo devuelva en el Webhook
      },
    });

    // 5. ACTUALIZAR LA ORDEN CON EL ID DE SESIÓN DE STRIPE
    await db.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id }
    });

    // 6. DEVOLVER LA URL AL FRONTEND PARA REDIRIGIR AL CLIENTE
    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error("Error en Stripe Checkout:", error);
    return NextResponse.json({
      error: "Error al crear el pago",
      details: error.message
    }, { status: 500 });
  }
}