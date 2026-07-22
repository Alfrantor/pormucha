import { NextResponse } from "next/server";
import Stripe from "stripe";
import { processPaidSubscriptionSession, processPaidWebOrder } from "@/lib/commerce-processing";

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

        if (isPaid && session.mode === "subscription") {
            await processPaidSubscriptionSession(session);
            return NextResponse.json({ status: "paid", type: "subscription" });
        }

        if (isPaid && session.metadata?.orderId) {
            const orderId = session.metadata.orderId;
            await processPaidWebOrder(orderId, session.payment_intent as string | null);

            return NextResponse.json({ status: "paid", orderId });
        }

        return NextResponse.json({ status: "pending" });

    } catch (error: any) {
        console.error("Error verifying session:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
