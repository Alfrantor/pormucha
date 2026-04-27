"use server";

import { db } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function updateClientAddress(formData: any) {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) throw new Error("No autorizado");

    const userEmail = user.emailAddresses[0].emailAddress;

    // Obtener o crear el cliente
    const client = await db.client.upsert({
        where: { clerkUserId: userId },
        update: {
            email: userEmail,
            phone: formData.phone,
        },
        create: {
            clerkUserId: userId,
            email: userEmail,
            fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            phone: formData.phone,
            type: "FISICA",
        },
    });

    // Crear o actualizar la dirección de envío (en tabla Address)
    if (formData.street || formData.city) {
        // Buscar si ya existe una dirección de envío
        const existingAddress = await db.address.findFirst({
            where: {
                clientId: client.id,
                type: "ENVIO",
            },
        });

        if (existingAddress) {
            // Actualizar la existente
            await db.address.update({
                where: { id: existingAddress.id },
                data: {
                    street: formData.street,
                    number: formData.number,
                    zipCode: formData.zipCode,
                    city: formData.city,
                    state: formData.state,
                    country: "MX",
                },
            });
        } else {
            // Crear nueva
            await db.address.create({
                data: {
                    clientId: client.id,
                    type: "ENVIO",
                    street: formData.street,
                    number: formData.number,
                    zipCode: formData.zipCode,
                    city: formData.city,
                    state: formData.state,
                    country: "MX",
                    reference: formData.reference,
                    isDefault: true,
                },
            });
        }
    }

    revalidatePath("/perfil");
}