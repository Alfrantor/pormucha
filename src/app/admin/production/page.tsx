import { db } from "@/lib/db";
import { loadProductionFormulas } from "@/lib/production-formulas";
import ProductionWorkspace from "@/components/admin/ProductionWorkspace";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

type ProductionTab = "bebida" | "gasificado" | "etiquetado" | "formulas";

function resolveInitialTab(value: string | string[] | undefined): ProductionTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "gasificado" || raw === "etiquetado" || raw === "formulas" ? raw : "bebida";
}

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

async function ensureProductionPhaseTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ProductionPhaseRecord" (
      "id" TEXT NOT NULL,
      "productionId" TEXT NOT NULL,
      "phase" INTEGER NOT NULL,
      "receivedCondition" TEXT,
      "receivedBy" TEXT,
      "measuredBy" TEXT,
      "startedBy" TEXT,
      "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "ph" DECIMAL(65,30),
      "brix" DECIMAL(65,30),
      "temperature" DECIMAL(65,30),
      "acidity" DECIMAL(65,30),
      "notes" TEXT,
      "receivedLiters" DECIMAL(65,30),
      "remainingLiters" DECIMAL(65,30),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProductionPhaseRecord_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => null);

  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ProductionPhaseRecord_productionId_idx"
    ON "ProductionPhaseRecord"("productionId")
  `).catch(() => null);
}

async function ensureProductionColumns() {
  await db.$executeRawUnsafe(`
    ALTER TABLE "Production"
    ADD COLUMN IF NOT EXISTS "startedLiters" DECIMAL(65,30)
  `).catch(() => null);
}

async function ensureFinalBeverageBlendTables() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FinalBeverageBlend" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "flavorId" TEXT,
      "flavorName" TEXT,
      "targetBrix" DECIMAL(65,30) NOT NULL,
      "weightedBrix" DECIMAL(65,30) NOT NULL,
      "sugarToAddKg" DECIMAL(65,30) NOT NULL,
      "totalLiters" DECIMAL(65,30) NOT NULL,
      "sugarGramsPerLiter" DECIMAL(65,30),
      "waterPercent" DECIMAL(65,30),
      "acidifierPercent" DECIMAL(65,30),
      "scoobyPercent" DECIMAL(65,30),
      "flavorPercent" DECIMAL(65,30),
      "notes" TEXT,
      "createdBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FinalBeverageBlend_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => null);

  await db.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlend"
    ADD COLUMN IF NOT EXISTS "flavorId" TEXT
  `).catch(() => null);
  await db.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlend"
    ADD COLUMN IF NOT EXISTS "flavorName" TEXT
  `).catch(() => null);
  await db.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlend"
    ADD COLUMN IF NOT EXISTS "sugarGramsPerLiter" DECIMAL(65,30)
  `).catch(() => null);
  await db.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlend"
    ADD COLUMN IF NOT EXISTS "waterPercent" DECIMAL(65,30)
  `).catch(() => null);
  await db.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlend"
    ADD COLUMN IF NOT EXISTS "acidifierPercent" DECIMAL(65,30)
  `).catch(() => null);
  await db.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlend"
    ADD COLUMN IF NOT EXISTS "scoobyPercent" DECIMAL(65,30)
  `).catch(() => null);
  await db.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlend"
    ADD COLUMN IF NOT EXISTS "flavorPercent" DECIMAL(65,30)
  `).catch(() => null);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FinalBeverageBlendComponent" (
      "id" TEXT NOT NULL,
      "blendId" TEXT NOT NULL,
      "sourceType" TEXT NOT NULL,
      "baseBeverageInventoryId" TEXT,
      "productionFormulaId" TEXT,
      "sourceStorageTankId" TEXT,
      "sourceStorageEntryId" TEXT,
      "sourceLabel" TEXT NOT NULL,
      "liters" DECIMAL(65,30) NOT NULL,
      "brixSnapshot" DECIMAL(65,30) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FinalBeverageBlendComponent_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => null);

  await db.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlendComponent"
    ADD COLUMN IF NOT EXISTS "sourceStorageTankId" TEXT
  `).catch(() => null);
  await db.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlendComponent"
    ADD COLUMN IF NOT EXISTS "sourceStorageEntryId" TEXT
  `).catch(() => null);
}

