import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
    try {
        const { planId } = await req.json();

        if (!planId) {
            return NextResponse.json({ error: "Falta el planId" }, { status: 400 });
        }

        // 1. Buscamos el plan
        const plan = await db.plan.findUnique({ where: { id: planId } });

        if (!plan) {
            return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
        }

        // 2. Si el plan no tiene stripePriceId, lo creamos automáticamente en Stripe
        let stripePriceId = plan.stripePriceId;

        if (!stripePriceId) {
            // Crear producto en Stripe
            const stripeProduct = await stripe.products.create({
                name: plan.name,
                metadata: { planId: plan.id },
            });

            // Crear precio recurrente en Stripe (precio en centavos)
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

            // Guardar el stripePriceId en la BD para no recrearlo cada vez
            await db.plan.update({
                where: { id: plan.id },
                data: { stripePriceId },
            });
        }

        // 3. Crear sesión de checkout de Stripe
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{ price: stripePriceId, quantity: 1 }],
            success_url: `${process.env.NEXT_PUBLIC_URL}/thanks?session_id={CHECKOUT_SESSION_ID}&type=suscripcion`,
            cancel_url: `${process.env.NEXT_PUBLIC_URL}/suscripciones`,
            metadata: { planId: plan.id },
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error("❌ Error en Checkout Plan:", error.message);
        return NextResponse.json({ error: error.message || "Error al crear checkout" }, { status: 500 });
    }
}