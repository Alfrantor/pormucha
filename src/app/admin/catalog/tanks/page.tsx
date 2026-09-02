import { db } from "@/lib/db";
import BaseBeverageStorageTanksManager from "@/components/admin/BaseBeverageStorageTanksManager";
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
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BaseBeverageStorageEntry_pkey" PRIMARY KEY ("id")
    )
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

function isDecimalLike(value: unknown): value is { toNumber: () => number } {
  if (!value || typeof value !== "object") return false;
  return "s" in value && "e" in value && "d" in value && typeof (value as { toNumber?: unknown }).toNumber === "function";
}

function serialize(value: any): any {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return Number(value);
  if (isDecimalLike(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serialize(entry)]));
  }
  return value;
}

export default async function CatalogTanksPage() {
  noStore();
  await ensureBaseBeverageStorageTables();

  const [storageTanksRaw, storageEntriesRaw] = await Promise.all([
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
      LEFT JOIN "ProductionFormula" pf ON pf."id" = p."productionFormulaId"
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

  return <BaseBeverageStorageTanksManager storageTanks={serialize(storageTanks)} />;
}
