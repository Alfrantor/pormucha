"use server";

import { db } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function updateClientAddress(formData: any) {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) throw new Error("No autorizado");

    // Obtenemos el email del usuario logueado en Clerk
    const userEmail = user.emailAddresses[0].emailAddress;

    // Usamos UPSERT pero buscando directamente por el ID de Clerk (infalible)
    await db.client.upsert({
        where: { clerkUserId: userId }, // <-- CAMBIO CLAVE: Búsqueda perfecta
        update: {
            // Actualizamos el email por si el usuario lo cambió en Clerk
            email: userEmail,
            phone: formData.phone,
            street: formData.street,
            number: formData.number,
            zipCode: formData.zipCode,
            city: formData.city,
            state: formData.state,
            neighborhood: formData.neighborhood,
            reference: formData.reference,
        },
        create: {
            clerkUserId: userId,
            email: userEmail,
            fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            phone: formData.phone,
            street: formData.street,
            number: formData.number,
            zipCode: formData.zipCode,
            city: formData.city,
            state: formData.state,
            neighborhood: formData.neighborhood,
            reference: formData.reference,
        },
    });

    revalidatePath("/perfil");
}