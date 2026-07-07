"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

type FormulaItemInput = {
  sourceKind: "RAW_MATERIAL" | "BASE_BEVERAGE";
  sourceProductionType?: "A" | "B" | "C" | null;
  rawMaterialId?: string | null;
  quantity: number;
  defaultLocationId?: string | null;
  notes?: string;
};

export async function saveProductionFormula(data: {
  code: "A" | "B" | "C";
  name: string;
  description?: string;
  formulaSummary?: string;
  durationDays: number;
  durationHours: number;
  phMin: number;
  phMax: number;
  brixMin: number;
  brixMax: number;
  temperatureMin: number;
  temperatureMax: number;
  acidityMin: number;
  acidityMax: number;
  isActive?: boolean;
  items: FormulaItemInput[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.code) return { success: false, error: "Codigo requerido" };
    if (!data.name.trim()) return { success: false, error: "Nombre requerido" };
    if ((!Number.isFinite(data.durationDays) || data.durationDays < 0) || (!Number.isFinite(data.durationHours) || data.durationHours < 0)) {
      return { success: false, error: "La duracion no es valida" };
    }
    if (data.durationDays === 0 && data.durationHours === 0) {
      return { success: false, error: "La duracion debe ser mayor a cero" };
    }

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

    const validItems = data.items.filter((item) => {
      if (!(Number(item.quantity) > 0)) return false;
      if (item.sourceKind === "BASE_BEVERAGE") return !!item.sourceProductionType;
      return !!item.rawMaterialId;
    });

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
        ("id","code","name","description","formulaSummary","durationDays","durationHours","phMin","phMax","brixMin","brixMax","temperatureMin","temperatureMax","acidityMin","acidityMax","isActive","createdAt","updatedAt")
        VALUES
        (${formulaId}, ${data.code}, ${data.name.trim()}, ${data.description?.trim() || null}, ${data.formulaSummary?.trim() || null}, ${data.durationDays}, ${data.durationHours}, ${data.phMin}, ${data.phMax}, ${data.brixMin}, ${data.brixMax}, ${data.temperatureMin}, ${data.temperatureMax}, ${data.acidityMin}, ${data.acidityMax}, ${data.isActive ?? true}, NOW(), NOW())
        ON CONFLICT ("code")
        DO UPDATE SET
          "name" = EXCLUDED."name",
          "description" = EXCLUDED."description",
          "formulaSummary" = EXCLUDED."formulaSummary",
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
          "updatedAt" = NOW()
      `;

      await tx.$executeRaw`
        DELETE FROM "ProductionFormulaItem"
        WHERE "formulaId" = ${formulaId}
      `;

      for (const item of validItems) {
        await tx.$executeRaw`
          INSERT INTO "ProductionFormulaItem"
          ("id","formulaId","sourceKind","sourceProductionType","rawMaterialId","quantity","defaultLocationId","notes","createdAt","updatedAt")
          VALUES
          (${randomUUID()}, ${formulaId}, ${item.sourceKind}, ${item.sourceKind === "BASE_BEVERAGE" ? item.sourceProductionType || null : null}, ${item.sourceKind === "RAW_MATERIAL" ? item.rawMaterialId || null : null}, ${item.quantity}, ${item.defaultLocationId || null}, ${item.notes?.trim() || null}, NOW(), NOW())
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
      error: error instanceof Error ? error.message : "No se pudo guardar la formula",
    };
  }
}
