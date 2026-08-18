import { db } from "@/lib/db";
import type { ProductionFormulaView } from "@/lib/production-profiles";

type FormulaRow = {
  id: string;
  code: string;
  name: string;
  recipeType: string | null;
  description: string | null;
  formulaSummary: string | null;
  targetLiters: number | string | null;
  teaType: string | null;
  teaGramsPerLiter: number | string | null;
  sugarGramsPerLiter: number | string | null;
  yeastPitchRatePercent: number | string | null;
  brewWaterPercent: number | string | null;
  flavorJuicePercent: number | string | null;
  flavorItemName: string | null;
  co2GramsPerLiter: number | string | null;
  carbonationMethod: string | null;
  f2ConditionDays: number | null;
  durationDays: number;
  durationHours: number;
  updatedAt: Date | string;
  updatedByEmail: string | null;
  phMin: number | string;
  phMax: number | string;
  brixMin: number | string;
  brixMax: number | string;
  temperatureMin: number | string;
  temperatureMax: number | string;
  acidityMin: number | string;
  acidityMax: number | string;
  isActive: boolean;
  step_id: string | null;
  step_number: number | null;
  step_title: string | null;
  step_instructions: string | null;
  step_result_liters: number | string | null;
  item_id: string | null;
  item_source_kind: "RAW_MATERIAL" | "BASE_BEVERAGE" | null;
  item_source_production_type: string | null;
  item_quantity: number | string | null;
  item_free_text_name: string | null;
  item_share_percent: number | string | null;
  item_unit_override: string | null;
  item_notes: string | null;
  raw_material_id: string | null;
  raw_material_name: string | null;
  raw_material_unit: string | null;
  location_id: string | null;
  location_name: string | null;
};

function toNumber(value: number | string | null | undefined) {
  if (value == null) return 0;
  return Number(value);
}

