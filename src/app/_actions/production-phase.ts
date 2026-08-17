"use server";

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function ensureProductionPhaseTable(client: typeof db) {
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ProductionPhaseRecord" (
      "id" TEXT NOT NULL,
      "productionId" TEXT NOT NULL,
      "phase" INTEGER NOT NULL,
      "receivedCondition" TEXT,
      "receivedBy" TEXT,
      "measuredBy" TEXT,
      "startedBy" TEXT,
      "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "ph" DECIMAL(65,30),
      "brix" DECIMAL(65,30),
      "temperature" DECIMAL(65,30),
      "acidity" DECIMAL(65,30),
      "notes" TEXT,
      "receivedLiters" DECIMAL(65,30),
      "remainingLiters" DECIMAL(65,30),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProductionPhaseRecord_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => null);

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ProductionPhaseRecord_productionId_idx"
    ON "ProductionPhaseRecord"("productionId")
  `).catch(() => null);

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ProductionPhaseRecord_productionId_phase_idx"
    ON "ProductionPhaseRecord"("productionId", "phase")
  `).catch(() => null);
}

export async function createProductionSecondPhase(data: {
  productionId: string;
  receivedCondition?: string;
  receivedLiters?: number;
  receivedBy?: string;
  measuredBy?: string;
  startedBy?: string;
  measuredAt?: string;
  ph?: number;
  brix?: number;
  temperature?: number;
  acidity?: number;
  notes?: string;
  additions?: Array<{
    rawMaterialId: string;
    quantity: number;
    locationId?: string;
    notes?: string;
  }>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.productionId) return { success: false, error: "Produccion requerida" };

    const validAdditions = (data.additions || []).filter((item) => item.rawMaterialId && item.quantity > 0);

    await db.$transaction(async (tx) => {
      await ensureProductionPhaseTable(tx as typeof db);

      const existingPhase = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "ProductionPhaseRecord"
        WHERE "productionId" = ${data.productionId}
          AND "phase" = 2
        LIMIT 1
      `;

      if (existingPhase.length > 0) {
        throw new Error("La fase dos ya fue iniciada para esta produccion");
      }

      await tx.$executeRaw`
        INSERT INTO "ProductionPhaseRecord"
        ("id","productionId","phase","receivedCondition","receivedBy","measuredBy","startedBy","measuredAt","ph","brix","temperature","acidity","notes","createdAt","receivedLiters")
        VALUES
        (${randomUUID()}, ${data.productionId}, 2, ${data.receivedCondition || null}, ${data.receivedBy || null}, ${data.measuredBy || null}, ${data.startedBy || null}, ${data.measuredAt ? new Date(data.measuredAt) : new Date()}, ${data.ph ?? null}, ${data.brix ?? null}, ${data.temperature ?? null}, ${data.acidity ?? null}, ${data.notes || null}, NOW(), ${data.receivedLiters ?? null})
      `;

      if (data.receivedLiters != null && !Number.isNaN(data.receivedLiters) && data.receivedLiters >= 0) {
        await tx.$executeRawUnsafe(`
          ALTER TABLE "Production"
          ADD COLUMN IF NOT EXISTS "inputLiters" DECIMAL(65,30)
        `).catch(() => null);

        await tx.$executeRaw`
          UPDATE "Production"
          SET "inputLiters" = ${data.receivedLiters}
          WHERE "id" = ${data.productionId}
        `;
      }

      for (const addition of validAdditions) {
        if (!addition.locationId) {
          throw new Error("Selecciona la ubicacion para cada insumo agregado en fase dos");
        }

        const stock = await tx.rawMaterialStock.findUnique({
          where: {
            rawMaterialId_locationId: {
              rawMaterialId: addition.rawMaterialId,
              locationId: addition.locationId,
            },
          },
        });

        const currentQty = Number(stock?.quantity ?? 0);
        if (currentQty < addition.quantity) {
          throw new Error("Stock insuficiente para uno de los insumos de fase dos");
        }

        await tx.productionAddition.create({
          data: {
            productionId: data.productionId,
            rawMaterialId: addition.rawMaterialId,
            quantity: addition.quantity,
            locationId: addition.locationId,
            notes: addition.notes?.trim() ? `Fase 2: ${addition.notes.trim()}` : "Fase 2",
            addedBy: data.startedBy || null,
          },
        });

        await tx.rawMaterialStock.upsert({
          where: {
            rawMaterialId_locationId: {
              rawMaterialId: addition.rawMaterialId,
              locationId: addition.locationId,
            },
          },
          update: {
            quantity: { decrement: addition.quantity },
          },
          create: {
            rawMaterialId: addition.rawMaterialId,
            locationId: addition.locationId,
            quantity: 0,
          },
        });

        await tx.rawMaterialMovement.create({
          data: {
            rawMaterialId: addition.rawMaterialId,
            locationId: addition.locationId,
            type: "OUT",
            quantity: addition.quantity,
            reason: "Adicion de insumo en fase 2",
            userId: data.startedBy || null,
          },
        });
      }
    });

    revalidatePath("/admin/production");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al iniciar la segunda fase" };
  }
}

export async function createProductionThirdPhase(data: {
  productionId: string;
  measuredAt?: string;
  remainingLiters?: number;
  notes?: string;
  startedBy?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.productionId) return { success: false, error: "Produccion requerida" };
    if (data.remainingLiters == null || Number.isNaN(data.remainingLiters) || data.remainingLiters < 0) {
      return { success: false, error: "Indica cuantos litros quedan en el contenedor" };
    }

    await ensureProductionPhaseTable(db);

    const phaseRows = await db.$queryRaw<{ phase: number }[]>`
      SELECT "phase"
      FROM "ProductionPhaseRecord"
      WHERE "productionId" = ${data.productionId}
    `;

    const hasPhase2 = phaseRows.some((row) => Number(row.phase) === 2);
    const hasPhase3 = phaseRows.some((row) => Number(row.phase) === 3);

    if (!hasPhase2) {
      return { success: false, error: "Primero debes iniciar la fase dos" };
    }

    if (hasPhase3) {
      return { success: false, error: "La fase tres ya fue registrada para esta produccion" };
    }

    await db.$executeRaw`
      INSERT INTO "ProductionPhaseRecord"
      ("id","productionId","phase","startedBy","measuredAt","remainingLiters","notes","createdAt")
      VALUES
      (${randomUUID()}, ${data.productionId}, 3, ${data.startedBy || null}, ${data.measuredAt ? new Date(data.measuredAt) : new Date()}, ${data.remainingLiters}, ${data.notes || null}, NOW())
    `;

    revalidatePath("/admin/production");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al iniciar la fase tres" };
  }
}
