"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

type BlendItemInput = {
  rawMaterialId?: string | null;
  freeTextName?: string;
  sharePercent: number;
};

export async function saveProductionFormula(data: {
  code: string;
  name: string;
  teaType?: string;
  teaGramsPerLiter: number;
  sugarGramsPerLiter: number;
  yeastPitchRatePercent: number;
  brewWaterPercent: number;
  durationDays: number;
  phMin: number;
  phMax: number;
  brixTarget: number;
  ttaTarget: number;
  temperatureMin: number;
  temperatureMax: number;
  blendItems: BlendItemInput[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await currentUser().catch(() => null);
    const updatedByEmail = user?.emailAddresses?.[0]?.emailAddress || null;

    if (!data.code.trim()) return { success: false, error: "Código requerido" };
    if (!data.name.trim()) return { success: false, error: "Nombre requerido" };
    if (!Number.isFinite(data.teaGramsPerLiter) || data.teaGramsPerLiter <= 0) {
      return { success: false, error: "Indica cuántos gramos de té lleva por litro" };
    }
    if (!Number.isFinite(data.sugarGramsPerLiter) || data.sugarGramsPerLiter < 0) {
      return { success: false, error: "El azúcar por litro no es válida" };
    }
    if (!Number.isFinite(data.yeastPitchRatePercent) || data.yeastPitchRatePercent < 0) {
      return { success: false, error: "El porcentaje de cultivo inicial no es válido" };
    }
    if (!Number.isFinite(data.brewWaterPercent) || data.brewWaterPercent <= 0 || data.brewWaterPercent > 100) {
      return { success: false, error: "El porcentaje de agua de cocción debe estar entre 0 y 100" };
    }
    if (!Number.isFinite(data.durationDays) || data.durationDays <= 0) {
      return { success: false, error: "Los días de fermentación deben ser mayores a cero" };
    }
    if (!Number.isFinite(data.phMin) || !Number.isFinite(data.phMax)) {
      return { success: false, error: "Los objetivos de pH no son válidos" };
    }
    if (data.phMin > data.phMax) {
      return { success: false, error: "El pH mínimo no puede ser mayor que el máximo" };
    }
    if (!Number.isFinite(data.brixTarget) || data.brixTarget < 0) {
      return { success: false, error: "El objetivo de Brix no es válido" };
    }
    if (!Number.isFinite(data.ttaTarget) || data.ttaTarget < 0) {
      return { success: false, error: "El objetivo de TTA no es válido" };
    }
    if (!Number.isFinite(data.temperatureMin) || !Number.isFinite(data.temperatureMax)) {
      return { success: false, error: "Los objetivos de temperatura no son válidos" };
    }
    if (data.temperatureMin > data.temperatureMax) {
      return { success: false, error: "La temperatura mínima no puede ser mayor que la máxima" };
    }

    await db.$executeRawUnsafe(`
      ALTER TABLE "ProductionFormula"
      ADD COLUMN IF NOT EXISTS "targetLiters" DECIMAL(65,30)
    `).catch(() => null);
    await db.$executeRawUnsafe(`
      ALTER TABLE "ProductionFormula"
      ADD COLUMN IF NOT EXISTS "updatedByEmail" TEXT
    `).catch(() => null);
    await db.$executeRawUnsafe(`
      ALTER TABLE "ProductionFormula"
      ADD COLUMN IF NOT EXISTS "teaType" TEXT
    `).catch(() => null);
    await db.$executeRawUnsafe(`
      ALTER TABLE "ProductionFormula"
      ADD COLUMN IF NOT EXISTS "teaGramsPerLiter" DECIMAL(65,30)
    `).catch(() => null);
    await db.$executeRawUnsafe(`
      ALTER TABLE "ProductionFormula"
      ADD COLUMN IF NOT EXISTS "sugarGramsPerLiter" DECIMAL(65,30)
    `).catch(() => null);
    await db.$executeRawUnsafe(`
      ALTER TABLE "ProductionFormula"
      ADD COLUMN IF NOT EXISTS "yeastPitchRatePercent" DECIMAL(65,30)
    `).catch(() => null);
    await db.$executeRawUnsafe(`
      ALTER TABLE "ProductionFormula"
      ADD COLUMN IF NOT EXISTS "brewWaterPercent" DECIMAL(65,30)
    `).catch(() => null);
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ProductionFormulaStep" (
        "id" TEXT NOT NULL,
        "formulaId" TEXT NOT NULL,
        "stepNumber" INTEGER NOT NULL,
        "title" TEXT NOT NULL,
        "instructions" TEXT,
        "resultLiters" DECIMAL(65,30),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ProductionFormulaStep_pkey" PRIMARY KEY ("id")
      )
    `).catch(() => null);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ProductionFormulaStep_formulaId_idx"
      ON "ProductionFormulaStep"("formulaId")
    `).catch(() => null);
    await db.$executeRawUnsafe(`
      ALTER TABLE "ProductionFormulaItem"
      ADD COLUMN IF NOT EXISTS "stepId" TEXT
    `).catch(() => null);
    await db.$executeRawUnsafe(`
      ALTER TABLE "ProductionFormulaItem"
      ADD COLUMN IF NOT EXISTS "sourceKind" TEXT NOT NULL DEFAULT 'RAW_MATERIAL'
    `).catch(() => null);
    await db.$executeRawUnsafe(`
      ALTER TABLE "ProductionFormulaItem"
      ADD COLUMN IF NOT EXISTS "sourceProductionType" TEXT
    `).catch(() => null);
    await db.$executeRawUnsafe(`
      ALTER TABLE "ProductionFormulaItem"
      ALTER COLUMN "rawMaterialId" DROP NOT NULL
    `).catch(() => null);
    await db.$executeRawUnsafe(`
      ALTER TABLE "ProductionFormulaItem"
      ADD COLUMN IF NOT EXISTS "freeTextName" TEXT
    `).catch(() => null);
    await db.$executeRawUnsafe(`
      ALTER TABLE "ProductionFormulaItem"
      ADD COLUMN IF NOT EXISTS "sharePercent" DECIMAL(65,30)
    `).catch(() => null);

    const validBlendItems = data.blendItems
      .map((item) => ({
        rawMaterialId: item.rawMaterialId || null,
        freeTextName: item.freeTextName?.trim() || "",
        sharePercent: Number(item.sharePercent),
      }))
      .filter((item) => (item.rawMaterialId || item.freeTextName) && item.sharePercent > 0);

    const totalShare = validBlendItems.reduce((sum, item) => sum + item.sharePercent, 0);
    if (validBlendItems.length > 0 && Math.abs(totalShare - 100) > 0.01) {
      return { success: false, error: "La mezcla de té debe sumar 100%" };
    }

    await db.$transaction(async (tx) => {
      const existing = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "ProductionFormula"
        WHERE "code" = ${data.code}
        LIMIT 1
      `;

      const formulaId = existing[0]?.id || randomUUID();
      const formulaSummary = [
        data.teaType?.trim() ? `Té: ${data.teaType.trim()}` : null,
        `${data.teaGramsPerLiter} g/L de té`,
        `${data.sugarGramsPerLiter} g/L de azúcar`,
        `${data.yeastPitchRatePercent}% de cultivo inicial`,
        `${data.brewWaterPercent}% de agua de cocción`,
      ]
        .filter(Boolean)
        .join(" · ");

      await tx.$executeRaw`
        INSERT INTO "ProductionFormula"
        ("id","code","name","description","formulaSummary","targetLiters","teaType","teaGramsPerLiter","sugarGramsPerLiter","yeastPitchRatePercent","brewWaterPercent","durationDays","durationHours","phMin","phMax","brixMin","brixMax","temperatureMin","temperatureMax","acidityMin","acidityMax","isActive","updatedByEmail","createdAt","updatedAt")
        VALUES
        (${formulaId}, ${data.code}, ${data.name.trim()}, NULL, ${formulaSummary}, 1, ${data.teaType?.trim() || null}, ${data.teaGramsPerLiter}, ${data.sugarGramsPerLiter}, ${data.yeastPitchRatePercent}, ${data.brewWaterPercent}, ${data.durationDays}, 0, ${data.phMin}, ${data.phMax}, ${data.brixTarget}, ${data.brixTarget}, ${data.temperatureMin}, ${data.temperatureMax}, ${data.ttaTarget}, ${data.ttaTarget}, true, ${updatedByEmail}, NOW(), NOW())
        ON CONFLICT ("code")
        DO UPDATE SET
          "name" = EXCLUDED."name",
          "description" = EXCLUDED."description",
          "formulaSummary" = EXCLUDED."formulaSummary",
          "targetLiters" = EXCLUDED."targetLiters",
          "teaType" = EXCLUDED."teaType",
          "teaGramsPerLiter" = EXCLUDED."teaGramsPerLiter",
          "sugarGramsPerLiter" = EXCLUDED."sugarGramsPerLiter",
          "yeastPitchRatePercent" = EXCLUDED."yeastPitchRatePercent",
          "brewWaterPercent" = EXCLUDED."brewWaterPercent",
          "durationDays" = EXCLUDED."durationDays",
          "durationHours" = EXCLUDED."durationHours",
          "phMin" = EXCLUDED."phMin",
          "phMax" = EXCLUDED."phMax",
          "brixMin" = EXCLUDED."brixMin",
          "brixMax" = EXCLUDED."brixMax",
          "temperatureMin" = EXCLUDED."temperatureMin",
          "temperatureMax" = EXCLUDED."temperatureMax",
          "acidityMin" = EXCLUDED."acidityMin",
          "acidityMax" = EXCLUDED."acidityMax",
          "isActive" = EXCLUDED."isActive",
          "updatedByEmail" = EXCLUDED."updatedByEmail",
          "updatedAt" = NOW()
      `;

      await tx.$executeRaw`
        DELETE FROM "ProductionFormulaItem"
        WHERE "formulaId" = ${formulaId}
      `;
      await tx.$executeRaw`
        DELETE FROM "ProductionFormulaStep"
        WHERE "formulaId" = ${formulaId}
      `;

      const stepId = randomUUID();
      await tx.$executeRaw`
        INSERT INTO "ProductionFormulaStep"
        ("id","formulaId","stepNumber","title","instructions","resultLiters","createdAt","updatedAt")
        VALUES
        (${stepId}, ${formulaId}, 1, ${"Receta base por litro"}, ${"Los componentes del blend de té se guardan por litro y se escalan según el lote deseado."}, 1, NOW(), NOW())
      `;

      for (const item of validBlendItems) {
        const gramsPerLiter = (data.teaGramsPerLiter * item.sharePercent) / 100;
        await tx.$executeRaw`
          INSERT INTO "ProductionFormulaItem"
          ("id","formulaId","stepId","sourceKind","sourceProductionType","rawMaterialId","quantity","freeTextName","sharePercent","defaultLocationId","notes","createdAt","updatedAt")
          VALUES
          (${randomUUID()}, ${formulaId}, ${stepId}, ${"RAW_MATERIAL"}, NULL, ${item.rawMaterialId}, ${gramsPerLiter}, ${item.freeTextName || null}, ${item.sharePercent}, NULL, ${"TEA_BLEND"}, NOW(), NOW())
        `;
      }
    });

    revalidatePath("/admin/catalog/formulas");
    revalidatePath("/admin/catalog");
    revalidatePath("/admin/production");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo guardar la fórmula",
    };
  }
}
