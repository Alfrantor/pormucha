import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { ensureSubscriptionScheduleSchema } from "@/lib/subscriptions";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await ensureSubscriptionScheduleSchema();

    const body = await req.json().catch(() => ({}));
    const { subscriptionId } = body;
    const userEmail = user.emailAddresses[0].emailAddress;

    const client = await db.client.findFirst({
      where: {
        OR: [{ clerkUserId: user.id }, { email: userEmail }],
      },
    });

    if (!client) {
      return NextResponse.json({ error: "No encontramos tu perfil de cliente" }, { status: 404 });
    }

    let subscription = null;

    if (subscriptionId) {
      subscription = await db.subscription.findFirst({
        where: {
          id: subscriptionId,
          clientId: client.id,
        },
      });
    } else {
      subscription = await db.subscription.findFirst({
        where: {
          clientId: client.id,
          status: "active",
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!subscription || !subscription.stripeCustomerId) {
      return NextResponse.json({ error: "No se encontró una suscripción activa vinculada a tu cuenta" }, { status: 404 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_URL}/perfil`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("PORTAL_ERROR", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
