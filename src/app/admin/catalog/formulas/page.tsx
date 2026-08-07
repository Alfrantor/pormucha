import { db } from "@/lib/db";
import { loadProductionFormulas } from "@/lib/production-formulas";
import ProductionFormulasManager from "@/components/admin/ProductionFormulasManager";
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
  const [formulas, rawMaterials, locations] = await Promise.all([
    loadProductionFormulas(),
    db.rawMaterial.findMany({
      where: { isArchived: false },
      orderBy: { name: "asc" },
    }),
    db.location.findMany({
      where: { isArchived: false },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Catalogo</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Formulas de produccion</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Aqui definimos como se prepara cada formula paso por paso: para cuantos litros aplica, que se hace en cada etapa, que insumos lleva y cuantos litros resultan.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Formulas cargadas" value={formulas.length} />
        <Metric label="Materias primas activas" value={rawMaterials.length} />
        <Metric label="Ubicaciones disponibles" value={locations.length} />
      </section>

      <ProductionFormulasManager
        key={formulas.map((formula) => `${formula.id}:${formula.code}:${formula.updatedAt ?? ""}:${formula.name}:${formula.targetLiters ?? ""}:${formula.durationDays}:${formula.durationHours}:${formula.isActive ? "1" : "0"}`).join("|")}
        formulas={serialize(formulas) as ProductionFormulaView[]}
        rawMaterials={serialize(rawMaterials) as { id: string; name: string; unit?: string | null }[]}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-lg">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/65">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}
