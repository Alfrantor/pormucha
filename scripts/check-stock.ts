import { db } from "../src/lib/db";

async function main() {
  const [baseLots, storageTanks, storageEntries, flavorFormulas] = await Promise.all([
    db.$queryRaw<
      Array<{
        id: string;
        name: string | null;
        formulaCode: string | null;
        formulaName: string | null;
        productType: string | null;
        litersRemaining: number | string | null;
        litersProduced: number | string | null;
        status: string | null;
      }>
    >`
      SELECT
        bbi."id",
        p."name",
        pf."code" AS "formulaCode",
        pf."name" AS "formulaName",
        bbi."productType",
        bbi."litersRemaining",
        bbi."litersProduced",
        bbi."status"
      FROM "BaseBeverageInventory" bbi
      LEFT JOIN "Production" p ON p."id" = bbi."productionId"
      LEFT JOIN "ProductionFormula" pf ON pf."id" = p."productionFormulaId"
      ORDER BY bbi."createdAt" DESC
    `,
    db.$queryRaw<
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
    `,
    db.$queryRaw<
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
    `,
    db.productionFormula.findMany({
      where: { isActive: true, recipeType: "FLAVOR" },
      select: { id: true, name: true, code: true, recipeType: true },
      orderBy: { name: "asc" },
    }),
  ]);

  console.log("\n=== LOTES DE BEBIDA BASE CON REMANENTE ===");
  const filteredBase = baseLots.filter((row) => Number(row.litersRemaining || 0) > 0);
  if (!filteredBase.length) {
    console.log("No hay lotes base con remanente.");
  } else {
    for (const row of filteredBase) {
      console.log(
        `- ${row.name || "Lote"} | ${row.formulaName || row.formulaCode || row.productType || "-"} | remanente: ${Number(row.litersRemaining || 0)} L | estado: ${row.status || "-"}`,
      );
    }
  }

  console.log("\n=== TANQUES DE RESGUARDO CON EXISTENCIA ===");
  const activeTanks = storageTanks.filter((tank) => Number(tank.currentLiters || 0) > 0);
  if (!activeTanks.length) {
    console.log("No hay tanques de resguardo con litros.");
  } else {
    for (const tank of activeTanks) {
      console.log(
        `- ${tank.name} | ${tank.formulaName || tank.formulaCode || "-"} | ${Number(tank.currentLiters || 0)} / ${tank.capacityLt != null ? Number(tank.capacityLt) : "∞"} L`,
      );
    }
  }

  console.log("\n=== DETALLE DE ENTRADAS DE RESGUARDO ===");
  if (!storageEntries.length) {
    console.log("No hay entradas de resguardo.");
  } else {
    for (const entry of storageEntries) {
      console.log(
        `- Tanque ${entry.storageTankId} | formulaId=${entry.productionFormulaId || "-"} | added=${Number(entry.litersAdded || 0)} | remaining=${Number(entry.litersRemaining || 0)} | ${entry.formulaLabel || "-"}`,
      );
    }
  }

  console.log("\n=== RECETAS FLAVOR ACTIVAS ===");
  if (!flavorFormulas.length) {
    console.log("No hay recetas flavor activas.");
  } else {
    for (const formula of flavorFormulas) {
      console.log(`- ${formula.name} (${formula.code})`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect().catch(() => null);
  });
