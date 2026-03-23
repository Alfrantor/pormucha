import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
    try {
        const user = await currentUser();
        if (!user) return new NextResponse("No autorizado", { status: 401 });

        const userEmail = user.emailAddresses[0].emailAddress;

        // Buscamos la suscripción del cliente para obtener su ID de Stripe
        const subscription = await db.subscription.findFirst({
            where: { client: { email: userEmail } },
        });

        if (!subscription || !subscription.stripeCustomerId) {
            return new NextResponse("No se encontró cliente de Stripe", { status: 404 });
        }

        // Creamos la sesión del portal de Stripe
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: subscription.stripeCustomerId,
            return_url: `${process.env.NEXT_PUBLIC_URL}/perfil`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error) {
        console.error("PORTAL_ERROR", error);
        return new NextResponse("Error interno", { status: 500 });
    }
}