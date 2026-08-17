import { db } from "@/lib/db";
import { Beaker } from "lucide-react";
import { BaseBeverageInventoryManager } from "@/components/admin/BaseBeverageInventoryManager";

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
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BaseBeverageStorageEntry_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => null);

  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "BaseBeverageStorageEntry_baseBeverageInventoryId_key"
    ON "BaseBeverageStorageEntry"("baseBeverageInventoryId")
  `).catch(() => null);

  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BaseBeverageStorageEntry_storageTankId_idx"
    ON "BaseBeverageStorageEntry"("storageTankId")
  `).catch(() => null);
}

export default async function BaseBeverageInventoryPage() {
  await ensureBaseBeverageStorageTables();

  const [rows, storageTanksRaw, storageEntriesRaw] = await Promise.all([
    db.$queryRawUnsafe<any[]>(`
      SELECT
        bbi.*,
        t.id AS tank_id_ref,
        t.name AS tank_name,
        p.id AS production_id_ref,
        p.name AS production_name,
        p."productionFormulaId",
        pf."code" AS formula_code,
        pf."name" AS formula_name
      FROM "BaseBeverageInventory" bbi
      LEFT JOIN "Tank" t ON t.id = bbi."tankId"
      LEFT JOIN "Production" p ON p.id = bbi."productionId"
      LEFT JOIN "ProductionFormula" pf ON pf.id = p."productionFormulaId"
      ORDER BY bbi."createdAt" DESC
    `).catch(() => []),
    db.$queryRawUnsafe<any[]>(`
      SELECT
        st.*,
        COALESCE(SUM(se."litersAdded"), 0) AS "currentLiters",
        COUNT(se."id") AS "sourceCount"
      FROM "BaseBeverageStorageTank" st
      LEFT JOIN "BaseBeverageStorageEntry" se ON se."storageTankId" = st."id"
      GROUP BY st."id"
      ORDER BY st."createdAt" DESC
    `).catch(() => []),
    db.$queryRawUnsafe<any[]>(`
      SELECT
        se.*,
        p."name" AS production_name,
        pf."code" AS formula_code,
        COALESCE(pf."name", se."formulaLabel") AS formula_name
      FROM "BaseBeverageStorageEntry" se
      LEFT JOIN "Production" p ON p."id" = se."productionId"
      LEFT JOIN "ProductionFormula" pf ON pf."id" = se."productionFormulaId"
      ORDER BY se."createdAt" DESC
    `).catch(() => []),
  ]);

  const storageEntriesByTank = new Map<string, any[]>();
  (storageEntriesRaw as any[]).forEach((entry) => {
    const list = storageEntriesByTank.get(entry.storageTankId) || [];
    list.push({
      ...entry,
      litersAdded: Number(entry.litersAdded || 0),
      createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : String(entry.createdAt),
    });
    storageEntriesByTank.set(entry.storageTankId, list);
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

  const totalProduced = inventoryRows.reduce((sum: number, row: any) => sum + Number(row.litersProduced || 0), 0);
  const totalRemaining = inventoryRows.reduce((sum: number, row: any) => sum + Number(row.litersRemaining || 0), 0);
  const storageTotal = storageTanks.reduce((sum: number, tank: any) => sum + Number(tank.currentLiters || 0), 0);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Inventario</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Inventario de bebida base</h1>
        <p className="mt-2 text-sm text-slate-500">Aquí queda registrado lo que entró al proceso, lo que salió, lo que quedó y lo que ya fue unificado en tanques de resguardo.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Lotes registrados" value={inventoryRows.length} />
        <Metric label="Litros producidos" value={totalProduced} unit="Lt" />
        <Metric label="Litros remanentes" value={totalRemaining} unit="Lt" />
        <Metric label="En tanques de resguardo" value={storageTotal} unit="Lt" />
      </section>

      <BaseBeverageInventoryManager rows={inventoryRows} storageTanks={storageTanks} />

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
