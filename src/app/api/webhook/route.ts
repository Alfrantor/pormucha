import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  processPaidSubscriptionInvoice,
  processPaidSubscriptionSession,
  processPaidWebOrder,
  syncStripeSubscriptionState,
} from "@/lib/commerce-processing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16" as any,
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    console.error(`Error de webhook Stripe: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.mode === "subscription") {
      await processPaidSubscriptionSession(session);
      return new NextResponse(null, { status: 200 });
    }

    const orderId = session.metadata?.orderId;
    if (orderId) {
      await processPaidWebOrder(orderId, session.payment_intent as string | null);
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    await processPaidSubscriptionInvoice(invoice);
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    await syncStripeSubscriptionState(subscription);
  }

  return new NextResponse(null, { status: 200 });
}
