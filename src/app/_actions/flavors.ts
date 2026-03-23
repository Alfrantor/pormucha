"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function saveSelectedFlavors(subscriptionId: string, flavors: Record<string, number>, totalSelected: number, unitCount: number) {
    const { userId } = await auth();
    if (!userId) throw new Error("No autorizado");

    // Validación de seguridad: el total debe coincidir con el pack contratado
    if (totalSelected !== unitCount) {
        throw new Error(`Debes seleccionar exactamente ${unitCount} bebidas.`);
    }

    await db.subscription.update({
        where: { id: subscriptionId },
        data: {
            selectedFlavors: flavors
        }
    });

    revalidatePath("/perfil");
    return { success: true };
}