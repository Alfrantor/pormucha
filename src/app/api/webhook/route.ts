import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

// Inicializamos Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2023-10-16" as any,
});

export async function POST(req: Request) {
    // 1. Stripe manda el cuerpo de la petición como texto (raw), no como JSON
    const body = await req.text();
    // 2. Stripe manda una firma criptográfica para comprobar que son ellos
    const signature = (await headers()).get("stripe-signature") as string;

    let event: Stripe.Event;

    try {
        // 3. Verificamos que el mensaje sea auténtico usando tu SECRETO DEL WEBHOOK
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        console.error(`❌ Error de Webhook: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    // 4. SI EL PAGO FUE EXITOSO...
    if (event.type === "checkout.session.completed") {

        // --- INICIO BLOQUE PARA SUSCRIPCIONES ---
        if (session.mode === "subscription") {
            const planId = session.metadata?.planId;
            const clerkUserId = session.metadata?.clerkUserId;
            const customerEmail = session.customer_details?.email;
            const customerName = session.customer_details?.name;

            if (planId && (clerkUserId || customerEmail)) {
                let client;

                // Preferir vinculación por clerkUserId (más confiable)
                if (clerkUserId) {
                    client = await db.client.upsert({
                        where: { clerkUserId },
                        update: {
                            // Actualizar email si no lo tenía
                            ...(customerEmail ? { email: customerEmail } : {}),
                        },
                        create: {
                            clerkUserId,
                            email: customerEmail ?? `clerk_${clerkUserId}@pormucha.com`,
                            fullName: customerName || "Nuevo Miembro",
                        },
                    });
                } else {
                    // Fallback: buscar por email (flujo antiguo)
                    client = await db.client.upsert({
                        where: { email: customerEmail! },
                        update: {},
                        create: {
                            email: customerEmail!,
                            fullName: customerName || "Cliente Nuevo",
                        },
                    });
                }

                // Verificar que no exista ya esta suscripción (idempotencia)
                const existing = await db.subscription.findFirst({
                    where: { stripeSubscriptionId: session.subscription as string },
                });

                if (!existing) {
                    await db.subscription.create({
                        data: {
                            clientId: client.id,
                            planId,
                            stripeSubscriptionId: session.subscription as string,
                            stripeCustomerId: session.customer as string,
                            status: "active",
                            currentPeriodEnd: new Date(
                                Date.now() + 30 * 24 * 60 * 60 * 1000
                            ),
                        },
                    });
                }

                return new NextResponse(null, { status: 200 });
            }
        }
        // --- FIN BLOQUE PARA SUSCRIPCIONES ---


        // --- TU LÓGICA ORIGINAL PARA VENTAS ÚNICAS ---
        const orderId = session.metadata?.orderId;

        if (orderId) {
            // Buscamos la orden para ver si ya fue procesada (Idempotencia)
            const existingOrder = await db.order.findUnique({
                where: { id: orderId }
            });

            if (existingOrder?.status === "PAID") {
                return new NextResponse(null, { status: 200 });
            }

            // 1. Buscamos la ubicación predeterminada (Bodega Campeche)
            const defaultLocation = await db.location.findFirst({
                where: { isDefault: true, isArchived: false }
            });

            if (!defaultLocation) {
                console.error("❌ Error Crítico: No hay una bodega marcada como Default para ventas online.");
                return new NextResponse("Configuración de bodega faltante", { status: 500 });
            }

            // 2. Actualizamos la orden a PAGADA
            const order = await db.order.update({
                where: { id: orderId },
                data: {
                    status: "PAID",
                    paymentId: session.payment_intent as string,
                },
                include: {
                    orderItems: { include: { flavor: true } }
                }
            });

            // 3. 📦 PROCESAR CADA ITEM
            for (const item of order.orderItems) {
                if (item.flavorId && item.quantity > 0) {
                    await db.stock.upsert({
                        where: {
                            flavorId_locationId: {
                                flavorId: item.flavorId,
                                locationId: defaultLocation.id,
                            }
                        },
                        update: {
                            quantity: { decrement: item.quantity }
                        },
                        create: {
                            flavorId: item.flavorId,
                            locationId: defaultLocation.id,
                            quantity: -item.quantity
                        }
                    });

                    await db.inventoryMovement.create({
                        data: {
                            flavorId: item.flavorId,
                            locationId: defaultLocation.id,
                            type: "OUT",
                            quantity: item.quantity,
                            reason: `Venta Online #${orderId.substring(0, 8)}`,
                            userId: "stripe-webhook",
                        }
                    });
                }
            }
        }
    }

    // Le respondemos a Stripe con un 200 OK
    return new NextResponse(null, { status: 200 });
}