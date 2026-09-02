"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

type BlendItemInput = {
  rawMaterialId?: string | null;
  freeTextName?: string;
  sourceKind?: "RAW_MATERIAL" | "FORMULA" | null;
  sourceProductionType?: "ACIDIFIER" | "SCOOBY" | "FLAVOR" | "BLEND" | null;
  sharePercent: number;
};

type FlavorIngredientInput = {
  rawMaterialId?: string | null;
  freeTextName?: string;
  amountPerLiter: number;
  unit?: string;
  detail?: string;
};

async function ensureProductionFormulaColumns() {
  const statements = [
    `ALTER TABLE "ProductionFormula" ADD COLUMN IF NOT EXISTS "recipeType" TEXT NOT NULL DEFAULT 'ACIDIFIER'`,
    `ALTER TABLE "ProductionFormula" ADD COLUMN IF NOT EXISTS "updatedByEmail" TEXT`,
    `ALTER TABLE "ProductionFormula" ADD COLUMN IF NOT EXISTS "teaType" TEXT`,
    `ALTER TABLE "ProductionFormula" ADD COLUMN IF NOT EXISTS "teaGramsPerLiter" DECIMAL(65,30)`,
    `ALTER TABLE "ProductionFormula" ADD COLUMN IF NOT EXISTS "sugarGramsPerLiter" DECIMAL(65,30)`,
    `ALTER TABLE "ProductionFormula" ADD COLUMN IF NOT EXISTS "yeastPitchRatePercent" DECIMAL(65,30)`,
    `ALTER TABLE "ProductionFormula" ADD COLUMN IF NOT EXISTS "brewWaterPercent" DECIMAL(65,30)`,
    `ALTER TABLE "ProductionFormula" ADD COLUMN IF NOT EXISTS "flavorJuicePercent" DECIMAL(65,30)`,
    `ALTER TABLE "ProductionFormula" ADD COLUMN IF NOT EXISTS "flavorItemName" TEXT`,
    `ALTER TABLE "ProductionFormula" ADD COLUMN IF NOT EXISTS "co2GramsPerLiter" DECIMAL(65,30)`,
    `ALTER TABLE "ProductionFormula" ADD COLUMN IF NOT EXISTS "carbonationMethod" TEXT`,
    `ALTER TABLE "ProductionFormula" ADD COLUMN IF NOT EXISTS "f2ConditionDays" INTEGER`,
    `CREATE TABLE IF NOT EXISTS "ProductionFormulaStep" (
      "id" TEXT NOT NULL,
      "formulaId" TEXT NOT NULL,
      "stepNumber" INTEGER NOT NULL,
      "title" TEXT NOT NULL,
      "instructions" TEXT,
      "resultLiters" DECIMAL(65,30),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProductionFormulaStep_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "ProductionFormulaStep_formulaId_idx" ON "ProductionFormulaStep"("formulaId")`,
    `ALTER TABLE "ProductionFormulaItem" ADD COLUMN IF NOT EXISTS "stepId" TEXT`,
    `ALTER TABLE "ProductionFormulaItem" ADD COLUMN IF NOT EXISTS "sourceKind" TEXT NOT NULL DEFAULT 'RAW_MATERIAL'`,
    `ALTER TABLE "ProductionFormulaItem" ADD COLUMN IF NOT EXISTS "sourceProductionType" TEXT`,
    `ALTER TABLE "ProductionFormulaItem" ALTER COLUMN "rawMaterialId" DROP NOT NULL`,
    `ALTER TABLE "ProductionFormulaItem" ADD COLUMN IF NOT EXISTS "freeTextName" TEXT`,
    `ALTER TABLE "ProductionFormulaItem" ADD COLUMN IF NOT EXISTS "sharePercent" DECIMAL(65,30)`,
    `ALTER TABLE "ProductionFormulaItem" ADD COLUMN IF NOT EXISTS "unitOverride" TEXT`,
  ];

  for (const statement of statements) {
    await db.$executeRawUnsafe(statement).catch(() => null);
  }
}

