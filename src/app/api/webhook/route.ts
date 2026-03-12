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
        // Recuperamos el ID de la orden que guardamos antes en "metadata"
        const orderId = session.metadata?.orderId;

        if (orderId) {
            // MAGIA: Actualizamos la base de datos a PAGADO
            await db.order.update({
                where: { id: orderId },
                data: { status: "PAID" },
            });

            console.log(`✅ ¡Orden ${orderId} pagada y actualizada en Neon!`);

            // 👉 [AQUÍ CONECTAREMOS SKYDROPX Y RESEND EN EL SIGUIENTE PASO]
        }
    }

    // Le respondemos a Stripe con un 200 OK para que sepa que recibimos el mensaje
    return new NextResponse(null, { status: 200 });
}