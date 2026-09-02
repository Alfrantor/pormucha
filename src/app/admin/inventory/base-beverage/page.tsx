import { db } from "@/lib/db";
import { Beaker } from "lucide-react";
import { BaseBeverageInventoryManager } from "@/components/admin/BaseBeverageInventoryManager";
import { BaseBeverageInventoryBoard } from "@/components/admin/BaseBeverageInventoryBoard";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function ensureBaseBeverageStorageTables() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BaseBeverageStorageTank" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "formulaCode" TEXT,
      "formulaName" TEXT,
      "capacityLt" DECIMAL(65,30),
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BaseBeverageStorageTank_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => null);

  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "BaseBeverageStorageTank_name_key"
    ON "BaseBeverageStorageTank"("name")
  `).catch(() => null);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BaseBeverageStorageEntry" (
      "id" TEXT NOT NULL,
      "storageTankId" TEXT NOT NULL,
      "baseBeverageInventoryId" TEXT NOT NULL,
      "productionId" TEXT,
      "productType" TEXT NOT NULL,
      "productionFormulaId" TEXT,
      "formulaLabel" TEXT,
      "litersAdded" DECIMAL(65,30) NOT NULL,
      "litersRemaining" DECIMAL(65,30),
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BaseBeverageStorageEntry_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => null);

  await db.$executeRawUnsafe(`
    ALTER TABLE "BaseBeverageStorageEntry"
    ADD COLUMN IF NOT EXISTS "litersRemaining" DECIMAL(65,30)
  `).catch(() => null);

  await db.$executeRawUnsafe(`
    UPDATE "BaseBeverageStorageEntry"
    SET "litersRemaining" = COALESCE("litersRemaining", "litersAdded")
  `).catch(() => null);

  await db.$executeRawUnsafe(`
    DROP INDEX IF EXISTS "BaseBeverageStorageEntry_baseBeverageInventoryId_key"
  `).catch(() => null);

  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BaseBeverageStorageEntry_baseBeverageInventoryId_idx"
    ON "BaseBeverageStorageEntry"("baseBeverageInventoryId")
  `).catch(() => null);

  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BaseBeverageStorageEntry_storageTankId_idx"
    ON "BaseBeverageStorageEntry"("storageTankId")
  `).catch(() => null);
}

export default async function BaseBeverageInventoryPage() {
  noStore();
  await ensureBaseBeverageStorageTables();

  const [rows, storageTanksRaw, storageEntriesRaw, phaseRowsRaw, parameterRowsRaw] = await Promise.all([
    db.$queryRawUnsafe<any[]>(`
      SELECT
        bbi.*,
        p."tankId" AS tank_id_ref,
        t.name AS tank_name,
        p.id AS production_id_ref,
        p.name AS production_name,
        p."productionFormulaId",
        pf."code" AS formula_code,
        pf."name" AS formula_name,
        pf."durationDays" AS formula_duration_days,
        pf."durationHours" AS formula_duration_hours
      FROM "BaseBeverageInventory" bbi
      LEFT JOIN "Production" p ON p.id = bbi."productionId"
      LEFT JOIN "Tank" t ON t.id = p."tankId"
      LEFT JOIN "ProductionFormula" pf ON pf.id = p."productionFormulaId"
      ORDER BY bbi."createdAt" DESC
    `).catch(() => []),
    db.$queryRawUnsafe<any[]>(`
      SELECT
        st.*,
        COALESCE(SUM(se."litersRemaining"), 0) AS "currentLiters",
        COUNT(se."id") AS "sourceCount"
      FROM "BaseBeverageStorageTank" st
      LEFT JOIN "BaseBeverageStorageEntry" se ON se."storageTankId" = st."id"
      GROUP BY st."id"
      ORDER BY st."createdAt" DESC
    `).catch(() => []),
    db.$queryRawUnsafe<any[]>(`
      SELECT
        se.*,
        st."id" AS storage_tank_id_ref,
        st."name" AS storage_tank_name,
        p."name" AS production_name,
        pf."code" AS formula_code,
        COALESCE(pf."name", se."formulaLabel") AS formula_name
      FROM "BaseBeverageStorageEntry" se
      LEFT JOIN "BaseBeverageStorageTank" st ON st."id" = se."storageTankId"
      LEFT JOIN "Production" p ON p."id" = se."productionId"
      LEFT JOIN "ProductionFormula" pf ON pf."id" = se."productionFormulaId"
      ORDER BY se."createdAt" DESC
    `).catch(() => []),
    db.$queryRawUnsafe<any[]>(`
      SELECT
        pr.*,
        p."name" AS production_name,
        p."productionFormulaId",
        pf."code" AS formula_code,
        pf."name" AS formula_name
      FROM "ProductionPhaseRecord" pr
      LEFT JOIN "Production" p ON p."id" = pr."productionId"
      LEFT JOIN "ProductionFormula" pf ON pf."id" = p."productionFormulaId"
      ORDER BY pr."measuredAt" DESC
    `).catch(() => []),
    db.$queryRawUnsafe<any[]>(`
      SELECT
        pp.*,
        p."name" AS production_name,
        p."productionFormulaId",
        pf."code" AS formula_code,
        pf."name" AS formula_name
      FROM "ProductionParameter" pp
      LEFT JOIN "Production" p ON p."id" = pp."productionId"
      LEFT JOIN "ProductionFormula" pf ON pf."id" = p."productionFormulaId"
      ORDER BY pp."measuredAt" DESC
    `).catch(() => []),
  ]);

  const storageEntriesByTank = new Map<string, any[]>();
  const storageEntriesByInventoryId = new Map<string, any[]>();
  (storageEntriesRaw as any[]).forEach((entry) => {
    const list = storageEntriesByTank.get(entry.storageTankId) || [];
    list.push({
      ...entry,
      litersAdded: Number(entry.litersAdded || 0),
      litersRemaining: Number((entry.litersRemaining ?? entry.litersAdded) || 0),
      createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : String(entry.createdAt),
    });
    storageEntriesByTank.set(entry.storageTankId, list);

    const inventoryList = storageEntriesByInventoryId.get(entry.baseBeverageInventoryId) || [];
    inventoryList.push({
      ...entry,
      litersAdded: Number(entry.litersAdded || 0),
      litersRemaining: Number((entry.litersRemaining ?? entry.litersAdded) || 0),
      createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : String(entry.createdAt),
      storageTank: entry.storage_tank_id_ref ? { id: entry.storage_tank_id_ref, name: entry.storage_tank_name } : null,
    });
    storageEntriesByInventoryId.set(entry.baseBeverageInventoryId, inventoryList);
  });

  const storageTanks = (storageTanksRaw as any[]).map((tank) => ({
    ...tank,
    capacityLt: tank.capacityLt != null ? Number(tank.capacityLt) : null,
    currentLiters: Number(tank.currentLiters || 0),
    sourceCount: Number(tank.sourceCount || 0),
    entries: storageEntriesByTank.get(tank.id) || [],
  }));

  const inventoryRows = (rows as any[]).map((row) => ({
    ...row,
    litersEntered: row.litersEntered != null ? Number(row.litersEntered) : null,
    litersProduced: Number(row.litersProduced || 0),
    litersRemaining: row.litersRemaining != null ? Number(row.litersRemaining) : null,
  }));

  const phasesByProductionId = new Map<string, any[]>();
  (phaseRowsRaw as any[]).forEach((phase) => {
    const list = phasesByProductionId.get(phase.productionId) || [];
    list.push({
      ...phase,
      measuredAt: phase.measuredAt instanceof Date ? phase.measuredAt.toISOString() : String(phase.measuredAt),
      ph: phase.ph != null ? Number(phase.ph) : null,
      brix: phase.brix != null ? Number(phase.brix) : null,
      temperature: phase.temperature != null ? Number(phase.temperature) : null,
      acidity: phase.acidity != null ? Number(phase.acidity) : null,
      receivedLiters: phase.receivedLiters != null ? Number(phase.receivedLiters) : null,
      remainingLiters: phase.remainingLiters != null ? Number(phase.remainingLiters) : null,
    });
    phasesByProductionId.set(phase.productionId, list);
  });

  const parametersByProductionId = new Map<string, any[]>();
  (parameterRowsRaw as any[]).forEach((parameter) => {
    const list = parametersByProductionId.get(parameter.productionId) || [];
    list.push({
      ...parameter,
      measuredAt: parameter.measuredAt instanceof Date ? parameter.measuredAt.toISOString() : String(parameter.measuredAt),
      ph: parameter.ph != null ? Number(parameter.ph) : null,
      brix: parameter.brix != null ? Number(parameter.brix) : null,
      temperature: parameter.temperature != null ? Number(parameter.temperature) : null,
      acidity: parameter.acidity != null ? Number(parameter.acidity) : null,
    });
    parametersByProductionId.set(parameter.productionId, list);
  });

  const inventoryBoardRows = inventoryRows.map((row) => ({
    ...row,
    tank: row.tank_id_ref ? { id: row.tank_id_ref, name: row.tank_name } : null,
    production: row.production_id_ref
      ? {
          id: row.production_id_ref,
          name: row.production_name,
          formulaCode: row.formula_code || null,
          formulaName: row.formula_name || null,
          productionFormulaId: row.productionFormulaId || null,
          formulaDurationDays: row.formula_duration_days != null ? Number(row.formula_duration_days) : null,
          formulaDurationHours: row.formula_duration_hours != null ? Number(row.formula_duration_hours) : null,
          phases: phasesByProductionId.get(row.production_id_ref) || [],
          parameters: parametersByProductionId.get(row.production_id_ref) || [],
          storageEntries: storageEntriesByInventoryId.get(row.id) || [],
        }
      : null,
  }));

  const totalProduced = inventoryRows.reduce((sum: number, row: any) => sum + Number(row.litersProduced || 0), 0);
  const totalRemaining = inventoryRows.reduce((sum: number, row: any) => sum + Number(row.litersRemaining || 0), 0);
  const storageTotal = storageTanks.reduce((sum: number, tank: any) => sum + Number(tank.currentLiters || 0), 0);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Inventario</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Lotes de bebida base</h1>
        <p className="mt-2 text-sm text-slate-500">Aquí queda registrado lo que entró al proceso, lo que salió, lo que quedó y lo que ya fue unificado en tanques de resguardo.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Lotes registrados" value={inventoryRows.length} />
        <Metric label="Litros producidos" value={totalProduced} unit="Lt" />
        <Metric label="Litros sin resguardo" value={totalRemaining} unit="Lt" />
        <Metric label="En tanques de resguardo" value={storageTotal} unit="Lt" />
      </section>

      <BaseBeverageInventoryBoard rows={inventoryBoardRows} storageTanks={storageTanks} />

      <details className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
        <summary className="cursor-pointer text-sm font-black text-slate-900">Gestión de resguardo y unificación</summary>
        <div className="mt-5">
          <BaseBeverageInventoryManager rows={inventoryRows} storageTanks={storageTanks} />
        </div>
      </details>

      <section className="rounded-[1.8rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <Beaker size={16} className="text-slate-500" />
          <p>
            La unificación mueve el remanente del lote origen a un tanque de resguardo y conserva qué proceso aportó cuántos litros. Eso deja libre la cubeta original y mantiene la trazabilidad detallada.
          </p>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, unit = "" }: { label: string; value: number; unit?: string }) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-lg">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/65">{label}</p>
      <p className="mt-3 text-3xl font-black">
        {value.toLocaleString("es-MX")}
        {unit ? ` ${unit}` : ""}
      </p>
    </div>
  );
}
