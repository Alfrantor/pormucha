import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2023-10-16" as any,
});

// app/api/checkout/verify/route.ts
// ... (tus imports de stripe y db)

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const isPaid = session.payment_status === "paid" || session.status === "complete";

        if (isPaid && session.metadata?.orderId) {
            const orderId = session.metadata.orderId;

            // 1. Buscamos la orden con su desglose (Composition)
            const order = await db.order.findUnique({
                where: { id: orderId },
                include: {
                    orderItems: { include: { composition: true } }
                }
            });

            // 2. Solo procesamos si sigue PENDING (evita descontar doble si recargan la página)
            if (order && order.status === "PENDING") {

                // 3. Ubicación: Buscamos tu bodega principal en Campeche
                const defaultLocation = await db.location.findFirst({
                    where: { isDefault: true }
                });

                if (defaultLocation) {
                    // 4. RECORRER Y DESCONTAR
                    for (const item of order.orderItems) {
                        for (const comp of item.composition) {
                            // Cantidad total = (botellas en el pack) * (cuántos packs compró)
                            const totalToDecrement = comp.quantity * item.quantity;

                            // A) Restar del Stock
                            await db.stock.update({
                                where: {
                                    flavorId_locationId: {
                                        flavorId: comp.flavorId,
                                        locationId: defaultLocation.id
                                    }
                                },
                                data: { quantity: { decrement: totalToDecrement } }
                            });

                            // B) Crear movimiento en el Kardex para el historial
                            await db.inventoryMovement.create({
                                data: {
                                    flavorId: comp.flavorId,
                                    locationId: defaultLocation.id,
                                    type: "OUT",
                                    quantity: totalToDecrement,
                                    reason: `Venta Web - Orden #${order.id.slice(-6).toUpperCase()}`,
                                }
                            });
                        }
                    }
                }

                // 5. Finalmente, marcar la orden como PAGADA
                await db.order.update({
                    where: { id: orderId },
                    data: {
                        status: "PAID",
                        paymentId: session.payment_intent as string,
                        locationId: defaultLocation?.id // Guardamos qué bodega surtió
                    }
                });
            }

            return NextResponse.json({ status: "paid", orderId });
        }

        return NextResponse.json({ status: "pending" });

    } catch (error: any) {
        console.error("Error verifying session:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}