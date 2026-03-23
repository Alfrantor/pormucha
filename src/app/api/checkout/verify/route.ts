import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2023-10-16" as any,
});

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
        return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // --- 1. DETERMINAR SI ESTÁ PAGADO (Soporta ambos modos) ---
        // 'paid' para pagos únicos y 'complete' para suscripciones
        const isPaid = session.payment_status === "paid" || session.status === "complete";

        if (isPaid) {
            const orderId = session.metadata?.orderId;
            const planId = session.metadata?.planId;

            // --- CASO A: VENTA ÚNICA (Tu lógica original de Order) ---
            if (orderId) {
                const order = await db.order.findUnique({
                    where: { id: orderId }
                });

                if (order && order.status === "PENDING") {
                    await db.order.update({
                        where: { id: orderId },
                        data: {
                            status: "PAID",
                            paymentId: session.payment_intent as string
                        }
                    });
                }
                return NextResponse.json({
                    status: "paid",
                    orderId,
                    customerEmail: session.customer_details?.email
                });
            }

            // --- CASO B: SUSCRIPCIÓN ---
            if (planId) {
                // Aquí no necesitamos actualizar la DB porque el Webhook es quien manda,
                // pero confirmamos que el estado es exitoso para la UI de ThanksPage.
                return NextResponse.json({
                    status: "paid",
                    planId,
                    customerEmail: session.customer_details?.email
                });
            }
        }

        // Si no está pagado o no cumple condiciones
        return NextResponse.json({
            status: isPaid ? "paid" : "pending",
            customerEmail: session.customer_details?.email
        });

    } catch (error: any) {
        console.error("Error verifying session:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}