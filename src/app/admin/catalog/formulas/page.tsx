import { db } from "@/lib/db";
import { loadProductionFormulas } from "@/lib/production-formulas";
import ProductionFormulasCatalog from "@/components/admin/ProductionFormulasCatalog";
import type { ProductionFormulaView } from "@/lib/production-profiles";

function isDecimalLike(value: unknown): value is { toNumber: () => number } {
  if (!value || typeof value !== "object") return false;
  return (
    "s" in value &&
    "e" in value &&
    "d" in value &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  );
}

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return Number(value);
  if (isDecimalLike(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  }
  return value;
}

export default async function CatalogFormulasPage() {
  const [formulas, rawMaterials, flavors] = await Promise.all([
    loadProductionFormulas(),
    db.rawMaterial.findMany({
      where: { isArchived: false },
      orderBy: { name: "asc" },
    }),
    db.flavor.findMany({
      where: { isArchived: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <ProductionFormulasCatalog formulas={serialize(formulas) as ProductionFormulaView[]} rawMaterials={serialize(rawMaterials) as { id: string; name: string; unit?: string | null }[]} flavors={serialize(flavors) as { id: string; name: string }[]} />;
}
