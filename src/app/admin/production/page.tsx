import { db } from "@/lib/db";
import { loadProductionFormulas } from "@/lib/production-formulas";
import ProductionWorkspace from "@/components/admin/ProductionWorkspace";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

function isDecimalLike(value: unknown): value is { toNumber: () => number } {
  if (!value || typeof value !== "object") return false;
  return (
    "s" in value &&
    "e" in value &&
    "d" in value &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  );
}

function serialize(value: any): any {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return Number(value);
  if (isDecimalLike(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
  }
  return value;
}

export default async function ProductionPage() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;
  const user = await currentUser();

  if (role !== "admin" && role !== "vendedor") {
    redirect("/perfil");
  }

  const [tanks, productions, rawMaterials, locations, flavors, gasRows, labelRows, phaseRows, formulas, productionFormulaRefs, productionInputLitersRows, baseBeverageInventory] = await Promise.all([
    db.tank.findMany({ orderBy: { createdAt: "asc" } }),
    db.production.findMany({
      include: {
        tank: true,
        ingredients: { include: { rawMaterial: true } },
        additions: { include: { rawMaterial: true } },
        parameters: { orderBy: { measuredAt: "asc" } },
      },
      orderBy: { startedAt: "desc" },
    }),
    db.rawMaterial.findMany({
      include: { stocks: { include: { location: true } } },
      orderBy: { name: "asc" },
    }),
    db.location.findMany({ where: { isArchived: false }, orderBy: { isDefault: "desc" } }),
    db.flavor.findMany({
      where: { isArchived: false },
      include: { locationStocks: { include: { location: true } } },
      orderBy: { name: "asc" },
    }),
    db.$queryRawUnsafe(`
      SELECT
        gb.*,
        f.id AS flavor_id_ref,
        f.name AS flavor_name,
        t.id AS tank_id_ref,
        t.name AS tank_name,
        l.id AS location_id_ref,
        l.name AS location_name
      FROM "GasificationBatch" gb
      LEFT JOIN "Flavor" f ON f.id = gb."flavorId"
      LEFT JOIN "Tank" t ON t.id = gb."tankId"
      LEFT JOIN "Location" l ON l.id = gb."locationId"
      ORDER BY gb."startedAt" DESC
    `).catch(() => []),
    db.$queryRawUnsafe(`
      SELECT
        lb.*,
        f.id AS flavor_id_ref,
        f.name AS flavor_name,
        l.id AS location_id_ref,
        l.name AS location_name
      FROM "LabelingBatch" lb
      LEFT JOIN "Flavor" f ON f.id = lb."flavorId"
      LEFT JOIN "Location" l ON l.id = lb."locationId"
      ORDER BY lb."startedAt" DESC
    `).catch(() => []),
    db.$queryRawUnsafe(`
      SELECT *
      FROM "ProductionPhaseRecord"
      ORDER BY "measuredAt" DESC
    `).catch(() => []),
    loadProductionFormulas().catch(() => []),
    db.$queryRawUnsafe(`
      SELECT "id", "productionFormulaId"
      FROM "Production"
      WHERE "productionFormulaId" IS NOT NULL
    `).catch(() => []),
    db.$queryRawUnsafe(`
      SELECT "id", "inputLiters"
      FROM "Production"
      WHERE "inputLiters" IS NOT NULL
    `).catch(() => []),
    db.$queryRawUnsafe(`
      SELECT
        bbi.*,
        t.id AS tank_id_ref,
        t.name AS tank_name,
        p.id AS production_id_ref,
        p.name AS production_name
      FROM "BaseBeverageInventory" bbi
      LEFT JOIN "Tank" t ON t.id = bbi."tankId"
      LEFT JOIN "Production" p ON p.id = bbi."productionId"
      ORDER BY bbi."createdAt" DESC
    `).catch(() => []),
  ]);

  const gasificationBatches = (gasRows as any[]).map((row) => ({
    ...row,
    flavor: row.flavor_id_ref ? { id: row.flavor_id_ref, name: row.flavor_name } : null,
    tank: row.tank_id_ref ? { id: row.tank_id_ref, name: row.tank_name } : null,
    location: row.location_id_ref ? { id: row.location_id_ref, name: row.location_name } : null,
  }));

  const labelingBatches = (labelRows as any[]).map((row) => ({
    ...row,
    flavor: row.flavor_id_ref ? { id: row.flavor_id_ref, name: row.flavor_name } : null,
    location: row.location_id_ref ? { id: row.location_id_ref, name: row.location_name } : null,
  }));

  const baseBeverageInventoryRows = (baseBeverageInventory as any[]).map((row) => ({
    ...row,
    tank: row.tank_id_ref ? { id: row.tank_id_ref, name: row.tank_name } : null,
    production: row.production_id_ref ? { id: row.production_id_ref, name: row.production_name } : null,
  }));

  const phasesByProductionId = new Map<string, any[]>();
  (phaseRows as any[]).forEach((row) => {
    const list = phasesByProductionId.get(row.productionId) || [];
    list.push(row);
    phasesByProductionId.set(row.productionId, list);
  });

  const formulaById = new Map<string, any>();
  (formulas as any[]).forEach((formula) => {
    formulaById.set(formula.id, formula);
  });

  const formulaRefByProductionId = new Map<string, string>();
  (productionFormulaRefs as any[]).forEach((row) => {
    if (row.productionFormulaId) {
      formulaRefByProductionId.set(row.id, row.productionFormulaId);
    }
  });

  const inputLitersByProductionId = new Map<string, number>();
  (productionInputLitersRows as any[]).forEach((row) => {
    if (row.inputLiters != null) {
      inputLitersByProductionId.set(row.id, Number(row.inputLiters));
    }
  });

  const productionsWithPhases = productions.map((production: any) => {
    const productionFormulaId = formulaRefByProductionId.get(production.id);
    return {
      ...production,
      productionFormulaId: productionFormulaId || null,
      inputLiters: inputLitersByProductionId.get(production.id) ?? null,
      formula: productionFormulaId ? formulaById.get(productionFormulaId) || null : null,
      secondPhaseRecords: phasesByProductionId.get(production.id) || [],
    };
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Operacion</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Produccion</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Aqui administramos la bebida base, el gasificado y el etiquetado como flujos separados dentro de la misma operacion.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/catalog/formulas"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
            >
              Ver recetas
            </Link>
          </div>
        </div>
      </section>

      <ProductionWorkspace
        tanks={serialize(tanks)}
        productions={serialize(productionsWithPhases)}
        rawMaterials={serialize(rawMaterials)}
        locations={serialize(locations)}
        formulas={serialize(formulas)}
        flavors={serialize(flavors)}
        gasificationBatches={serialize(gasificationBatches)}
        labelingBatches={serialize(labelingBatches)}
        baseBeverageInventory={serialize(baseBeverageInventoryRows)}
        userEmail={user?.emailAddresses[0]?.emailAddress || ""}
      />
    </div>
  );
}
