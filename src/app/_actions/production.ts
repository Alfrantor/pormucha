"use server";

import { randomUUID } from "crypto";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { db } from "@/lib/db";
import { formatProductionName } from "@/lib/production-naming";
import { revalidatePath } from "next/cache";

const DEFAULT_PIN = "1234";
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
type RawDbClient = {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<unknown>;
};

function isDecimalLike(value: unknown): value is { toNumber: () => number } {
  if (!value || typeof value !== "object") return false;
  return (
    "s" in value &&
    "e" in value &&
    "d" in value &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  );
}

async function ensureProductionPhaseTable(client: RawDbClient) {
  await client.$executeRawUnsafe(`
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
}

async function ensureBaseBeverageStorageTables(client: RawDbClient) {
  await client.$executeRawUnsafe(`
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

  await client.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "BaseBeverageStorageTank_name_key"
    ON "BaseBeverageStorageTank"("name")
  `).catch(() => null);

  await client.$executeRawUnsafe(`
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

  await client.$executeRawUnsafe(`
    ALTER TABLE "BaseBeverageStorageEntry"
    ADD COLUMN IF NOT EXISTS "litersRemaining" DECIMAL(65,30)
  `).catch(() => null);

  await client.$executeRawUnsafe(`
    UPDATE "BaseBeverageStorageEntry"
    SET "litersRemaining" = COALESCE("litersRemaining", "litersAdded")
  `).catch(() => null);

  await client.$executeRawUnsafe(`
    DROP INDEX IF EXISTS "BaseBeverageStorageEntry_baseBeverageInventoryId_key"
  `).catch(() => null);

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BaseBeverageStorageEntry_baseBeverageInventoryId_idx"
    ON "BaseBeverageStorageEntry"("baseBeverageInventoryId")
  `).catch(() => null);

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BaseBeverageStorageEntry_storageTankId_idx"
    ON "BaseBeverageStorageEntry"("storageTankId")
  `).catch(() => null);
}

async function ensureFinalBeverageBlendTables(client: RawDbClient) {
  await client.$executeRawUnsafe(`
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

  await client.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlend"
    ADD COLUMN IF NOT EXISTS "flavorId" TEXT
  `).catch(() => null);
  await client.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlend"
    ADD COLUMN IF NOT EXISTS "flavorName" TEXT
  `).catch(() => null);
  await client.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlend"
    ADD COLUMN IF NOT EXISTS "sugarGramsPerLiter" DECIMAL(65,30)
  `).catch(() => null);
  await client.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlend"
    ADD COLUMN IF NOT EXISTS "waterPercent" DECIMAL(65,30)
  `).catch(() => null);
  await client.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlend"
    ADD COLUMN IF NOT EXISTS "acidifierPercent" DECIMAL(65,30)
  `).catch(() => null);
  await client.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlend"
    ADD COLUMN IF NOT EXISTS "scoobyPercent" DECIMAL(65,30)
  `).catch(() => null);
  await client.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlend"
    ADD COLUMN IF NOT EXISTS "flavorPercent" DECIMAL(65,30)
  `).catch(() => null);

  await client.$executeRawUnsafe(`
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

  await client.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlendComponent"
    ADD COLUMN IF NOT EXISTS "sourceStorageTankId" TEXT
  `).catch(() => null);
  await client.$executeRawUnsafe(`
    ALTER TABLE "FinalBeverageBlendComponent"
    ADD COLUMN IF NOT EXISTS "sourceStorageEntryId" TEXT
  `).catch(() => null);

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "FinalBeverageBlend_status_idx"
    ON "FinalBeverageBlend"("status")
  `).catch(() => null);

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "FinalBeverageBlendComponent_blendId_idx"
    ON "FinalBeverageBlendComponent"("blendId")
  `).catch(() => null);
}

async function consumeFormulaInventoryForBlendTx(
  tx: RawDbClient,
  data: {
    productionFormulaId: string;
    liters: number;
    brixSnapshot: number;
    sourceLabel: string;
  }
): Promise<
  Array<{
    sourceType: "STORED_FORMULA";
    baseBeverageInventoryId: null;
    productionFormulaId: string;
    sourceStorageTankId: string;
    sourceStorageEntryId: string;
    sourceLabel: string;
    liters: number;
    brixSnapshot: number;
  }>
> {
  const formulaRows = await tx.$queryRaw<{
    id: string;
    storageTankId: string;
    storageTankName: string;
    litersRemaining: number | string | null;
    litersAdded: number | string | null;
    productionFormulaId: string | null;
    formulaLabel: string | null;
    formulaCode: string | null;
  }[]>`
    SELECT
      se."id",
      se."storageTankId",
      st."name" AS "storageTankName",
      se."litersRemaining",
      se."litersAdded",
      se."productionFormulaId",
      se."formulaLabel",
      pf."code" AS "formulaCode"
    FROM "BaseBeverageStorageEntry" se
    INNER JOIN "BaseBeverageStorageTank" st ON st."id" = se."storageTankId"
    LEFT JOIN "ProductionFormula" pf ON pf."id" = se."productionFormulaId"
    WHERE se."productionFormulaId" = ${data.productionFormulaId}
      AND COALESCE(se."litersRemaining", se."litersAdded") > 0
    ORDER BY se."createdAt" ASC
  `;

  const available = formulaRows.reduce(
    (sum, row) => sum + Number(row.litersRemaining ?? row.litersAdded ?? 0),
    0,
  );

  if (available < data.liters) {
    const label = formulaRows[0]?.formulaLabel || formulaRows[0]?.formulaCode || data.sourceLabel || "la fórmula seleccionada";
    throw new Error(`La fórmula ${label} solo tiene ${available.toLocaleString("es-MX")} Lt disponibles`);
  }

  let remainingToConsume = data.liters;
  const consumed: Array<{
    sourceType: "STORED_FORMULA";
    baseBeverageInventoryId: null;
    productionFormulaId: string;
    sourceStorageTankId: string;
    sourceStorageEntryId: string;
    sourceLabel: string;
    liters: number;
    brixSnapshot: number;
  }> = [];

  for (const row of formulaRows) {
    if (!(remainingToConsume > 0)) break;

    const availableFromRow = Number(row.litersRemaining ?? row.litersAdded ?? 0);
    if (!(availableFromRow > 0)) continue;

    const taken = Math.min(availableFromRow, remainingToConsume);
    const nextRemaining = Math.max(availableFromRow - taken, 0);

    await tx.$executeRaw`
      UPDATE "BaseBeverageStorageEntry"
      SET "litersRemaining" = ${nextRemaining}
      WHERE "id" = ${row.id}
    `;

    consumed.push({
      sourceType: "STORED_FORMULA",
      baseBeverageInventoryId: null,
      productionFormulaId: data.productionFormulaId,
      sourceStorageTankId: row.storageTankId,
      sourceStorageEntryId: row.id,
      sourceLabel: `${row.formulaLabel || row.formulaCode || data.sourceLabel} · ${row.storageTankName}`,
      liters: taken,
      brixSnapshot: data.brixSnapshot,
    });

    remainingToConsume -= taken;
  }

  return consumed;
}

