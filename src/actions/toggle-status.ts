"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function toggleStatus(formData: FormData) {
  const id = formData.get("id") as string;
  const model = formData.get("model") as "location" | "flavor" | "product";
  const currentStatus = formData.get("currentStatus") === "true"; // Viene como string

  const newStatus = !currentStatus; // Invertimos el valor

  try {
    if (model === "location") {
      // Validar que no sea la principal
      const location = await db.location.findUnique({ where: { id } });
      if (location?.isDefault) return; // No puedes archivar la bodega principal
      
      await db.location.update({ where: { id }, data: { isArchived: newStatus } });
    } 
    
    else if (model === "flavor") {
      await db.flavor.update({ where: { id }, data: { isArchived: newStatus } });
    } 
    
    else if (model === "product") {
      await db.product.update({ where: { id }, data: { isArchived: newStatus } });
    }

    revalidatePath("/admin");
    revalidatePath("/pos");
  } catch (error) {
    console.error("Error toggling status:", error);
  }
}