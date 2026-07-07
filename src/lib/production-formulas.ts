import { db } from "@/lib/db";
import type { ProductionFormulaView } from "@/lib/production-profiles";

type FormulaRow = {
  id: string;
  code: "A" | "B" | "C";
  name: string;
  description: string | null;
  formulaSummary: string | null;
  durationDays: number;
  durationHours: number;
  phMin: number | string;
  phMax: number | string;
  brixMin: number | string;
  brixMax: number | string;
  temperatureMin: number | string;
  temperatureMax: number | string;
  acidityMin: number | string;
  acidityMax: number | string;
  isActive: boolean;
  item_id: string | null;
  item_source_kind: "RAW_MATERIAL" | "BASE_BEVERAGE" | null;
  item_source_production_type: "A" | "B" | "C" | null;
  item_quantity: number | string | null;
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
    ALTER TABLE "ProductionFormulaItem"
    ADD COLUMN IF NOT EXISTS "sourceKind" TEXT NOT NULL DEFAULT 'RAW_MATERIAL'
  `).catch(() => null);
  await db.$executeRawUnsafe(`
    ALTER TABLE "ProductionFormulaItem"
    ADD COLUMN IF NOT EXISTS "sourceProductionType" TEXT
  `).catch(() => null);

  const rows = await db.$queryRawUnsafe<FormulaRow[]>(`
    SELECT
      pf."id",
      pf."code",
      pf."name",
      pf."description",
      pf."formulaSummary",
      pf."durationDays",
      pf."durationHours",
      pf."phMin",
      pf."phMax",
      pf."brixMin",
      pf."brixMax",
      pf."temperatureMin",
      pf."temperatureMax",
      pf."acidityMin",
      pf."acidityMax",
      pf."isActive",
      pfi."id" AS item_id,
      pfi."sourceKind" AS item_source_kind,
      pfi."sourceProductionType" AS item_source_production_type,
      pfi."quantity" AS item_quantity,
      pfi."notes" AS item_notes,
      rm."id" AS raw_material_id,
      rm."name" AS raw_material_name,
      rm."unit" AS raw_material_unit,
      loc."id" AS location_id,
      loc."name" AS location_name
    FROM "ProductionFormula" pf
    LEFT JOIN "ProductionFormulaItem" pfi ON pfi."formulaId" = pf."id"
    LEFT JOIN "RawMaterial" rm ON rm."id" = pfi."rawMaterialId"
    LEFT JOIN "Location" loc ON loc."id" = pfi."defaultLocationId"
    ORDER BY pf."code" ASC, rm."name" ASC
  `);

  const byId = new Map<string, ProductionFormulaView>();

  rows.forEach((row) => {
    if (!byId.has(row.id)) {
      byId.set(row.id, {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        formulaSummary: row.formulaSummary,
        durationDays: Number(row.durationDays),
        durationHours: Number(row.durationHours),
        phMin: toNumber(row.phMin),
        phMax: toNumber(row.phMax),
        brixMin: toNumber(row.brixMin),
        brixMax: toNumber(row.brixMax),
        temperatureMin: toNumber(row.temperatureMin),
        temperatureMax: toNumber(row.temperatureMax),
        acidityMin: toNumber(row.acidityMin),
        acidityMax: toNumber(row.acidityMax),
        isActive: row.isActive,
        items: [],
      });
    }

    if (row.item_id) {
      const isBaseBeverage = row.item_source_kind === "BASE_BEVERAGE";
      const baseType = row.item_source_production_type;
      const rawName = row.raw_material_name;
      const rawUnit = row.raw_material_unit;

      byId.get(row.id)?.items.push({
        id: row.item_id,
        sourceKind: isBaseBeverage ? "BASE_BEVERAGE" : "RAW_MATERIAL",
        sourceProductionType: baseType,
        rawMaterialId: row.raw_material_id,
        rawMaterialName: isBaseBeverage ? `Bebida base tipo ${baseType || "-"}` : rawName || "Materia prima",
        rawMaterialUnit: isBaseBeverage ? "Lt" : rawUnit || "-",
        quantity: toNumber(row.item_quantity),
        defaultLocationId: row.location_id,
        defaultLocationName: row.location_name,
        notes: row.item_notes,
      });
    }
  });

  return Array.from(byId.values());
}
