"use server";

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createGasificationBatch(data: {
  name: string;
  flavorId?: string;
  tankId?: string;
  locationId?: string;
  startedAt: string;
  litersProcessed?: number;
  pressurePsi?: number;
  carbonationVol?: number;
  notes?: string;
  createdBy?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!data.name?.trim()) return { success: false, error: "El nombre es requerido" };
    if (!data.startedAt) return { success: false, error: "La fecha de inicio es requerida" };

    const id = randomUUID();
    await db.$executeRaw`
      INSERT INTO "GasificationBatch"
      ("id","name","flavorId","tankId","locationId","status","startedAt","completedAt","litersProcessed","pressurePsi","carbonationVol","notes","createdBy","createdAt","updatedAt")
      VALUES
      (${id}, ${data.name.trim()}, ${data.flavorId || null}, ${data.tankId || null}, ${data.locationId || null}, 'IN_PROGRESS', ${new Date(data.startedAt)}, NULL, ${data.litersProcessed ?? null}, ${data.pressurePsi ?? null}, ${data.carbonationVol ?? null}, ${data.notes?.trim() || null}, ${data.createdBy || null}, NOW(), NOW())
    `;

    revalidatePath("/admin/production");
    return { success: true, id };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al crear el gasificado" };
  }
}

export async function completeGasificationBatch(
  batchId: string,
  data?: { litersProcessed?: number; pressurePsi?: number; carbonationVol?: number; notes?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.$executeRaw`
      UPDATE "GasificationBatch"
      SET "status" = 'COMPLETED',
          "completedAt" = NOW(),
          "litersProcessed" = COALESCE(${data?.litersProcessed ?? null}, "litersProcessed"),
          "pressurePsi" = COALESCE(${data?.pressurePsi ?? null}, "pressurePsi"),
          "carbonationVol" = COALESCE(${data?.carbonationVol ?? null}, "carbonationVol"),
          "notes" = COALESCE(${data?.notes ?? null}, "notes"),
          "updatedAt" = NOW()
      WHERE "id" = ${batchId}
    `;

    revalidatePath("/admin/production");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al completar el gasificado" };
  }
}

export async function cancelGasificationBatch(
  batchId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.$executeRaw`
      UPDATE "GasificationBatch"
      SET "status" = 'CANCELLED',
          "notes" = COALESCE(${notes ?? null}, "notes"),
          "updatedAt" = NOW()
      WHERE "id" = ${batchId}
    `;

    revalidatePath("/admin/production");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al cancelar el gasificado" };
  }
}

export async function createLabelingBatch(data: {
  name: string;
  flavorId?: string;
  locationId?: string;
  startedAt: string;
  unitsReceived?: number;
  unitsLabeled?: number;
  labelsUsed?: number;
  notes?: string;
  createdBy?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!data.name?.trim()) return { success: false, error: "El nombre es requerido" };
    if (!data.startedAt) return { success: false, error: "La fecha de inicio es requerida" };

    const id = randomUUID();
    await db.$executeRaw`
      INSERT INTO "LabelingBatch"
      ("id","name","flavorId","locationId","status","startedAt","completedAt","unitsReceived","unitsLabeled","labelsUsed","notes","createdBy","createdAt","updatedAt")
      VALUES
      (${id}, ${data.name.trim()}, ${data.flavorId || null}, ${data.locationId || null}, 'IN_PROGRESS', ${new Date(data.startedAt)}, NULL, ${data.unitsReceived ?? null}, ${data.unitsLabeled ?? null}, ${data.labelsUsed ?? null}, ${data.notes?.trim() || null}, ${data.createdBy || null}, NOW(), NOW())
    `;

    revalidatePath("/admin/production");
    return { success: true, id };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al crear el etiquetado" };
  }
}

export async function completeLabelingBatch(
  batchId: string,
  data?: { unitsReceived?: number; unitsLabeled?: number; labelsUsed?: number; notes?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.$transaction(async (tx) => {
      const batch = await tx.labelingBatch.findUnique({
        where: { id: batchId },
        include: {
          flavor: true,
          location: true,
        },
      });

      if (!batch) {
        throw new Error("El proceso de etiquetado no existe");
      }

      if (batch.status === "COMPLETED") {
        return;
      }

      const unitsLabeled = data?.unitsLabeled ?? batch.unitsLabeled ?? 0;
      const unitsReceived = data?.unitsReceived ?? batch.unitsReceived ?? null;
      const labelsUsed = data?.labelsUsed ?? batch.labelsUsed ?? null;
      const notes = data?.notes ?? batch.notes ?? null;

      if (!batch.flavorId) {
        throw new Error("El etiquetado necesita un sabor para entrar al inventario");
      }

      if (!batch.locationId) {
        throw new Error("El etiquetado necesita una ubicacion para entrar al inventario");
      }

      if (!unitsLabeled || unitsLabeled <= 0) {
        throw new Error("Indica cuantas botellas etiquetadas se produjeron antes de completar el proceso");
      }

      await tx.labelingBatch.update({
        where: { id: batchId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          unitsReceived,
          unitsLabeled,
          labelsUsed,
          notes,
        },
      });

      await tx.stock.upsert({
        where: {
          flavorId_locationId: {
            flavorId: batch.flavorId,
            locationId: batch.locationId,
          },
        },
        create: {
          flavorId: batch.flavorId,
          locationId: batch.locationId,
          quantity: unitsLabeled,
        },
        update: {
          quantity: { increment: unitsLabeled },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          flavorId: batch.flavorId,
          locationId: batch.locationId,
          type: "IN",
          quantity: unitsLabeled,
          reason: `Entrada por etiquetado: ${batch.name}`,
          userId: batch.createdBy || null,
        },
      });
    });

    revalidatePath("/admin/production");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/products");
    revalidatePath("/pos");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al completar el etiquetado" };
  }
}

export async function cancelLabelingBatch(
  batchId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.$executeRaw`
      UPDATE "LabelingBatch"
      SET "status" = 'CANCELLED',
          "notes" = COALESCE(${notes ?? null}, "notes"),
          "updatedAt" = NOW()
      WHERE "id" = ${batchId}
    `;

    revalidatePath("/admin/production");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al cancelar el etiquetado" };
  }
}
