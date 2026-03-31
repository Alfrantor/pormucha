"use server";
import { createClerkClient } from "@clerk/backend";
import { revalidatePath } from "next/cache";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function updateUserRole(userId: string, role: "admin" | "vendedor" | "cliente") {
    await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
            role: role,
        },
    });
    revalidatePath("/admin");
}