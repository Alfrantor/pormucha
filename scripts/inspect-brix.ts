import { db } from "../src/lib/db";

async function main() {
  const baseLots = await db.$queryRaw<
    Array<{
      id: string;
      name: string | null;
      litersRemaining: number | string | null;
      formulaCode: string | null;
      formulaName: string | null;
      status: string | null;
      productionId: string | null;
    }>
  >`
    SELECT
      bbi."id",
      p."name",
      bbi."litersRemaining",
      pf."code" AS "formulaCode",
      pf."name" AS "formulaName",
      bbi."status",
      bbi."productionId"
    FROM "BaseBeverageInventory" bbi
    LEFT JOIN "Production" p ON p."id" = bbi."productionId"
    LEFT JOIN "ProductionFormula" pf ON pf."id" = p."productionFormulaId"
    ORDER BY bbi."createdAt" DESC
  `;

  const storageTanks = await db.$queryRaw<
    Array<{
      id: string;
      name: string;
      formulaCode: string | null;
      formulaName: string | null;
      capacityLt: number | string | null;
      currentLiters: number | string | null;
      isActive: boolean;
    }>
  >`
    SELECT
      st."id",
      st."name",
      st."formulaCode",
      st."formulaName",
      st."capacityLt",
      COALESCE(SUM(se."litersRemaining"), 0) AS "currentLiters",
      st."isActive"
    FROM "BaseBeverageStorageTank" st
    LEFT JOIN "BaseBeverageStorageEntry" se ON se."storageTankId" = st."id"
    GROUP BY st."id"
    ORDER BY st."createdAt" DESC
  `;

  const storageEntries = await db.$queryRaw<
    Array<{
      id: string;
      storageTankId: string;
      productionFormulaId: string | null;
      litersAdded: number | string | null;
      litersRemaining: number | string | null;
      formulaLabel: string | null;
      createdAt: Date;
    }>
  >`
    SELECT
      se."id",
      se."storageTankId",
      se."productionFormulaId",
      se."litersAdded",
      se."litersRemaining",
      se."formulaLabel",
      se."createdAt"
    FROM "BaseBeverageStorageEntry" se
    ORDER BY se."createdAt" ASC
  `;

  const withBrix = await db.$queryRaw<
    Array<{ productionId: string; brix: number | string | null; measuredAt: Date | string }>
  >`
    SELECT DISTINCT ON (pp."productionId") pp."productionId", pp."brix", pp."measuredAt"
    FROM "ProductionParameter" pp
    WHERE pp."brix" IS NOT NULL
    ORDER BY pp."productionId", pp."measuredAt" DESC
  `;

  const phaseBrix = await db.$queryRaw<
    Array<{ productionId: string; brix: number | string | null; measuredAt: Date | string }>
  >`
    SELECT DISTINCT ON (pr."productionId") pr."productionId", pr."brix", pr."measuredAt"
    FROM "ProductionPhaseRecord" pr
    WHERE pr."brix" IS NOT NULL
    ORDER BY pr."productionId", pr."measuredAt" DESC
  `;

  const brixMap = new Map<string, number>();
  withBrix.forEach((row) => brixMap.set(row.productionId, Number(row.brix || 0)));
  phaseBrix.forEach((row) => {
    if (!brixMap.has(row.productionId)) brixMap.set(row.productionId, Number(row.brix || 0));
  });

  const baseReady = baseLots.filter((row) => Number(row.litersRemaining || 0) > 0);
  const usableBase = baseReady.filter((row) => row.productionId && brixMap.has(row.productionId));
  const activeTanks = storageTanks.filter((tank) => Number(tank.currentLiters || 0) > 0);

  console.log("\n=== LOTES BASE CON REMANENTE ===");
  console.log(JSON.stringify(
    baseReady.map((row) => ({
      id: row.id,
      name: row.name,
      litersRemaining: Number(row.litersRemaining || 0),
      formula: row.formulaName || row.formulaCode || "-",
      status: row.status,
      productionId: row.productionId,
      hasBrix: row.productionId ? brixMap.has(row.productionId) : false,
    })),
    null,
    2,
  ));

  console.log("\n=== LOTES BASE LISTOS PARA BEBIDA FINAL ===");
  console.log(JSON.stringify(
    usableBase.map((row) => ({
      id: row.id,
      name: row.name,
      litersRemaining: Number(row.litersRemaining || 0),
      formula: row.formulaName || row.formulaCode || "-",
      brix: row.productionId ? brixMap.get(row.productionId) : null,
      status: row.status,
    })),
    null,
    2,
  ));

  console.log("\n=== TANQUES DE RESGUARDO CON EXISTENCIA ===");
  console.log(JSON.stringify(
    activeTanks.map((tank) => ({
      id: tank.id,
      name: tank.name,
      formula: tank.formulaName || tank.formulaCode || "-",
      currentLiters: Number(tank.currentLiters || 0),
      capacityLt: tank.capacityLt != null ? Number(tank.capacityLt) : null,
      isActive: tank.isActive,
    })),
    null,
    2,
  ));

  console.log("\n=== ENTRADAS DE RESGUARDO ===");
  console.log(JSON.stringify(
    storageEntries.map((entry) => ({
      id: entry.id,
      storageTankId: entry.storageTankId,
      productionFormulaId: entry.productionFormulaId,
      litersAdded: Number(entry.litersAdded || 0),
      litersRemaining: Number(entry.litersRemaining || 0),
      formulaLabel: entry.formulaLabel,
    })),
    null,
    2,
  ));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect().catch(() => null);
  });
