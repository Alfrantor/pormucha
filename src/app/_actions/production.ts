"use server";

import { randomUUID } from "crypto";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { db } from "@/lib/db";
import { formatProductionName } from "@/lib/production-naming";
import { revalidatePath } from "next/cache";

const DEFAULT_PIN = "1234";
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

function isDecimalLike(value: unknown): value is { toNumber: () => number } {
  if (!value || typeof value !== "object") return false;
  return (
    "s" in value &&
    "e" in value &&
    "d" in value &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  );
}

async function ensureProductionPhaseTable(client: typeof db) {
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

async function ensureBaseBeverageStorageTables(client: typeof db) {
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
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BaseBeverageStorageEntry_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => null);

  await client.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "BaseBeverageStorageEntry_baseBeverageInventoryId_key"
    ON "BaseBeverageStorageEntry"("baseBeverageInventoryId")
  `).catch(() => null);

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BaseBeverageStorageEntry_storageTankId_idx"
    ON "BaseBeverageStorageEntry"("storageTankId")
  `).catch(() => null);
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
    notes?: string;
    createdBy?: string;
    ingredients: IngredientInput[];
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { productType, productionFormulaId, tankId, startedAt, inputLiters, notes, createdBy, ingredients } = data;

  if (!tankId) return { success: false, error: "Selecciona un tanque" };
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

        await tx.$executeRaw`
          UPDATE "Production"
          SET "inputLiters" = ${inputLiters}
          WHERE "id" = ${prod.id}
        `;
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
  inventoryAction: "MAINTAIN" | "UNIFY" | "DISPATCH" = "MAINTAIN"
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.$transaction(async (tx) => {
      await ensureProductionPhaseTable(tx as typeof db);

      const productionRows = await tx.$queryRaw<{
        id: string;
        productType: string;
        tankId: string | null;
        inputLiters: number | string | null;
        notes: string | null;
      }[]>`
        SELECT "id", "productType", "tankId", "inputLiters", "notes"
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
      const inventoryStatus =
        inventoryAction === "UNIFY"
          ? "MIX_PENDING"
          : inventoryAction === "DISPATCH"
            ? "DISPATCHED"
            : "HELD";

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
        (${randomUUID()}, ${productionId}, ${production.productType}, ${production.tankId}, ${production.inputLiters != null ? Number(production.inputLiters) : null}, ${litersProduced}, ${remainingLiters}, ${inventoryStatus}, ${notes?.trim() || production.notes || null}, NOW(), NOW())
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
    });

    revalidatePath("/admin");
    revalidatePath("/admin/production");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/base-beverage");
    return { success: true };
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
      return { success: false, error: "El nombre del tanque es obligatorio" };
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
        SELECT COALESCE(SUM("litersAdded"), 0) AS total
        FROM "BaseBeverageStorageEntry"
        WHERE "storageTankId" = ${data.storageTankId}
      `;

      const currentVolume = Number(currentVolumeRows[0]?.total || 0);
      const litersToAdd = validRows.reduce((sum, row) => sum + Number(row.litersRemaining || 0), 0);
      const capacityLt = storageTank.capacityLt != null ? Number(storageTank.capacityLt) : null;

      if (capacityLt != null && currentVolume + litersToAdd > capacityLt) {
        throw new Error(`La capacidad del tanque no alcanza. Disponible: ${Math.max(capacityLt - currentVolume, 0)} Lt`);
      }

      for (const row of validRows) {
        await tx.$executeRaw`
          INSERT INTO "BaseBeverageStorageEntry"
          ("id","storageTankId","baseBeverageInventoryId","productionId","productType","productionFormulaId","formulaLabel","litersAdded","notes","createdAt")
          VALUES
          (${randomUUID()}, ${data.storageTankId}, ${row.id}, ${row.productionId}, ${row.productType}, ${row.productionFormulaId}, ${resolvedFormulaName}, ${Number(row.litersRemaining || 0)}, ${data.notes?.trim() || null}, NOW())
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

export async function updateBaseBeverageInventoryDisposition(
  inventoryId: string,
  disposition: "HELD" | "MIX_PENDING" | "DISPATCHED" | "AVAILABLE"
): Promise<{ success: boolean; error?: string }> {
  const allowedStatuses = new Set(["HELD", "MIX_PENDING", "DISPATCHED", "AVAILABLE"]);

  if (!allowedStatuses.has(disposition)) {
    return { success: false, error: "Estado de inventario no valido" };
  }

  try {
    await db.$executeRaw`
      UPDATE "BaseBeverageInventory"
      SET "status" = ${disposition},
          "updatedAt" = NOW()
      WHERE "id" = ${inventoryId}
    `;

    revalidatePath("/admin/production");
    revalidatePath("/admin/inventory/base-beverage");
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al actualizar el destino del lote" };
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