export async function saveProductionFormula(data: {
  code: string;
  recipeType: "ACIDIFIER" | "SCOOBY" | "FLAVOR" | "BLEND";
  name: string;
  teaType?: string;
  teaGramsPerLiter?: number;
  sugarGramsPerLiter?: number;
  yeastPitchRatePercent?: number;
  brewWaterPercent?: number;
  durationDays?: number;
  phMin?: number;
  phMax?: number;
  brixTarget?: number;
  ttaTarget?: number;
  temperatureMin?: number;
  temperatureMax?: number;
  blendItems?: BlendItemInput[];
  flavorJuicePercent?: number;
  flavorItemName?: string;
  co2GramsPerLiter?: number;
  carbonationMethod?: string;
  f2ConditionDays?: number;
  flavorIngredients?: FlavorIngredientInput[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await currentUser().catch(() => null);
    const updatedByEmail = user?.emailAddresses?.[0]?.emailAddress || null;

    if (!data.code.trim()) return { success: false, error: "Código requerido" };
    if (!data.name.trim()) return { success: false, error: "Nombre requerido" };

    const recipeType =
      data.recipeType === "FLAVOR"
        ? "FLAVOR"
        : data.recipeType === "SCOOBY"
          ? "SCOOBY"
          : data.recipeType === "BLEND"
            ? "BLEND"
            : "ACIDIFIER";

    let formulaSummary = "";
    let durationDays = 0;
    const teaType = data.teaType?.trim() || null;
    const teaGramsPerLiter = data.teaGramsPerLiter ?? null;
    const sugarGramsPerLiter = data.sugarGramsPerLiter ?? null;
    const yeastPitchRatePercent = data.yeastPitchRatePercent ?? null;
    const brewWaterPercent = data.brewWaterPercent ?? null;
    const flavorJuicePercent = data.flavorJuicePercent ?? null;
    const flavorItemName = data.flavorItemName?.trim() || null;
    const co2GramsPerLiter = data.co2GramsPerLiter ?? null;
    const carbonationMethod = data.carbonationMethod?.trim() || null;
    const f2ConditionDays = data.f2ConditionDays ?? null;
    let phMin = 0;
    let phMax = 0;
    let brixTarget = 0;
    let ttaTarget = 0;
    let temperatureMin = 0;
    let temperatureMax = 0;
    let itemRows: Array<{
      sourceKind: "RAW_MATERIAL" | "FORMULA";
      rawMaterialId: string | null;
      freeTextName: string | null;
      sourceProductionType: string | null;
      quantity: number;
      sharePercent: number | null;
      unitOverride: string | null;
      notes: string;
    }> = [];

    if (recipeType === "BLEND") {
      if (!Number.isFinite(data.brixTarget) || Number(data.brixTarget) < 0) {
        return { success: false, error: "El objetivo de Brix no es válido" };
      }

      const blendItems = (data.blendItems || [])
        .map((item) => ({
          sourceKind: item.sourceKind || "RAW_MATERIAL",
          rawMaterialId: item.rawMaterialId || null,
          freeTextName: item.freeTextName?.trim() || "",
          sourceProductionType: item.sourceProductionType || null,
          sharePercent: Number(item.sharePercent),
        }))
        .filter((item) => item.sourceProductionType || item.freeTextName || item.rawMaterialId)
        .filter((item) => item.sharePercent > 0);

      const totalShare = blendItems.reduce((sum, item) => sum + item.sharePercent, 0);
      if (blendItems.length > 0 && Math.abs(totalShare - 100) > 0.01) {
        return { success: false, error: "La mezcla del blend debe sumar 100%" };
      }

      brixTarget = Number(data.brixTarget);
      formulaSummary = [`Blend con Brix objetivo ${brixTarget}`].join(" · ");
      itemRows = blendItems.map((item) => ({
        sourceKind: item.sourceKind === "FORMULA" ? "FORMULA" : "RAW_MATERIAL",
        rawMaterialId: item.rawMaterialId,
        freeTextName: item.freeTextName || null,
        sourceProductionType: item.sourceKind === "FORMULA" ? item.sourceProductionType : null,
        quantity: item.sharePercent,
        sharePercent: item.sharePercent,
        unitOverride: "%",
        notes: "BLEND_COMPONENT",
      }));
    } else if (recipeType === "FLAVOR") {
      if (!Number.isFinite(data.co2GramsPerLiter) || Number(data.co2GramsPerLiter) < 0) {
        return { success: false, error: "El CO2 por litro no es válido" };
      }
      if (!Number.isFinite(data.f2ConditionDays) || Number(data.f2ConditionDays) < 0) {
        return { success: false, error: "Los días objetivo de F2 no son válidos" };
      }
      if (!Number.isFinite(data.phMin) || !Number.isFinite(data.phMax)) {
        return { success: false, error: "Los objetivos de pH no son válidos" };
      }
      if (Number(data.phMin) > Number(data.phMax)) {
        return { success: false, error: "El pH mínimo no puede ser mayor que el máximo" };
      }
      if (!Number.isFinite(data.brixTarget) || Number(data.brixTarget) < 0) {
        return { success: false, error: "El objetivo de Brix no es válido" };
      }
      if (!Number.isFinite(data.ttaTarget) || Number(data.ttaTarget) < 0) {
        return { success: false, error: "El objetivo de TTA no es válido" };
      }
      if (!Number.isFinite(data.temperatureMin) || !Number.isFinite(data.temperatureMax)) {
        return { success: false, error: "Los objetivos de temperatura no son válidos" };
      }
      if (Number(data.temperatureMin) > Number(data.temperatureMax)) {
        return { success: false, error: "La temperatura mínima no puede ser mayor que la máxima" };
      }
      const flavorIngredients = (data.flavorIngredients || [])
        .map((item) => ({
          rawMaterialId: item.rawMaterialId || null,
          freeTextName: item.freeTextName?.trim() || "",
          amountPerLiter: Number(item.amountPerLiter),
          unit: item.unit?.trim() || "",
          detail: item.detail?.trim() || "",
        }))
        .filter((item) => (item.rawMaterialId || item.freeTextName) && item.amountPerLiter > 0);
      durationDays = Number(data.f2ConditionDays || 0);
      phMin = Number(data.phMin);
      phMax = Number(data.phMax);
      brixTarget = Number(data.brixTarget);
      ttaTarget = Number(data.ttaTarget);
      temperatureMin = Number(data.temperatureMin);
      temperatureMax = Number(data.temperatureMax);
      formulaSummary = [
        flavorItemName ? `Base de sabor: ${flavorItemName}` : null,
        flavorJuicePercent != null ? `${Number(flavorJuicePercent)}% de fruta/jugo` : null,
        `${Number(data.co2GramsPerLiter || 0)} g/L de CO2`,
        carbonationMethod || null,
      ]
        .filter(Boolean)
        .join(" · ");

      itemRows = flavorIngredients.map((item) => ({
        sourceKind: "RAW_MATERIAL",
        rawMaterialId: item.rawMaterialId,
        freeTextName: item.freeTextName || null,
        sourceProductionType: null,
        quantity: item.amountPerLiter,
        sharePercent: null,
        unitOverride: item.unit || null,
        notes: item.detail ? `FLAVOR_INGREDIENT|${item.detail}` : "FLAVOR_INGREDIENT",
      }));
    } else {
      if (!Number.isFinite(data.teaGramsPerLiter) || Number(data.teaGramsPerLiter) <= 0) {
        return { success: false, error: "Indica cuántos gramos de té lleva por litro" };
      }
      if (!Number.isFinite(data.sugarGramsPerLiter) || Number(data.sugarGramsPerLiter) < 0) {
        return { success: false, error: "El azúcar por litro no es válida" };
      }
      if (!Number.isFinite(data.yeastPitchRatePercent) || Number(data.yeastPitchRatePercent) < 0) {
        return { success: false, error: "El porcentaje de cultivo inicial no es válido" };
      }
      if (!Number.isFinite(data.brewWaterPercent) || Number(data.brewWaterPercent) <= 0 || Number(data.brewWaterPercent) > 100) {
        return { success: false, error: "El porcentaje de agua de cocción debe estar entre 0 y 100" };
      }
      if (!Number.isFinite(data.durationDays) || Number(data.durationDays) <= 0) {
        return { success: false, error: "Los días de fermentación deben ser mayores a cero" };
      }
      if (!Number.isFinite(data.phMin) || !Number.isFinite(data.phMax)) {
        return { success: false, error: "Los objetivos de pH no son válidos" };
      }
      if (Number(data.phMin) > Number(data.phMax)) {
        return { success: false, error: "El pH mínimo no puede ser mayor que el máximo" };
      }
      if (!Number.isFinite(data.brixTarget) || Number(data.brixTarget) < 0) {
        return { success: false, error: "El objetivo de Brix no es válido" };
      }
      if (!Number.isFinite(data.ttaTarget) || Number(data.ttaTarget) < 0) {
        return { success: false, error: "El objetivo de TTA no es válido" };
      }
      if (!Number.isFinite(data.temperatureMin) || !Number.isFinite(data.temperatureMax)) {
        return { success: false, error: "Los objetivos de temperatura no son válidos" };
      }
      if (Number(data.temperatureMin) > Number(data.temperatureMax)) {
        return { success: false, error: "La temperatura mínima no puede ser mayor que la máxima" };
      }

      const blendItems = (data.blendItems || [])
        .map((item) => ({
          rawMaterialId: item.rawMaterialId || null,
          freeTextName: item.freeTextName?.trim() || "",
          sharePercent: Number(item.sharePercent),
        }))
        .filter((item) => (item.rawMaterialId || item.freeTextName) && item.sharePercent > 0);

      const totalShare = blendItems.reduce((sum, item) => sum + item.sharePercent, 0);
      if (blendItems.length > 0 && Math.abs(totalShare - 100) > 0.01) {
        return { success: false, error: "La mezcla de té debe sumar 100%" };
      }

      durationDays = Number(data.durationDays);
      phMin = Number(data.phMin);
      phMax = Number(data.phMax);
      brixTarget = Number(data.brixTarget);
      ttaTarget = Number(data.ttaTarget);
      temperatureMin = Number(data.temperatureMin);
      temperatureMax = Number(data.temperatureMax);
      formulaSummary = [
        teaType ? `Té: ${teaType}` : null,
        `${Number(data.teaGramsPerLiter)} g/L de té`,
        `${Number(data.sugarGramsPerLiter)} g/L de azúcar`,
        `${Number(data.yeastPitchRatePercent)}% de cultivo inicial`,
        `${Number(data.brewWaterPercent)}% de agua de cocción`,
      ]
        .filter(Boolean)
        .join(" · ");

      itemRows = blendItems.map((item) => ({
        sourceKind: "RAW_MATERIAL",
        rawMaterialId: item.rawMaterialId,
        freeTextName: item.freeTextName || null,
        sourceProductionType: null,
        quantity: (Number(data.teaGramsPerLiter) * item.sharePercent) / 100,
        sharePercent: item.sharePercent,
        unitOverride: "g",
        notes: "TEA_BLEND",
      }));
    }

    await ensureProductionFormulaColumns();

    await db.$transaction(async (tx) => {
      const existing = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "ProductionFormula"
        WHERE "code" = ${data.code}
        LIMIT 1
      `;

      const formulaId = existing[0]?.id || randomUUID();

      await tx.$executeRaw`
        INSERT INTO "ProductionFormula"
        ("id","code","name","recipeType","description","formulaSummary","teaType","teaGramsPerLiter","sugarGramsPerLiter","yeastPitchRatePercent","brewWaterPercent","flavorJuicePercent","flavorItemName","co2GramsPerLiter","carbonationMethod","f2ConditionDays","durationDays","durationHours","phMin","phMax","brixMin","brixMax","temperatureMin","temperatureMax","acidityMin","acidityMax","isActive","updatedByEmail","createdAt","updatedAt")
        VALUES
        (${formulaId}, ${data.code}, ${data.name.trim()}, ${recipeType}, NULL, ${formulaSummary || null}, ${teaType}, ${teaGramsPerLiter}, ${sugarGramsPerLiter}, ${yeastPitchRatePercent}, ${brewWaterPercent}, ${flavorJuicePercent}, ${flavorItemName}, ${co2GramsPerLiter}, ${carbonationMethod}, ${f2ConditionDays}, ${durationDays}, 0, ${phMin}, ${phMax}, ${brixTarget}, ${brixTarget}, ${temperatureMin}, ${temperatureMax}, ${ttaTarget}, ${ttaTarget}, true, ${updatedByEmail}, NOW(), NOW())
        ON CONFLICT ("code")
        DO UPDATE SET
          "name" = EXCLUDED."name",
          "recipeType" = EXCLUDED."recipeType",
          "description" = EXCLUDED."description",
          "formulaSummary" = EXCLUDED."formulaSummary",
          "teaType" = EXCLUDED."teaType",
          "teaGramsPerLiter" = EXCLUDED."teaGramsPerLiter",
          "sugarGramsPerLiter" = EXCLUDED."sugarGramsPerLiter",
          "yeastPitchRatePercent" = EXCLUDED."yeastPitchRatePercent",
          "brewWaterPercent" = EXCLUDED."brewWaterPercent",
          "flavorJuicePercent" = EXCLUDED."flavorJuicePercent",
          "flavorItemName" = EXCLUDED."flavorItemName",
          "co2GramsPerLiter" = EXCLUDED."co2GramsPerLiter",
          "carbonationMethod" = EXCLUDED."carbonationMethod",
          "f2ConditionDays" = EXCLUDED."f2ConditionDays",
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
        (${stepId}, ${formulaId}, 1, ${
          recipeType === "FLAVOR"
            ? "Sabor por litro"
            : recipeType === "SCOOBY"
              ? "SCOOBY por litro"
              : recipeType === "BLEND"
                ? "Blend por litro"
                : "Receta base por litro"
        }, ${
          recipeType === "FLAVOR"
            ? "Los ingredientes de sabor se guardan por litro para usarse en F2."
            : recipeType === "BLEND"
              ? "Los componentes del blend se guardan por litro y se escalan según el lote deseado."
              : "Los componentes del blend de té se guardan por litro y se escalan según el lote deseado."
        }, 1, NOW(), NOW())
      `;

      for (const item of itemRows) {
        await tx.$executeRaw`
          INSERT INTO "ProductionFormulaItem"
          ("id","formulaId","stepId","sourceKind","sourceProductionType","rawMaterialId","quantity","freeTextName","sharePercent","unitOverride","defaultLocationId","notes","createdAt","updatedAt")
          VALUES
          (${randomUUID()}, ${formulaId}, ${stepId}, ${item.sourceKind}, ${item.sourceProductionType}, ${item.rawMaterialId}, ${item.quantity}, ${item.freeTextName}, ${item.sharePercent}, ${item.unitOverride}, NULL, ${item.notes}, NOW(), NOW())
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

export async function archiveProductionFormula(code: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    if (!code.trim()) {
      return { success: false, error: "Código requerido" };
    }

    const user = await currentUser().catch(() => null);
    const updatedByEmail = user?.emailAddresses?.[0]?.emailAddress || null;

    await ensureProductionFormulaColumns();

    const result = await db.$executeRaw`
      UPDATE "ProductionFormula"
      SET "isActive" = ${isActive},
          "updatedByEmail" = ${updatedByEmail},
          "updatedAt" = NOW()
      WHERE "code" = ${code}
    `;

    if (!result) {
      return { success: false, error: "La fórmula no existe" };
    }

    revalidatePath("/admin/catalog/formulas");
    revalidatePath("/admin/catalog");
    revalidatePath("/admin/production");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo actualizar la fórmula",
    };
  }
}
