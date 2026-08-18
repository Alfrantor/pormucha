"use server";

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function ensureGasificationColumns() {
  await db.$executeRawUnsafe(`
    ALTER TABLE "GasificationBatch"
    ADD COLUMN IF NOT EXISTS "finalBeverageBlendId" TEXT
  `).catch(() => null);

  await db.$executeRawUnsafe(`
    ALTER TABLE "GasificationBatch"
    ADD COLUMN IF NOT EXISTS "bottlesUsed" INTEGER
  `).catch(() => null);
}

export async function createGasificationBatch(data: {
  name: string;
  flavorId?: string;
  tankId?: string;
  locationId?: string;
  finalBeverageBlendId?: string;
  startedAt: string;
  litersProcessed?: number;
  bottlesUsed?: number;
  pressurePsi?: number;
  carbonationVol?: number;
  notes?: string;
  createdBy?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!data.name?.trim()) return { success: false, error: "El nombre es requerido" };
    if (!data.startedAt) return { success: false, error: "La fecha de inicio es requerida" };
    await ensureGasificationColumns();

    const id = randomUUID();
    await db.$executeRaw`
      INSERT INTO "GasificationBatch"
      ("id","name","flavorId","tankId","locationId","finalBeverageBlendId","status","startedAt","completedAt","litersProcessed","bottlesUsed","pressurePsi","carbonationVol","notes","createdBy","createdAt","updatedAt")
      VALUES
      (${id}, ${data.name.trim()}, ${data.flavorId || null}, ${data.tankId || null}, ${data.locationId || null}, ${data.finalBeverageBlendId || null}, 'IN_PROGRESS', ${new Date(data.startedAt)}, NULL, ${data.litersProcessed ?? null}, ${data.bottlesUsed ?? null}, ${data.pressurePsi ?? null}, ${data.carbonationVol ?? null}, ${data.notes?.trim() || null}, ${data.createdBy || null}, NOW(), NOW())
    `;

    revalidatePath("/admin/production");
    return { success: true, id };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al crear el gasificado" };
  }
}

export async function completeGasificationBatch(
  batchId: string,
  data?: { litersProcessed?: number; bottlesUsed?: number; pressurePsi?: number; carbonationVol?: number; notes?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureGasificationColumns();
    await db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{
        id: string;
        name: string;
        status: string;
        flavorId: string | null;
        locationId: string | null;
        finalBeverageBlendId: string | null;
        litersProcessed: number | string | null;
        bottlesUsed: number | null;
      }[]>`
        SELECT "id","name","status","flavorId","locationId","finalBeverageBlendId","litersProcessed","bottlesUsed"
        FROM "GasificationBatch"
        WHERE "id" = ${batchId}
        LIMIT 1
      `;

      const batch = rows[0];
      if (!batch) throw new Error("El proceso de gasificado no existe");
      if (batch.status === "COMPLETED") return;
      if (!batch.finalBeverageBlendId) throw new Error("El gasificado necesita una bebida final origen");
      if (!batch.flavorId) throw new Error("El gasificado necesita un sabor");
      if (!batch.locationId) throw new Error("El gasificado necesita una ubicación");

      const litersProcessed = Number(data?.litersProcessed ?? batch.litersProcessed ?? 0);
      const bottlesUsed = Number(data?.bottlesUsed ?? batch.bottlesUsed ?? 0);

      if (!(litersProcessed > 0)) {
        throw new Error("Indica cuántos litros se procesaron en gasificado");
      }
      if (!(bottlesUsed > 0)) {
        throw new Error("Indica cuántas botellas etiquetadas se usarán");
      }

      const blendRows = await tx.$queryRaw<{
        id: string;
        status: string;
        totalLiters: number | string;
      }[]>`
        SELECT "id","status","totalLiters"
        FROM "FinalBeverageBlend"
        WHERE "id" = ${batch.finalBeverageBlendId}
        LIMIT 1
      `;

      const blend = blendRows[0];
      if (!blend) throw new Error("La bebida final origen ya no existe");
      if (String(blend.status) !== "ACTIVE") throw new Error("La bebida final origen no está activa");

      const availableLiters = Number(blend.totalLiters || 0);
      if (litersProcessed > availableLiters) {
        throw new Error(`La bebida final seleccionada solo tiene ${availableLiters} Lt disponibles`);
      }
      const remainingBlendLiters = Math.max(availableLiters - litersProcessed, 0);

      const stock = await tx.stock.findUnique({
        where: {
          flavorId_locationId: {
            flavorId: batch.flavorId,
            locationId: batch.locationId,
          },
        },
      });

      const labeledBottlesAvailable = Number(stock?.quantity || 0);
      if (labeledBottlesAvailable < bottlesUsed) {
        throw new Error(`No hay suficientes botellas etiquetadas. Disponibles: ${labeledBottlesAvailable}`);
      }

      await tx.$executeRaw`
        UPDATE "GasificationBatch"
        SET "status" = 'COMPLETED',
            "completedAt" = NOW(),
            "litersProcessed" = ${litersProcessed},
            "bottlesUsed" = ${bottlesUsed},
            "pressurePsi" = COALESCE(${data?.pressurePsi ?? null}, "pressurePsi"),
            "carbonationVol" = COALESCE(${data?.carbonationVol ?? null}, "carbonationVol"),
            "notes" = COALESCE(${data?.notes ?? null}, "notes"),
            "updatedAt" = NOW()
        WHERE "id" = ${batchId}
      `;

      await tx.stock.update({
        where: {
          flavorId_locationId: {
            flavorId: batch.flavorId,
            locationId: batch.locationId,
          },
        },
        data: {
          quantity: { decrement: bottlesUsed },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          flavorId: batch.flavorId,
          locationId: batch.locationId,
          type: "OUT",
          quantity: bottlesUsed,
          reason: `Salida por gasificado/envasado: ${batch.name}`,
          userId: null,
        },
      });

      await tx.$executeRaw`
        UPDATE "FinalBeverageBlend"
        SET "totalLiters" = ${remainingBlendLiters},
            "status" = ${remainingBlendLiters > 0 ? "ACTIVE" : "CONSUMED"},
            "updatedAt" = NOW()
        WHERE "id" = ${batch.finalBeverageBlendId}
      `;
    });

    revalidatePath("/admin/production");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/products");
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
