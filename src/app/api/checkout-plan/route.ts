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

        // Blindaje: Si el plan no existe en DB o no tiene ID de Stripe
        if (!plan || !plan.stripePriceId) {
            console.error("❌ Plan no encontrado o no tiene stripePriceId vinculado:", plan);
            return NextResponse.json({ error: "El plan seleccionado no es válido para Stripe" }, { status: 404 });
        }

        // 2. Creamos la sesión
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{
                price: plan.stripePriceId,
                quantity: 1
            }],
            // Borramos la línea de customer_creation: "always"
            success_url: `${process.env.NEXT_PUBLIC_URL}/thanks?session_id={CHECKOUT_SESSION_ID}&type=suscripcion`,
            cancel_url: `${process.env.NEXT_PUBLIC_URL}/suscripciones`,
            metadata: {
                planId: plan.id,
            }
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        // Log detallado para que veas el error real en tu terminal
        console.error("❌ Error detallado en Checkout:", error.message);
        return NextResponse.json({ error: error.message || "Error al crear checkout" }, { status: 500 });
    }
}