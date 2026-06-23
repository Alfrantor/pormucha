"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;
  if (role !== "admin" && role !== "vendedor") throw new Error("No autorizado");
  return role;
}

export async function createRawMaterial(data: {
  name: string;
  unit: string;
  category?: string;
  description?: string;
  minStock?: number;
  cost?: number;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    await requireAdmin();
    const mat = await (db as any).rawMaterial.create({
      data: {
        name: data.name,
        unit: data.unit,
        category: data.category || null,
        description: data.description || null,
        minStock: data.minStock ?? 0,
        cost: data.cost ?? null,
      },
    });
    revalidatePath("/admin");
    return { success: true, id: mat.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateRawMaterial(
  id: string,
  data: { name?: string; unit?: string; category?: string; description?: string; minStock?: number; cost?: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await (db as any).rawMaterial.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.category !== undefined && { category: data.category || null }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.minStock !== undefined && { minStock: data.minStock }),
        ...(data.cost !== undefined && { cost: data.cost ?? null }),
      },
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function archiveRawMaterial(id: string, archive: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await (db as any).rawMaterial.update({ where: { id }, data: { isArchived: archive } });
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function registerRawMaterialMovement(data: {
  rawMaterialId: string;
  locationId: string;
  type: "IN" | "OUT";
  quantity: number;
  reason: string;
}): Promise<{ success: boolean; newQuantity?: number; error?: string }> {
  try {
    await requireAdmin();
    const result = await db.$transaction(async (tx) => {
      // Upsert del stock en esa ubicación
      const existing = await (tx as any).rawMaterialStock.findUnique({
        where: { rawMaterialId_locationId: { rawMaterialId: data.rawMaterialId, locationId: data.locationId } },
      });
      const current = Number(existing?.quantity ?? 0);
      const delta = data.type === "IN" ? data.quantity : -data.quantity;
      const newQty = current + delta;
      if (newQty < 0) throw new Error("Stock insuficiente para realizar la salida");

      await (tx as any).rawMaterialStock.upsert({
        where: { rawMaterialId_locationId: { rawMaterialId: data.rawMaterialId, locationId: data.locationId } },
        create: { rawMaterialId: data.rawMaterialId, locationId: data.locationId, quantity: newQty },
        update: { quantity: newQty },
      });

      const { sessionClaims } = await auth();
      const userId = (sessionClaims?.sub as string) || null;

      await (tx as any).rawMaterialMovement.create({
        data: {
          rawMaterialId: data.rawMaterialId,
          locationId: data.locationId,
          type: data.type,
          quantity: data.quantity,
          reason: data.reason,
          userId,
        },
      });

      return newQty;
    });
    revalidatePath("/admin");
    return { success: true, newQuantity: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