export async function loadProductionFormulas(): Promise<ProductionFormulaView[]> {
  await db.$executeRawUnsafe(`
    ALTER TABLE "ProductionFormula"
    ADD COLUMN IF NOT EXISTS "recipeType" TEXT NOT NULL DEFAULT 'ACIDIFIER'
  `).catch(() => null);
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
    ALTER TABLE "ProductionFormula"
    ADD COLUMN IF NOT EXISTS "flavorJuicePercent" DECIMAL(65,30)
  `).catch(() => null);
  await db.$executeRawUnsafe(`
    ALTER TABLE "ProductionFormula"
    ADD COLUMN IF NOT EXISTS "flavorItemName" TEXT
  `).catch(() => null);
  await db.$executeRawUnsafe(`
    ALTER TABLE "ProductionFormula"
    ADD COLUMN IF NOT EXISTS "co2GramsPerLiter" DECIMAL(65,30)
  `).catch(() => null);
  await db.$executeRawUnsafe(`
    ALTER TABLE "ProductionFormula"
    ADD COLUMN IF NOT EXISTS "carbonationMethod" TEXT
  `).catch(() => null);
  await db.$executeRawUnsafe(`
    ALTER TABLE "ProductionFormula"
    ADD COLUMN IF NOT EXISTS "f2ConditionDays" INTEGER
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
    CREATE INDEX IF NOT EXISTS "ProductionFormulaStep_formulaId_stepNumber_idx"
    ON "ProductionFormulaStep"("formulaId", "stepNumber")
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
    ADD COLUMN IF NOT EXISTS "freeTextName" TEXT
  `).catch(() => null);
  await db.$executeRawUnsafe(`
    ALTER TABLE "ProductionFormulaItem"
    ADD COLUMN IF NOT EXISTS "sharePercent" DECIMAL(65,30)
  `).catch(() => null);
  await db.$executeRawUnsafe(`
    ALTER TABLE "ProductionFormulaItem"
    ADD COLUMN IF NOT EXISTS "unitOverride" TEXT
  `).catch(() => null);

  const rows = await db.$queryRawUnsafe<FormulaRow[]>(`
    SELECT
      pf."id",
      pf."code",
      pf."name",
      pf."recipeType",
      pf."description",
      pf."formulaSummary",
      pf."targetLiters",
      pf."teaType",
      pf."teaGramsPerLiter",
      pf."sugarGramsPerLiter",
      pf."yeastPitchRatePercent",
      pf."brewWaterPercent",
      pf."flavorJuicePercent",
      pf."flavorItemName",
      pf."co2GramsPerLiter",
      pf."carbonationMethod",
      pf."f2ConditionDays",
      pf."durationDays",
      pf."durationHours",
      pf."updatedAt",
      pf."updatedByEmail",
      pf."phMin",
      pf."phMax",
      pf."brixMin",
      pf."brixMax",
      pf."temperatureMin",
      pf."temperatureMax",
      pf."acidityMin",
      pf."acidityMax",
      pf."isActive",
      pfs."id" AS step_id,
      pfs."stepNumber" AS step_number,
      pfs."title" AS step_title,
      pfs."instructions" AS step_instructions,
      pfs."resultLiters" AS step_result_liters,
      pfi."id" AS item_id,
      pfi."sourceKind" AS item_source_kind,
      pfi."sourceProductionType" AS item_source_production_type,
      pfi."quantity" AS item_quantity,
      pfi."freeTextName" AS item_free_text_name,
      pfi."sharePercent" AS item_share_percent,
      pfi."unitOverride" AS item_unit_override,
      pfi."notes" AS item_notes,
      rm."id" AS raw_material_id,
      rm."name" AS raw_material_name,
      rm."unit" AS raw_material_unit,
      loc."id" AS location_id,
      loc."name" AS location_name
    FROM "ProductionFormula" pf
    LEFT JOIN "ProductionFormulaStep" pfs ON pfs."formulaId" = pf."id"
    LEFT JOIN "ProductionFormulaItem" pfi ON pfi."formulaId" = pf."id" AND (
      pfi."stepId" = pfs."id" OR (pfi."stepId" IS NULL AND pfs."id" IS NULL)
    )
    LEFT JOIN "RawMaterial" rm ON rm."id" = pfi."rawMaterialId"
    LEFT JOIN "Location" loc ON loc."id" = pfi."defaultLocationId"
    ORDER BY pf."code" ASC, COALESCE(pfs."stepNumber", 1) ASC, rm."name" ASC
  `);

  const byId = new Map<string, ProductionFormulaView>();

  rows.forEach((row) => {
    if (!byId.has(row.id)) {
      byId.set(row.id, {
        id: row.id,
        code: row.code,
        name: row.name,
        recipeType: row.recipeType || "ACIDIFIER",
        description: row.description,
        formulaSummary: row.formulaSummary,
        targetLiters: row.targetLiters != null ? toNumber(row.targetLiters) : null,
        teaType: row.teaType,
        teaGramsPerLiter: row.teaGramsPerLiter != null ? toNumber(row.teaGramsPerLiter) : null,
        sugarGramsPerLiter: row.sugarGramsPerLiter != null ? toNumber(row.sugarGramsPerLiter) : null,
        yeastPitchRatePercent: row.yeastPitchRatePercent != null ? toNumber(row.yeastPitchRatePercent) : null,
        brewWaterPercent: row.brewWaterPercent != null ? toNumber(row.brewWaterPercent) : null,
        flavorJuicePercent: row.flavorJuicePercent != null ? toNumber(row.flavorJuicePercent) : null,
        flavorItemName: row.flavorItemName,
        co2GramsPerLiter: row.co2GramsPerLiter != null ? toNumber(row.co2GramsPerLiter) : null,
        carbonationMethod: row.carbonationMethod,
        f2ConditionDays: row.f2ConditionDays != null ? Number(row.f2ConditionDays) : null,
        durationDays: Number(row.durationDays),
        durationHours: Number(row.durationHours),
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
        updatedByEmail: row.updatedByEmail,
        phMin: toNumber(row.phMin),
        phMax: toNumber(row.phMax),
        brixMin: toNumber(row.brixMin),
        brixMax: toNumber(row.brixMax),
        temperatureMin: toNumber(row.temperatureMin),
        temperatureMax: toNumber(row.temperatureMax),
        acidityMin: toNumber(row.acidityMin),
        acidityMax: toNumber(row.acidityMax),
        isActive: row.isActive,
        steps: [],
        items: [],
        blendItems: [],
        flavorIngredients: [],
      });
    }

    const currentFormula = byId.get(row.id);

    if (row.step_id && currentFormula && !currentFormula.steps.find((step) => step.id === row.step_id)) {
      currentFormula.steps.push({
        id: row.step_id,
        stepNumber: Number(row.step_number || currentFormula.steps.length + 1),
        title: row.step_title || `Paso ${Number(row.step_number || currentFormula.steps.length + 1)}`,
        instructions: row.step_instructions,
        resultLiters: row.step_result_liters != null ? toNumber(row.step_result_liters) : null,
        items: [],
      });
    }

    if (row.item_id) {
      const isBaseBeverage = row.item_source_kind === "BASE_BEVERAGE";
      const baseType = row.item_source_production_type;
      const rawName = row.raw_material_name;
      const rawUnit = row.raw_material_unit;

      const itemView = {
        id: row.item_id,
        sourceKind: (isBaseBeverage ? "BASE_BEVERAGE" : "RAW_MATERIAL") as "BASE_BEVERAGE" | "RAW_MATERIAL",
        sourceProductionType: baseType,
        rawMaterialId: row.raw_material_id,
        rawMaterialName: isBaseBeverage ? `Bebida base tipo ${baseType || "-"}` : rawName || "Materia prima",
        rawMaterialUnit: isBaseBeverage ? "Lt" : rawUnit || "-",
        quantity: toNumber(row.item_quantity),
        freeTextName: row.item_free_text_name,
        sharePercent: row.item_share_percent != null ? toNumber(row.item_share_percent) : null,
        unitOverride: row.item_unit_override,
        defaultLocationId: row.location_id,
        defaultLocationName: row.location_name,
        notes: row.item_notes,
      };

      currentFormula?.items.push(itemView);

      if (row.step_id) {
        currentFormula?.steps.find((step) => step.id === row.step_id)?.items.push(itemView);
      }

      if (row.item_share_percent != null && currentFormula) {
        currentFormula.blendItems.push({
          id: row.item_id,
          rawMaterialId: row.raw_material_id,
          rawMaterialName: row.raw_material_name,
          freeTextName: row.item_free_text_name,
          sharePercent: toNumber(row.item_share_percent),
          gramsPerLiter: toNumber(row.item_quantity),
          unit: row.raw_material_unit || "g",
        });
      }

      if (currentFormula && typeof row.item_notes === "string" && row.item_notes.startsWith("FLAVOR_INGREDIENT")) {
        currentFormula.flavorIngredients.push(itemView);
      }
    }
  });

  byId.forEach((formula) => {
    if (formula.steps.length === 0 && formula.items.length > 0) {
      formula.steps = [
        {
          id: `${formula.id}-legacy-step`,
          stepNumber: 1,
          title: "Paso 1",
          instructions: formula.formulaSummary || formula.description || "Paso migrado desde la fórmula anterior.",
          resultLiters: formula.targetLiters ?? null,
          items: formula.items,
        },
      ];
    }

    formula.steps.sort((a, b) => a.stepNumber - b.stepNumber);
  });

  return Array.from(byId.values());
}