export default async function ProductionPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;
  const user = await currentUser();
  const params = (await searchParams) || {};
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab = rawTab === "gasificado" || rawTab === "etiquetado" || rawTab === "formulas" ? rawTab : "bebida";

  if (role !== "admin" && role !== "vendedor") {
    redirect("/perfil");
  }

  await ensureProductionPhaseTable();
  await ensureFinalBeverageBlendTables();
  await ensureProductionColumns();

  const [tanks, storageTanks, storageEntries, productions, rawMaterials, locations, flavors, gasRows, labelRows, phaseRows, formulas, productionFormulaRefs, productionInputLitersRows, baseBeverageInventory, finalBlendRows, finalBlendComponentRows] = await Promise.all([
    db.tank.findMany({ orderBy: { createdAt: "asc" } }),
    db.$queryRawUnsafe(`
      SELECT
        st.*,
        COALESCE(SUM(se."litersRemaining"), 0) AS "currentLiters",
        COUNT(se."id") AS "sourceCount"
      FROM "BaseBeverageStorageTank" st
      LEFT JOIN "BaseBeverageStorageEntry" se ON se."storageTankId" = st."id"
      GROUP BY st."id"
      ORDER BY st."createdAt" DESC
    `).catch(() => []),
    db.$queryRawUnsafe(`
      SELECT
        se.*,
        st."id" AS storage_tank_id_ref,
        st."name" AS storage_tank_name
      FROM "BaseBeverageStorageEntry" se
      LEFT JOIN "BaseBeverageStorageTank" st ON st."id" = se."storageTankId"
      ORDER BY se."createdAt" ASC
    `).catch(() => []),
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
      SELECT "id", "inputLiters", "startedLiters"
      FROM "Production"
      WHERE "inputLiters" IS NOT NULL OR "startedLiters" IS NOT NULL
    `).catch(() => []),
    db.$queryRawUnsafe(`
      SELECT
        bbi.*,
        p."tankId" AS tank_id_ref,
        t.name AS tank_name,
        p.id AS production_id_ref,
        p.name AS production_name
      FROM "BaseBeverageInventory" bbi
      LEFT JOIN "Production" p ON p.id = bbi."productionId"
      LEFT JOIN "Tank" t ON t.id = p."tankId"
      ORDER BY bbi."createdAt" DESC
    `).catch(() => []),
    db.$queryRawUnsafe(`
      SELECT *
      FROM "FinalBeverageBlend"
      ORDER BY "createdAt" DESC
    `).catch(() => []),
    db.$queryRawUnsafe(`
      SELECT *
      FROM "FinalBeverageBlendComponent"
      ORDER BY "createdAt" ASC
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

  const storageEntriesByTank = new Map<string, any[]>();
  (storageEntries as any[]).forEach((entry) => {
    const list = storageEntriesByTank.get(entry.storageTankId) || [];
    list.push({
      ...entry,
      litersAdded: Number(entry.litersAdded || 0),
      litersRemaining: Number((entry.litersRemaining ?? entry.litersAdded) || 0),
      createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : String(entry.createdAt),
    });
    storageEntriesByTank.set(entry.storageTankId, list);
  });

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
  const startedLitersByProductionId = new Map<string, number>();
  (productionInputLitersRows as any[]).forEach((row) => {
    if (row.startedLiters != null) {
      startedLitersByProductionId.set(row.id, Number(row.startedLiters));
    }
  });

  const productionsWithPhases = productions.map((production: any) => {
    const productionFormulaId = formulaRefByProductionId.get(production.id);
    return {
      ...production,
      productionFormulaId: productionFormulaId || null,
      inputLiters: inputLitersByProductionId.get(production.id) ?? null,
      startedLiters: startedLitersByProductionId.get(production.id) ?? null,
      formula: productionFormulaId ? formulaById.get(productionFormulaId) || null : null,
      secondPhaseRecords: phasesByProductionId.get(production.id) || [],
    };
  });

  const finalBlendComponentsByBlendId = new Map<string, any[]>();
  (finalBlendComponentRows as any[]).forEach((row) => {
    const list = finalBlendComponentsByBlendId.get(row.blendId) || [];
    list.push(row);
    finalBlendComponentsByBlendId.set(row.blendId, list);
  });

  const finalBeverageBlends = (finalBlendRows as any[]).map((row) => ({
    ...row,
    components: finalBlendComponentsByBlendId.get(row.id) || [],
  }));

  const storageTanksWithEntries = (storageTanks as any[]).map((tank) => ({
    ...tank,
    currentLiters: Number(tank.currentLiters || 0),
    sourceCount: Number(tank.sourceCount || 0),
    entries: storageEntriesByTank.get(tank.id) || [],
  }));

  return (
    <div className="space-y-6">
      <ProductionWorkspace
      tanks={serialize(tanks)}
      storageTanks={serialize(storageTanksWithEntries)}
      productions={serialize(productionsWithPhases)}
        rawMaterials={serialize(rawMaterials)}
        locations={serialize(locations)}
        formulas={serialize(formulas)}
        flavors={serialize(flavors)}
        gasificationBatches={serialize(gasificationBatches)}
        labelingBatches={serialize(labelingBatches)}
        baseBeverageInventory={serialize(baseBeverageInventoryRows)}
        finalBeverageBlends={serialize(finalBeverageBlends)}
        initialTab={initialTab}
        userEmail={user?.emailAddresses[0]?.emailAddress || ""}
      />
    </div>
  );
}
