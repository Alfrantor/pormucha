import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from "@/lib/db";

export async function POST(req: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
        throw new Error('Por favor agrega CLERK_WEBHOOK_SECRET en tu .env');
    }

    // 1. Obtener los headers de Svix para validación
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Error: No se encontraron headers de svix', { status: 400 });
    }

    // 2. Obtener el cuerpo de la petición
    const payload = await req.json();
    const body = JSON.stringify(payload);

    // 3. Verificar la firma
    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: WebhookEvent;

    try {
        evt = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }) as WebhookEvent;
    } catch (err) {
        console.error('Error verificando webhook:', err);
        return new Response('Error verificando firma', { status: 400 });
    }

    // 4. LÓGICA DE VINCULACIÓN
    const eventType = evt.type;

    if (eventType === 'user.created') {
        const { id, email_addresses, first_name, last_name } = evt.data;
        const email = email_addresses[0].email_address;
        const fullName = `${first_name || ''} ${last_name || ''}`.trim();

        try {
            // Buscamos si ya existe el cliente (por la compra en Stripe) y actualizamos su clerkUserId
            await db.client.upsert({
                where: { email: email },
                update: {
                    clerkUserId: id,
                    fullName: fullName || undefined
                },
                create: {
                    email: email,
                    clerkUserId: id,
                    fullName: fullName || "Nuevo Usuario",
                }
            });
            console.log(`✅ Cliente ${email} vinculado/creado con Clerk ID: ${id}`);
        } catch (error) {
            console.error("❌ Error en DB Webhook Clerk:", error);
            return new Response('Error de DB', { status: 500 });
        }
    }

    return new Response('Webhook procesado', { status: 200 });
}