async function resolveLatestBrixForBaseLot(client: RawDbClient, productionId: string): Promise<number | null> {
  const parameterRows = await client.$queryRaw<{ brix: number | string | null }[]>`
    SELECT "brix"
    FROM "ProductionParameter"
    WHERE "productionId" = ${productionId}
      AND "brix" IS NOT NULL
    ORDER BY "measuredAt" DESC
    LIMIT 1
  `.catch(() => []);

  const parameterBrix = parameterRows[0]?.brix;
  if (parameterBrix != null) {
    return Number(parameterBrix);
  }

  await ensureProductionPhaseTable(client);
  const phaseRows = await client.$queryRaw<{ brix: number | string | null }[]>`
    SELECT "brix"
    FROM "ProductionPhaseRecord"
    WHERE "productionId" = ${productionId}
      AND "brix" IS NOT NULL
    ORDER BY "measuredAt" DESC
    LIMIT 1
  `.catch(() => []);

  const phaseBrix = phaseRows[0]?.brix;
  return phaseBrix != null ? Number(phaseBrix) : null;
}

export async function getProduccionPin(): Promise<string> {
  try {
    const { userId } = await auth();
    if (!userId) return DEFAULT_PIN;
    const user = await clerk.users.getUser(userId);
    return ((user.privateMetadata as any)?.productionPin as string | undefined) || DEFAULT_PIN;
  } catch {
    return DEFAULT_PIN;
  }
}

export async function setProduccionPin(pin: string): Promise<{ success: boolean; error?: string }> {
  if (!pin || pin.length < 4) return { success: false, error: "El PIN debe tener al menos 4 caracteres" };
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Debes iniciar sesion para configurar tu PIN" };
  const user = await clerk.users.getUser(userId);
  await clerk.users.updateUserMetadata(userId, {
    privateMetadata: {
      ...(user.privateMetadata || {}),
      productionPin: pin,
    },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function validatePin(pin: string): Promise<{ ok: boolean; recordedBy?: string; error?: string }> {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return { ok: false, error: "Debes iniciar sesion para registrar mediciones" };
  }

  const correct = await getProduccionPin();
  if (pin !== correct) {
    return { ok: false, error: "PIN incorrecto" };
  }

  const recordedBy =
    user.emailAddresses[0]?.emailAddress ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    userId;

  return { ok: true, recordedBy };
}

export async function getTankWithProduction(tankId: string) {
  try {
    const tank = await db.tank.findUnique({
      where: { id: tankId },
      include: {
        productions: {
          where: { status: "IN_PROGRESS" },
          include: {
            ingredients: { include: { rawMaterial: true } },
            additions: { include: { rawMaterial: true } },
            parameters: { orderBy: { measuredAt: "desc" } },
          },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    });
    if (!tank) return null;

    const serialize = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (obj instanceof Date) return obj.toISOString();
      if (typeof obj === "bigint") return Number(obj);
      if (isDecimalLike(obj)) return obj.toNumber();
      if (Array.isArray(obj)) return obj.map(serialize);
      if (typeof obj === "object") {
        return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, serialize(v)]));
      }
      return obj;
    };

    return serialize(tank);
  } catch {
    return null;
  }
}

// ─── TANQUES ──────────────────────────────────────────────────────────────────

