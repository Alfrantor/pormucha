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

    // Usamos UPSERT: 
    // Si encuentra el correo, actualiza los datos e INCLUYE el clerkUserId.
    // Si no existiera el correo, crea un cliente nuevo.
    await db.client.upsert({
        where: { email: userEmail },
        update: {
            clerkUserId: userId, // <-- AQUÍ SE HACE LA VINCULACIÓN
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
            email: userEmail,
            clerkUserId: userId,
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