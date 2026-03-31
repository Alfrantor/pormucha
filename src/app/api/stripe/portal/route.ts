import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // 1. Recibimos el ID exacto del pack que el usuario quiere cancelar/gestionar
        const body = await req.json().catch(() => ({}));
        const { subscriptionId } = body;

        let subscription;

        // 2. Buscamos directamente esa suscripción por su ID
        if (subscriptionId) {
            subscription = await db.subscription.findUnique({
                where: { id: subscriptionId },
            });
        } else {
            // Plan B: Si por alguna razón no llega el ID, hacemos la búsqueda en 2 pasos (como en PerfilPage)
            const userEmail = user.emailAddresses[0].emailAddress;
            const cliente = await db.client.findUnique({
                where: { email: userEmail }
            });

            if (cliente) {
                subscription = await db.subscription.findFirst({
                    where: { clientId: cliente.id, status: "active" },
                });
            }
        }

        // 3. Validamos que exista y tenga un ID de cliente de Stripe
        if (!subscription || !subscription.stripeCustomerId) {
            return NextResponse.json({ error: "No se encontró cliente de Stripe vinculado a este pack" }, { status: 404 });
        }

        // 4. Creamos la sesión del portal de Stripe
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: subscription.stripeCustomerId,
            return_url: `${process.env.NEXT_PUBLIC_URL}/perfil`,
        });

        // 5. Devolvemos la URL siempre en formato JSON
        return NextResponse.json({ url: portalSession.url });

    } catch (error) {
        console.error("PORTAL_ERROR", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}