export async function createTank(formData: FormData) {
  const name = formData.get("name") as string;
  const capacityLt = formData.get("capacityLt");

  if (!name?.trim()) return { error: "El nombre es requerido" };

  await db.tank.create({
    data: {
      name: name.trim(),
      capacityLt: capacityLt ? Number(capacityLt) : null,
    },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function updateTank(formData: FormData) {
  try {
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const capacityLt = formData.get("capacityLt");
    const isActive = formData.get("isActive") === "true";

    await db.tank.update({
      where: { id },
      data: {
        name: name.trim(),
        capacityLt: capacityLt ? Number(capacityLt) : null,
        isActive,
      },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "No se pudo actualizar la cubeta" };
  }
}

// ─── PRODUCCIÓN ───────────────────────────────────────────────────────────────

export interface IngredientInput {
  rawMaterialId: string;
  quantity: number;
  locationId?: string;
}

export async function createProduction(
  data: {
    name?: string;
    productType: string;
    productionFormulaId?: string;
    tankId: string;
    startedAt: string;
    inputLiters?: number;
    startedLiters?: number;
    notes?: string;
    createdBy?: string;
    ingredients: IngredientInput[];
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { productType, productionFormulaId, tankId, startedAt, inputLiters, startedLiters, notes, createdBy, ingredients } = data;

  if (!tankId) return { success: false, error: "Selecciona una cubeta" };
  if (!startedAt) return { success: false, error: "La fecha de inicio es requerida" };

  try {
    const production = await db.$transaction(async (tx) => {
      const tank = await tx.tank.findUnique({
        where: { id: tankId },
        select: { id: true, name: true, isActive: true },
      });

      if (!tank) {
        throw new Error("La cubeta seleccionada no existe");
      }

      if (!tank.isActive) {
        throw new Error("La cubeta seleccionada esta inactiva");
      }

      const activeProduction = await tx.production.findFirst({
        where: {
          tankId,
          status: "IN_PROGRESS",
        },
        select: { id: true, name: true },
      });

      if (activeProduction) {
        throw new Error(`La cubeta ya esta ocupada por el proceso ${activeProduction.name}`);
      }

      const heldInventoryRows = await tx.$queryRaw<{ id: string; productionId: string }[]>`
        SELECT "id", "productionId"
        FROM "BaseBeverageInventory"
        WHERE "tankId" = ${tankId}
          AND "status" IN ('HELD', 'AVAILABLE', 'MIX_PENDING', 'DISPATCHED')
        LIMIT 1
      `.catch(() => []);

      if (heldInventoryRows.length > 0) {
        throw new Error("La cubeta sigue ocupada con bebida base. Debes vaciarla antes de iniciar otro proceso.");
      }

      const productionName = formatProductionName(startedAt, tank.name, productType);

      const prod = await tx.production.create({
        data: {
          name: productionName,
          productType,
          tankId,
          startedAt: new Date(startedAt),
          notes: notes?.trim() || null,
          createdBy: createdBy || null,
          ingredients: {
            create: ingredients.map((ing) => ({
              rawMaterialId: ing.rawMaterialId,
              quantity: ing.quantity,
              locationId: ing.locationId || null,
            })),
          },
        },
      });

      if (productionFormulaId) {
        await tx.$executeRaw`
          UPDATE "Production"
          SET "productionFormulaId" = ${productionFormulaId}
          WHERE "id" = ${prod.id}
        `;
      }

      if (inputLiters != null) {
        await tx.$executeRawUnsafe(`
          ALTER TABLE "Production"
          ADD COLUMN IF NOT EXISTS "inputLiters" DECIMAL(65,30)
        `).catch(() => null);

        await tx.$executeRawUnsafe(`
          ALTER TABLE "Production"
          ADD COLUMN IF NOT EXISTS "startedLiters" DECIMAL(65,30)
        `).catch(() => null);

        await tx.$executeRaw`
          UPDATE "Production"
          SET "inputLiters" = ${inputLiters}
          WHERE "id" = ${prod.id}
        `;

        if (startedLiters != null) {
          await tx.$executeRaw`
            UPDATE "Production"
            SET "startedLiters" = ${startedLiters}
            WHERE "id" = ${prod.id}
          `;
        }
      }

      // Descontar insumos del inventario de MP
      for (const ing of ingredients) {
        if (!ing.locationId) continue;

        const stock = await tx.rawMaterialStock.findUnique({
          where: { rawMaterialId_locationId: { rawMaterialId: ing.rawMaterialId, locationId: ing.locationId } },
        });

        const currentQty = Number(stock?.quantity ?? 0);
        if (currentQty < ing.quantity) {
          throw new Error(`Stock insuficiente para un insumo`);
        }

        await tx.rawMaterialStock.upsert({
          where: { rawMaterialId_locationId: { rawMaterialId: ing.rawMaterialId, locationId: ing.locationId } },
          update: { quantity: { decrement: ing.quantity } },
          create: { rawMaterialId: ing.rawMaterialId, locationId: ing.locationId, quantity: 0 },
        });

        await tx.rawMaterialMovement.create({
          data: {
            rawMaterialId: ing.rawMaterialId,
            locationId: ing.locationId,
            type: "OUT",
            quantity: ing.quantity,
            reason: `Produccion: ${productionName}`,
            userId: createdBy || null,
          },
        });
      }

      return prod;
    });

    revalidatePath("/admin");
    return { success: true, id: production.id };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al crear la producción" };
  }
}

export async function addProductionIngredient(
  data: {
    productionId: string;
    rawMaterialId: string;
    quantity: number;
    locationId?: string;
    notes?: string;
    addedBy?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const { productionId, rawMaterialId, quantity, locationId, notes, addedBy } = data;

  try {
    await db.$transaction(async (tx) => {
      await tx.productionAddition.create({
        data: {
          productionId,
          rawMaterialId,
          quantity,
          locationId: locationId || null,
          notes: notes?.trim() || null,
          addedBy: addedBy || null,
        },
      });

      if (locationId) {
        const stock = await tx.rawMaterialStock.findUnique({
          where: { rawMaterialId_locationId: { rawMaterialId, locationId } },
        });

        const currentQty = Number(stock?.quantity ?? 0);
        if (currentQty < quantity) throw new Error("Stock insuficiente");

        await tx.rawMaterialStock.upsert({
          where: { rawMaterialId_locationId: { rawMaterialId, locationId } },
          update: { quantity: { decrement: quantity } },
          create: { rawMaterialId, locationId, quantity: 0 },
        });

        await tx.rawMaterialMovement.create({
          data: {
            rawMaterialId,
            locationId,
            type: "OUT",
            quantity,
            reason: `Adición en producción`,
            userId: addedBy || null,
          },
        });
      }
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al registrar adición" };
  }
}

export async function recordProductionParameter(
  data: {
    productionId: string;
    ph?: number;
    brix?: number;
    temperature?: number;
    acidity?: number;
    notes?: string;
    recordedBy?: string;
    measuredAt?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const { productionId, ph, brix, temperature, acidity, notes, recordedBy, measuredAt } = data;

  try {
    const user = await currentUser().catch(() => null);
    const derivedRecordedBy =
      user?.emailAddresses?.[0]?.emailAddress ||
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      recordedBy ||
      null;

    await db.productionParameter.create({
      data: {
        productionId,
        ph: ph != null ? ph : null,
        brix: brix != null ? brix : null,
        temperature: temperature != null ? temperature : null,
        acidity: acidity != null ? acidity : null,
        notes: notes?.trim() || null,
        recordedBy: derivedRecordedBy,
        measuredAt: measuredAt ? new Date(measuredAt) : new Date(),
      },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al registrar parámetros" };
  }
}

export async function completeProduction(
  productionId: string,
  litersProduced: number,
  notes?: string,
  allocations?: Array<{
    storageTankId: string;
    liters: number;
  }>,
  destination: "BUCKET" | "STORAGE_TANK" = "BUCKET"
): Promise<{ success: boolean; inventoryId?: string; error?: string }> {
  try {
    let createdInventoryId: string | null = null;

    await db.$transaction(async (tx) => {
      await ensureProductionPhaseTable(tx as typeof db);

      const productionRows = await tx.$queryRaw<{
        id: string;
        productType: string;
        tankId: string | null;
        inputLiters: number | string | null;
        startedLiters: number | string | null;
        notes: string | null;
      }[]>`
        SELECT "id", "productType", "tankId", "inputLiters", "startedLiters", "notes"
        FROM "Production"
        WHERE "id" = ${productionId}
        LIMIT 1
      `;

      const production = productionRows[0];

      if (!production) {
        throw new Error("La produccion no existe");
      }

      const phaseThreeRows = await tx.$queryRaw<{ remainingLiters: number | string | null }[]>`
        SELECT "remainingLiters"
        FROM "ProductionPhaseRecord"
        WHERE "productionId" = ${productionId}
          AND "phase" = 3
        ORDER BY "measuredAt" DESC
        LIMIT 1
      `;

      const remainingLitersValue = phaseThreeRows[0]?.remainingLiters;
      const remainingLiters = remainingLitersValue != null ? Number(remainingLitersValue) : null;
      const keepInBucket = destination === "BUCKET";
      const inventoryStatus = keepInBucket ? "AVAILABLE" : "HELD";

      if (!keepInBucket && (!Array.isArray(allocations) || allocations.length === 0)) {
        throw new Error("Selecciona al menos un tanque de resguardo o elige dejar el producto en la cubeta");
      }

      await tx.production.update({
        where: { id: productionId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          litersProduced,
          notes,
        },
      });

      await tx.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "BaseBeverageInventory" (
          "id" TEXT NOT NULL,
          "productionId" TEXT NOT NULL,
          "productType" TEXT NOT NULL,
          "tankId" TEXT,
          "litersEntered" DECIMAL(65,30),
          "litersProduced" DECIMAL(65,30) NOT NULL,
          "litersRemaining" DECIMAL(65,30),
          "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "BaseBeverageInventory_pkey" PRIMARY KEY ("id")
        )
      `);

      await tx.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "BaseBeverageInventory_productionId_key"
        ON "BaseBeverageInventory"("productionId")
      `);

      await tx.$executeRaw`
        INSERT INTO "BaseBeverageInventory"
        ("id","productionId","productType","tankId","litersEntered","litersProduced","litersRemaining","status","notes","createdAt","updatedAt")
        VALUES
        (${randomUUID()}, ${productionId}, ${production.productType}, ${keepInBucket ? production.tankId : null}, ${production.startedLiters != null ? Number(production.startedLiters) : production.inputLiters != null ? Number(production.inputLiters) : null}, ${litersProduced}, ${remainingLiters}, ${inventoryStatus}, ${notes?.trim() || production.notes || null}, NOW(), NOW())
        ON CONFLICT ("productionId")
        DO UPDATE SET
          "tankId" = EXCLUDED."tankId",
          "litersEntered" = EXCLUDED."litersEntered",
          "litersProduced" = EXCLUDED."litersProduced",
          "litersRemaining" = EXCLUDED."litersRemaining",
          "status" = EXCLUDED."status",
          "notes" = EXCLUDED."notes",
          "updatedAt" = NOW()
      `;

      const inventoryRows = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "BaseBeverageInventory"
        WHERE "productionId" = ${productionId}
        LIMIT 1
      `;

      createdInventoryId = inventoryRows[0]?.id || null;

      if (!keepInBucket && createdInventoryId && Array.isArray(allocations) && allocations.length > 0) {
        await allocateBaseBeverageInventoryToStorageTanksTx(tx, {
          inventoryId: createdInventoryId,
          allocations,
          notes,
        });
      }
    });

    revalidatePath("/admin");
    revalidatePath("/admin/production");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/base-beverage");
    return { success: true, inventoryId: createdInventoryId || undefined };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al completar la producción" };
  }
}

export async function emptyBaseBeverageContainer(inventoryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.$executeRawUnsafe(`
      ALTER TABLE "BaseBeverageInventory"
      ADD COLUMN IF NOT EXISTS "emptiedAt" TIMESTAMP(3)
    `).catch(() => null);

    await db.$executeRaw`
      UPDATE "BaseBeverageInventory"
      SET "status" = 'EMPTIED',
          "emptiedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE "id" = ${inventoryId}
    `;

    revalidatePath("/admin/production");
    revalidatePath("/admin/inventory/base-beverage");
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al vaciar la cubeta" };
  }
}

export async function createBaseBeverageStorageTank(data: {
  name: string;
  capacityLt?: number | null;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.name.trim()) {
      return { success: false, error: "El nombre de la cubeta es obligatorio" };
    }

    await ensureBaseBeverageStorageTables(db);

    await db.$executeRaw`
      INSERT INTO "BaseBeverageStorageTank"
      ("id","name","capacityLt","notes","createdAt","updatedAt")
      VALUES
      (${randomUUID()}, ${data.name.trim()}, ${data.capacityLt ?? null}, ${data.notes?.trim() || null}, NOW(), NOW())
    `;

    revalidatePath("/admin/inventory/base-beverage");
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "No se pudo crear el tanque de resguardo" };
  }
}

export async function updateBaseBeverageStorageTank(data: {
  id: string;
  name: string;
  capacityLt?: number | null;
  notes?: string;
  isActive?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.id) {
      return { success: false, error: "Falta el identificador del tanque de resguardo" };
    }
    if (!data.name.trim()) {
      return { success: false, error: "El nombre del tanque de resguardo es obligatorio" };
    }

    await ensureBaseBeverageStorageTables(db);

    await db.$executeRaw`
      UPDATE "BaseBeverageStorageTank"
      SET "name" = ${data.name.trim()},
          "capacityLt" = ${data.capacityLt ?? null},
          "notes" = ${data.notes?.trim() || null},
          "isActive" = ${data.isActive ?? true},
          "updatedAt" = NOW()
      WHERE "id" = ${data.id}
    `;

    revalidatePath("/admin/catalog/tanks");
    revalidatePath("/admin/inventory/base-beverage");
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "No se pudo actualizar el tanque de resguardo" };
  }
}

export async function unifyBaseBeverageInventoryLots(data: {
  storageTankId: string;
  inventoryIds: string[];
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.storageTankId) {
      return { success: false, error: "Selecciona el tanque de resguardo" };
    }

    const inventoryIds = Array.from(new Set((data.inventoryIds || []).filter(Boolean)));
    if (inventoryIds.length === 0) {
      return { success: false, error: "Selecciona al menos un lote para unificar" };
    }

    await db.$transaction(async (tx) => {
      await ensureBaseBeverageStorageTables(tx as typeof db);

      const tanks = await tx.$queryRaw<{
        id: string;
        name: string;
        formulaCode: string | null;
        capacityLt: number | string | null;
        isActive: boolean;
      }[]>`
        SELECT "id","name","formulaCode","capacityLt","isActive"
        FROM "BaseBeverageStorageTank"
        WHERE "id" = ${data.storageTankId}
        LIMIT 1
      `;

      const storageTank = tanks[0];
      if (!storageTank) {
        throw new Error("El tanque de resguardo no existe");
      }
      if (!storageTank.isActive) {
        throw new Error("El tanque de resguardo está inactivo");
      }

      const rows = await tx.$queryRawUnsafe<{
        id: string;
        productionId: string;
        productType: string;
        litersRemaining: number | string | null;
        productionFormulaId: string | null;
        formulaCode: string | null;
        formulaName: string | null;
      }[]>(`
        SELECT
          bbi."id",
          bbi."productionId",
          bbi."productType",
          bbi."litersRemaining",
          p."productionFormulaId",
          pf."code" AS "formulaCode",
          pf."name" AS "formulaName"
        FROM "BaseBeverageInventory" bbi
        INNER JOIN "Production" p ON p."id" = bbi."productionId"
        LEFT JOIN "ProductionFormula" pf ON pf."id" = p."productionFormulaId"
        WHERE bbi."id" IN (${inventoryIds.map((id) => `'${id}'`).join(",")})
      `);

      if (rows.length !== inventoryIds.length) {
        throw new Error("Uno o más lotes seleccionados ya no existen");
      }

      const validRows = rows.filter((row) => Number(row.litersRemaining || 0) > 0);
      if (validRows.length !== rows.length) {
        throw new Error("Todos los lotes deben tener litros remanentes para unificarse");
      }

      const firstFormulaKey = validRows[0]?.productionFormulaId || validRows[0]?.productType;
      const sameFormula = validRows.every(
        (row) => (row.productionFormulaId || row.productType) === firstFormulaKey,
      );
      if (!sameFormula) {
        throw new Error("Solo puedes unificar procesos de la misma fórmula");
      }

      const resolvedFormulaCode = validRows[0]?.formulaCode || validRows[0]?.productType || null;
      const resolvedFormulaName = validRows[0]?.formulaName || validRows[0]?.productType || null;

      if (storageTank.formulaCode && resolvedFormulaCode && storageTank.formulaCode !== resolvedFormulaCode) {
        throw new Error("Ese tanque de resguardo ya está asignado a otra fórmula");
      }

      const currentVolumeRows = await tx.$queryRaw<{ total: number | string | null }[]>`
        SELECT COALESCE(SUM("litersRemaining"), 0) AS total
        FROM "BaseBeverageStorageEntry"
        WHERE "storageTankId" = ${data.storageTankId}
      `;

      const currentVolume = Number(currentVolumeRows[0]?.total || 0);
      const litersToAdd = validRows.reduce((sum, row) => sum + Number(row.litersRemaining || 0), 0);
      const capacityLt = storageTank.capacityLt != null ? Number(storageTank.capacityLt) : null;

      if (capacityLt != null && currentVolume + litersToAdd > capacityLt) {
        throw new Error(`La capacidad del tanque de resguardo no alcanza. Disponible: ${Math.max(capacityLt - currentVolume, 0)} Lt`);
      }

      for (const row of validRows) {
        await tx.$executeRaw`
          INSERT INTO "BaseBeverageStorageEntry"
          ("id","storageTankId","baseBeverageInventoryId","productionId","productType","productionFormulaId","formulaLabel","litersAdded","litersRemaining","notes","createdAt")
          VALUES
          (${randomUUID()}, ${data.storageTankId}, ${row.id}, ${row.productionId}, ${row.productType}, ${row.productionFormulaId}, ${resolvedFormulaName}, ${Number(row.litersRemaining || 0)}, ${Number(row.litersRemaining || 0)}, ${data.notes?.trim() || null}, NOW())
        `;

        await tx.$executeRaw`
          UPDATE "BaseBeverageInventory"
          SET "litersRemaining" = 0,
              "status" = 'UNIFIED',
              "notes" = ${data.notes?.trim() || null},
              "updatedAt" = NOW()
          WHERE "id" = ${row.id}
        `;
      }

      await tx.$executeRaw`
        UPDATE "BaseBeverageStorageTank"
        SET "formulaCode" = ${resolvedFormulaCode},
            "formulaName" = ${resolvedFormulaName},
            "updatedAt" = NOW()
        WHERE "id" = ${data.storageTankId}
      `;
    });

    revalidatePath("/admin/inventory/base-beverage");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/production");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "No se pudieron unificar los lotes" };
  }
}

export async function allocateBaseBeverageInventoryToStorageTanks(data: {
  inventoryId: string;
  allocations: Array<{
    storageTankId: string;
    liters: number;
  }>;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await db.$transaction(async (tx) => {
      await allocateBaseBeverageInventoryToStorageTanksTx(tx, data);
    });

    revalidatePath("/admin/inventory/base-beverage");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/production");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "No se pudo asignar el lote a los tanques" };
  }
}

async function allocateBaseBeverageInventoryToStorageTanksTx(
  tx: RawDbClient,
  data: {
    inventoryId: string;
    allocations: Array<{
      storageTankId: string;
      liters: number;
    }>;
    notes?: string;
  }
) {
  if (!data.inventoryId) {
    throw new Error("Selecciona un lote de bebida base");
  }

  const allocations = (data.allocations || [])
    .map((entry) => ({
      storageTankId: entry.storageTankId,
      liters: Number(entry.liters || 0),
    }))
    .filter((entry) => entry.storageTankId && entry.liters > 0);

  if (allocations.length === 0) {
    throw new Error("Agrega al menos un tanque con litros a mover");
  }

  const totalToAllocate = allocations.reduce((sum, entry) => sum + entry.liters, 0);
  if (!(totalToAllocate > 0)) {
    throw new Error("Los litros a mover deben ser mayores a cero");
  }

  await ensureBaseBeverageStorageTables(tx as typeof db);

  const inventoryRows = await tx.$queryRaw<{
    id: string;
    productType: string;
    litersRemaining: number | string | null;
    status: string;
    productionId: string;
    productionFormulaId: string | null;
    formulaCode: string | null;
    formulaName: string | null;
    productionName: string | null;
  }[]>`
    SELECT
      bbi."id",
      bbi."productType",
      bbi."litersRemaining",
      bbi."status",
      p."id" AS "productionId",
      p."productionFormulaId",
      pf."code" AS "formulaCode",
      pf."name" AS "formulaName",
      p."name" AS "productionName"
    FROM "BaseBeverageInventory" bbi
    INNER JOIN "Production" p ON p."id" = bbi."productionId"
    LEFT JOIN "ProductionFormula" pf ON pf."id" = p."productionFormulaId"
    WHERE bbi."id" = ${data.inventoryId}
    LIMIT 1
  `;

  const inventory = inventoryRows[0];
  if (!inventory) {
    throw new Error("El lote seleccionado no existe");
  }

  const remainingLiters = Number(inventory.litersRemaining || 0);
  if (remainingLiters <= 0) {
    throw new Error("Este lote ya no tiene litros remanentes");
  }

  if (totalToAllocate > remainingLiters) {
    throw new Error(`No puedes mover más litros de los disponibles. Disponibles: ${remainingLiters.toLocaleString("es-MX")} Lt`);
  }

  const sqlList = (ids: string[]) =>
    ids
      .map((id) => `'${String(id).replace(/'/g, "''")}'`)
      .join(",");

  const selectedTankIds = Array.from(new Set(allocations.map((entry) => entry.storageTankId)));
  const tanks = await tx.$queryRawUnsafe<{
    id: string;
    name: string;
    formulaCode: string | null;
    formulaName: string | null;
    capacityLt: number | string | null;
    isActive: boolean;
  }[]>(`
    SELECT "id","name","formulaCode","formulaName","capacityLt","isActive"
    FROM "BaseBeverageStorageTank"
    WHERE "id" IN (${sqlList(selectedTankIds)})
  `);

  if (tanks.length !== selectedTankIds.length) {
    throw new Error("Uno o más tanques seleccionados no existen");
  }

  const currentVolumeRows = await tx.$queryRawUnsafe<{
    storageTankId: string;
    total: number | string | null;
  }[]>(`
    SELECT "storageTankId", COALESCE(SUM("litersRemaining"), 0) AS total
    FROM "BaseBeverageStorageEntry"
    WHERE "storageTankId" IN (${sqlList(selectedTankIds)})
    GROUP BY "storageTankId"
  `);

  const currentVolumeByTank = new Map<string, number>();
  currentVolumeRows.forEach((row) => {
    currentVolumeByTank.set(row.storageTankId, Number(row.total || 0));
  });

  const tankById = new Map<string, (typeof tanks)[number]>();
  tanks.forEach((tank) => tankById.set(tank.id, tank));

  for (const allocation of allocations) {
    const tank = tankById.get(allocation.storageTankId);
    if (!tank) {
      throw new Error("El tanque de resguardo no existe");
    }
    if (!tank.isActive) {
      throw new Error(`El tanque ${tank.name} está inactivo`);
    }

    const capacityLt = tank.capacityLt != null ? Number(tank.capacityLt) : null;
    const currentVolume = currentVolumeByTank.get(tank.id) || 0;
    if (capacityLt != null && currentVolume + allocation.liters > capacityLt) {
      throw new Error(`La capacidad del tanque ${tank.name} no alcanza. Disponible: ${Math.max(capacityLt - currentVolume, 0)} Lt`);
    }

    if (tank.formulaCode && inventory.formulaCode && tank.formulaCode !== inventory.formulaCode) {
      throw new Error(`El tanque ${tank.name} ya está asignado a otra fórmula`);
    }
  }

  for (const allocation of allocations) {
    await tx.$executeRaw`
      INSERT INTO "BaseBeverageStorageEntry"
      ("id","storageTankId","baseBeverageInventoryId","productionId","productType","productionFormulaId","formulaLabel","litersAdded","litersRemaining","notes","createdAt")
      VALUES
      (${randomUUID()}, ${allocation.storageTankId}, ${data.inventoryId}, ${inventory.productionId}, ${inventory.productType}, ${inventory.productionFormulaId}, ${inventory.formulaName || inventory.productType}, ${allocation.liters}, ${allocation.liters}, ${data.notes?.trim() || null}, NOW())
    `;
  }

  const nextRemaining = Math.max(remainingLiters - totalToAllocate, 0);
  const nextStatus = nextRemaining === 0 ? "UNIFIED" : inventory.status === "MIX_PENDING" ? "MIX_PENDING" : "AVAILABLE";

  await tx.$executeRaw`
    UPDATE "BaseBeverageInventory"
    SET "litersRemaining" = ${nextRemaining},
        "status" = ${nextStatus},
        "notes" = ${data.notes?.trim() || null},
        "updatedAt" = NOW()
    WHERE "id" = ${data.inventoryId}
  `;

  for (const allocation of allocations) {
    const tank = tankById.get(allocation.storageTankId);
    if (!tank) continue;
    await tx.$executeRaw`
      UPDATE "BaseBeverageStorageTank"
      SET "formulaCode" = ${inventory.formulaCode || null},
          "formulaName" = ${inventory.formulaName || null},
          "updatedAt" = NOW()
      WHERE "id" = ${tank.id}
    `;
  }
}

export async function updateBaseBeverageInventoryDisposition(
  inventoryId: string,
  disposition: "HELD" | "MIX_PENDING" | "DISPATCHED" | "AVAILABLE",
  exitReading?: {
    brix: number;
    temperature: number;
    ph: number;
    acidity: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const allowedStatuses = new Set(["HELD", "MIX_PENDING", "DISPATCHED", "AVAILABLE"]);

  if (!allowedStatuses.has(disposition)) {
    return { success: false, error: "Estado de inventario no valido" };
  }

  try {
    await db.$executeRawUnsafe(`
      ALTER TABLE "BaseBeverageInventory"
      ADD COLUMN IF NOT EXISTS "exitBrix" DECIMAL(65,30),
      ADD COLUMN IF NOT EXISTS "exitTemperature" DECIMAL(65,30),
      ADD COLUMN IF NOT EXISTS "exitPh" DECIMAL(65,30),
      ADD COLUMN IF NOT EXISTS "exitAcidity" DECIMAL(65,30),
      ADD COLUMN IF NOT EXISTS "exitMeasuredAt" TIMESTAMP(3)
    `);

    if (disposition === "DISPATCHED") {
      const values = [exitReading?.brix, exitReading?.temperature, exitReading?.ph, exitReading?.acidity];
      if (values.some((value) => value == null || !Number.isFinite(value))) {
        return { success: false, error: "Registra Brix, temperatura, pH y acidez antes de marcar la salida" };
      }

      await db.$executeRaw`
        UPDATE "BaseBeverageInventory"
        SET "status" = ${disposition},
            "exitBrix" = ${exitReading!.brix},
            "exitTemperature" = ${exitReading!.temperature},
            "exitPh" = ${exitReading!.ph},
            "exitAcidity" = ${exitReading!.acidity},
            "exitMeasuredAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "id" = ${inventoryId}
      `;
    } else {
      await db.$executeRaw`
        UPDATE "BaseBeverageInventory"
        SET "status" = ${disposition},
            "updatedAt" = NOW()
        WHERE "id" = ${inventoryId}
      `;
    }

    revalidatePath("/admin/production");
    revalidatePath("/admin/inventory/base-beverage");
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al actualizar el destino del lote" };
  }
}

export async function createFinalBeverageBlend(data: {
  name: string;
  flavorId?: string;
  flavorName?: string;
  targetBrix: number;
  sugarGramsPerLiter?: number;
  waterPercent?: number;
  acidifierPercent?: number;
  scoobyPercent?: number;
  flavorPercent?: number;
  notes?: string;
  createdBy?: string;
  components: Array<{
    sourceType: "BASE_LOT" | "FLAVOR_RECIPE" | "STORED_FORMULA";
    baseBeverageInventoryId?: string;
    productionFormulaId?: string;
    sourceStorageEntryId?: string;
    liters: number;
    brix?: number;
  }>;
}): Promise<{
  success: boolean;
  error?: string;
  blend?: {
    id: string;
    weightedBrix: number;
    targetBrix: number;
    sugarToAddKg: number;
    totalLiters: number;
  };
}> {
  try {
    if (!data.name.trim()) {
      return { success: false, error: "El nombre del lote final es obligatorio" };
    }
    if (!Number.isFinite(data.targetBrix) || data.targetBrix < 0) {
      return { success: false, error: "El brix objetivo no es válido" };
    }

    const providedBlendPercents = [data.acidifierPercent, data.scoobyPercent, data.flavorPercent, data.waterPercent].filter(
      (value) => value != null && Number.isFinite(value),
    );
    const totalBlendPercent =
      Number(data.acidifierPercent || 0) +
      Number(data.scoobyPercent || 0) +
      Number(data.flavorPercent || 0) +
      Number(data.waterPercent || 0);
    if (providedBlendPercents.length > 0 && Math.abs(totalBlendPercent - 100) > 0.01) {
      return { success: false, error: "La mezcla del blend debe sumar 100%" };
    }

    const requestedComponents = (data.components || []).filter((component) => Number(component.liters) > 0);
    if (requestedComponents.length === 0) {
      return { success: false, error: "Agrega al menos un componente para la bebida final" };
    }

    const blend = await db.$transaction(async (tx) => {
      await ensureFinalBeverageBlendTables(tx as typeof db);
      await ensureProductionPhaseTable(tx as typeof db);

      let linkedFlavorId: string | null = null;
      let linkedFlavorName: string | null = null;
      if (data.flavorId) {
        const flavorRows = await tx.$queryRaw<{ id: string; name: string }[]>`
          SELECT "id","name"
          FROM "Flavor"
          WHERE "id" = ${data.flavorId}
          LIMIT 1
        `;
        const flavor = flavorRows[0];
        if (!flavor) {
          throw new Error("El sabor ligado al blend ya no existe");
        }
        linkedFlavorId = flavor.id;
        linkedFlavorName = flavor.name;
      } else if (data.flavorName?.trim()) {
        linkedFlavorName = data.flavorName.trim();
      }

      const preparedComponents: Array<{
        sourceType: "BASE_LOT" | "STORED_FORMULA";
        baseBeverageInventoryId: string | null;
        productionFormulaId: string | null;
        sourceStorageTankId: string | null;
        sourceStorageEntryId: string | null;
        sourceLabel: string;
        liters: number;
        brixSnapshot: number;
      }> = [];

      for (const component of requestedComponents) {
        if (component.sourceType === "BASE_LOT") {
          if (!component.baseBeverageInventoryId) {
            throw new Error("Falta seleccionar un lote de bebida base");
          }

          const rows = await tx.$queryRaw<{
            id: string;
            productionId: string;
            litersRemaining: number | string | null;
            status: string;
            productionName: string | null;
            formulaName: string | null;
            formulaCode: string | null;
            recipeType: string | null;
          }[]>`
            SELECT
              bbi."id",
              bbi."productionId",
              bbi."litersRemaining",
              bbi."status",
              p."name" AS "productionName",
              pf."name" AS "formulaName",
              pf."code" AS "formulaCode",
              pf."recipeType"
            FROM "BaseBeverageInventory" bbi
            INNER JOIN "Production" p ON p."id" = bbi."productionId"
            LEFT JOIN "ProductionFormula" pf ON pf."id" = p."productionFormulaId"
            WHERE bbi."id" = ${component.baseBeverageInventoryId}
            LIMIT 1
          `;

          const lot = rows[0];
          if (!lot) {
            throw new Error("Uno de los lotes base seleccionados ya no existe");
          }
          if (lot.recipeType !== "ACIDIFIER" && lot.recipeType !== "SCOOBY") {
            throw new Error("Lote base solo permite acidificante o scooby. Usa Receta sabor para saborizantes");
          }

          const remaining = Number(lot.litersRemaining || 0);
          if (!(remaining > 0)) {
            throw new Error(`El lote ${lot.productionName || lot.id} ya no tiene litros disponibles`);
          }
          if (Number(component.liters) > remaining) {
            throw new Error(`El lote ${lot.productionName || lot.id} solo tiene ${remaining} Lt disponibles`);
          }

          const manualBrix = component.brix != null && Number.isFinite(Number(component.brix)) ? Number(component.brix) : null;
          const currentBrix = manualBrix ?? (await resolveLatestBrixForBaseLot(tx as typeof db, lot.productionId));
          if (currentBrix == null) {
            throw new Error(`El lote ${lot.productionName || lot.id} no tiene una medición de brix registrada`);
          }

          const newRemaining = Math.max(remaining - Number(component.liters), 0);
          await tx.$executeRaw`
            UPDATE "BaseBeverageInventory"
            SET "litersRemaining" = ${newRemaining},
                "status" = ${newRemaining === 0 ? "EMPTIED" : lot.status},
                "updatedAt" = NOW()
            WHERE "id" = ${lot.id}
          `;

          preparedComponents.push({
            sourceType: "BASE_LOT",
            baseBeverageInventoryId: lot.id,
            productionFormulaId: null,
            sourceStorageTankId: null,
            sourceStorageEntryId: null,
            sourceLabel: `${lot.productionName || "Lote"}${lot.formulaName ? ` · ${lot.formulaName}` : lot.formulaCode ? ` · ${lot.formulaCode}` : ""}`,
            liters: Number(component.liters),
            brixSnapshot: currentBrix,
          });
          continue;
        }

        if (component.sourceType === "STORED_FORMULA") {
          if (!component.sourceStorageEntryId) {
            throw new Error("Falta seleccionar el tanque de origen");
          }

          const rows = await tx.$queryRaw<{
            id: string;
            storageTankId: string;
            storageTankName: string;
            productionId: string | null;
            productionFormulaId: string | null;
            formulaLabel: string | null;
            formulaName: string | null;
            formulaCode: string | null;
            recipeType: string | null;
            productionName: string | null;
            litersRemaining: number | string | null;
            litersAdded: number | string | null;
          }[]>`
            SELECT
              se."id",
              se."storageTankId",
              st."name" AS "storageTankName",
              se."productionId",
              se."productionFormulaId",
              se."formulaLabel",
              pf."name" AS "formulaName",
              pf."code" AS "formulaCode",
              pf."recipeType",
              p."name" AS "productionName",
              se."litersRemaining",
              se."litersAdded"
            FROM "BaseBeverageStorageEntry" se
            INNER JOIN "BaseBeverageStorageTank" st ON st."id" = se."storageTankId"
            LEFT JOIN "ProductionFormula" pf ON pf."id" = se."productionFormulaId"
            LEFT JOIN "Production" p ON p."id" = se."productionId"
            WHERE se."id" = ${component.sourceStorageEntryId}
            LIMIT 1
          `;

          const storageEntry = rows[0];
          if (!storageEntry) {
            throw new Error("La entrada seleccionada del tanque ya no existe");
          }
          if (storageEntry.recipeType !== "ACIDIFIER" && storageEntry.recipeType !== "SCOOBY") {
            throw new Error("Lote base solo permite acidificante o scooby. Usa Receta sabor para saborizantes");
          }

          const remaining = Number(storageEntry.litersRemaining ?? storageEntry.litersAdded ?? 0);
          if (!(remaining > 0)) {
            throw new Error(`La entrada del tanque ${storageEntry.storageTankName} ya no tiene litros disponibles`);
          }
          if (Number(component.liters) > remaining) {
            throw new Error(`El tanque ${storageEntry.storageTankName} solo tiene ${remaining.toLocaleString("es-MX")} Lt disponibles de ese lote`);
          }

          const manualBrix = component.brix != null && Number.isFinite(Number(component.brix)) ? Number(component.brix) : null;
          const currentBrix = manualBrix ?? (storageEntry.productionId
            ? await resolveLatestBrixForBaseLot(tx as typeof db, storageEntry.productionId)
            : null);
          if (currentBrix == null) {
            throw new Error(`El lote ${storageEntry.productionName || storageEntry.formulaLabel || storageEntry.id} no tiene una medición de brix registrada`);
          }

          const newRemaining = Math.max(remaining - Number(component.liters), 0);
          await tx.$executeRaw`
            UPDATE "BaseBeverageStorageEntry"
            SET "litersRemaining" = ${newRemaining}
            WHERE "id" = ${storageEntry.id}
          `;

          preparedComponents.push({
            sourceType: "STORED_FORMULA",
            baseBeverageInventoryId: null,
            productionFormulaId: storageEntry.productionFormulaId,
            sourceStorageTankId: storageEntry.storageTankId,
            sourceStorageEntryId: storageEntry.id,
            sourceLabel: `${storageEntry.productionName || storageEntry.formulaName || storageEntry.formulaLabel || "Lote"} · ${storageEntry.storageTankName}`,
            liters: Number(component.liters),
            brixSnapshot: currentBrix,
          });
          continue;
        }

        if (component.sourceType === "FLAVOR_RECIPE") {
          if (!component.productionFormulaId) {
            throw new Error("Falta seleccionar una receta de sabor");
          }

          const rows = await tx.$queryRaw<{
            id: string;
            name: string;
            code: string;
            recipeType: string;
            brixMin: number | string;
            brixMax: number | string;
          }[]>`
            SELECT "id","name","code","recipeType","brixMin","brixMax"
            FROM "ProductionFormula"
            WHERE "id" = ${component.productionFormulaId}
            LIMIT 1
          `;

          const recipe = rows[0];
          if (!recipe || recipe.recipeType !== "FLAVOR") {
            throw new Error("La receta de sabor seleccionada ya no existe o no es válida");
          }

          const manualBrix = component.brix != null && Number.isFinite(Number(component.brix)) ? Number(component.brix) : null;
          const flavorBrix = manualBrix ?? Number(recipe.brixMax ?? recipe.brixMin ?? 0);
          const flavorAllocations = await consumeFormulaInventoryForBlendTx(tx, {
            productionFormulaId: recipe.id,
            liters: Number(component.liters),
            brixSnapshot: flavorBrix,
            sourceLabel: `${recipe.name} (${recipe.code})`,
          });

          preparedComponents.push(...flavorAllocations);
          continue;
        }
      }

      const totalLiters = preparedComponents.reduce((sum, component) => sum + component.liters, 0);
      if (!(totalLiters > 0)) {
        throw new Error("La mezcla final debe tener litros mayores a cero");
      }

      const weightedBrix =
        preparedComponents.reduce((sum, component) => sum + component.liters * component.brixSnapshot, 0) / totalLiters;
      const sugarToAddKg = Math.max(Number(data.targetBrix) - weightedBrix, 0) * totalLiters * 0.01;

      const blendId = randomUUID();
      await tx.$executeRaw`
        INSERT INTO "FinalBeverageBlend"
        ("id","name","status","flavorId","flavorName","targetBrix","weightedBrix","sugarToAddKg","totalLiters","sugarGramsPerLiter","waterPercent","acidifierPercent","scoobyPercent","flavorPercent","notes","createdBy","createdAt","updatedAt")
        VALUES
        (${blendId}, ${data.name.trim()}, ${"ACTIVE"}, ${linkedFlavorId}, ${linkedFlavorName}, ${Number(data.targetBrix)}, ${weightedBrix}, ${sugarToAddKg}, ${totalLiters}, ${data.sugarGramsPerLiter ?? null}, ${data.waterPercent ?? null}, ${data.acidifierPercent ?? null}, ${data.scoobyPercent ?? null}, ${data.flavorPercent ?? null}, ${data.notes?.trim() || null}, ${data.createdBy || null}, NOW(), NOW())
      `;

      for (const component of preparedComponents) {
        await tx.$executeRaw`
          INSERT INTO "FinalBeverageBlendComponent"
          ("id","blendId","sourceType","baseBeverageInventoryId","productionFormulaId","sourceStorageTankId","sourceStorageEntryId","sourceLabel","liters","brixSnapshot","createdAt")
          VALUES
          (${randomUUID()}, ${blendId}, ${component.sourceType}, ${component.baseBeverageInventoryId}, ${component.productionFormulaId}, ${component.sourceStorageTankId}, ${component.sourceStorageEntryId}, ${component.sourceLabel}, ${component.liters}, ${component.brixSnapshot}, NOW())
        `;
      }

      return {
        id: blendId,
        weightedBrix,
        targetBrix: Number(data.targetBrix),
        sugarToAddKg,
        totalLiters,
      };
    });

    revalidatePath("/admin/production");
    revalidatePath("/admin/inventory/base-beverage");
    revalidatePath("/admin/inventory");
    return { success: true, blend };
  } catch (e: any) {
    return { success: false, error: e.message || "No se pudo crear la bebida final" };
  }
}

export async function cancelFinalBeverageBlend(blendId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.$transaction(async (tx) => {
      await ensureFinalBeverageBlendTables(tx as typeof db);

      const blendRows = await tx.$queryRaw<{ id: string; status: string }[]>`
        SELECT "id","status"
        FROM "FinalBeverageBlend"
        WHERE "id" = ${blendId}
        LIMIT 1
      `;

      const blend = blendRows[0];
      if (!blend) {
        throw new Error("La bebida final ya no existe");
      }
      if (blend.status === "CANCELLED") {
        throw new Error("La bebida final ya estaba cancelada");
      }

      const componentRows = await tx.$queryRaw<{
        id: string;
        sourceType: string;
        baseBeverageInventoryId: string | null;
        sourceStorageEntryId: string | null;
        liters: number | string;
      }[]>`
        SELECT "id","sourceType","baseBeverageInventoryId","sourceStorageEntryId","liters"
        FROM "FinalBeverageBlendComponent"
        WHERE "blendId" = ${blendId}
      `;

      for (const component of componentRows) {
        if (component.sourceType === "BASE_LOT" && component.baseBeverageInventoryId) {
          const inventoryRows = await tx.$queryRaw<{ litersRemaining: number | string | null }[]>`
            SELECT "litersRemaining"
            FROM "BaseBeverageInventory"
            WHERE "id" = ${component.baseBeverageInventoryId}
            LIMIT 1
          `;

          const currentRemaining = Number(inventoryRows[0]?.litersRemaining || 0);
          await tx.$executeRaw`
            UPDATE "BaseBeverageInventory"
            SET "litersRemaining" = ${currentRemaining + Number(component.liters)},
                "status" = ${"AVAILABLE"},
                "updatedAt" = NOW()
            WHERE "id" = ${component.baseBeverageInventoryId}
          `;
          continue;
        }

        if (component.sourceType === "STORED_FORMULA" && component.sourceStorageEntryId) {
          const storageEntryRows = await tx.$queryRaw<{ litersRemaining: number | string | null }[]>`
            SELECT "litersRemaining"
            FROM "BaseBeverageStorageEntry"
            WHERE "id" = ${component.sourceStorageEntryId}
            LIMIT 1
          `;

          const currentRemaining = Number(storageEntryRows[0]?.litersRemaining || 0);
          await tx.$executeRaw`
            UPDATE "BaseBeverageStorageEntry"
            SET "litersRemaining" = ${currentRemaining + Number(component.liters)}
            WHERE "id" = ${component.sourceStorageEntryId}
          `;
        }
      }

      await tx.$executeRaw`
        UPDATE "FinalBeverageBlend"
        SET "status" = ${"CANCELLED"},
            "updatedAt" = NOW()
        WHERE "id" = ${blendId}
      `;
    });

    revalidatePath("/admin/production");
    revalidatePath("/admin/inventory/base-beverage");
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "No se pudo cancelar la bebida final" };
  }
}

export async function cancelProduction(
  productionId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.production.update({
      where: { id: productionId },
      data: { status: "CANCELLED", notes },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al cancelar la producción" };
  }
}
