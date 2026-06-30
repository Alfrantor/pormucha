"use server";

import { db } from "@/lib/db";
import { formatProductionName } from "@/lib/production-naming";
import { revalidatePath } from "next/cache";

const PIN_SETTING_KEY = "produccion_pin";
const DEFAULT_PIN = "1234";

export async function getProduccionPin(): Promise<string> {
  try {
    const setting = await db.systemSetting.findUnique({ where: { key: PIN_SETTING_KEY } });
    return setting?.value || DEFAULT_PIN;
  } catch {
    return DEFAULT_PIN;
  }
}

export async function setProduccionPin(pin: string): Promise<{ success: boolean; error?: string }> {
  if (!pin || pin.length < 4) return { success: false, error: "El PIN debe tener al menos 4 caracteres" };
  await db.systemSetting.upsert({
    where: { key: PIN_SETTING_KEY },
    update: { value: pin },
    create: { key: PIN_SETTING_KEY, value: pin },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function validatePin(pin: string): Promise<boolean> {
  const correct = await getProduccionPin();
  return pin === correct;
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
      if (obj?.constructor?.name === "Decimal") return Number(obj);
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
    notes?: string;
    createdBy?: string;
    ingredients: IngredientInput[];
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { productType, productionFormulaId, tankId, startedAt, notes, createdBy, ingredients } = data;

  if (!tankId) return { success: false, error: "Selecciona un tanque" };
  if (!startedAt) return { success: false, error: "La fecha de inicio es requerida" };

  try {
    const production = await db.$transaction(async (tx) => {
      const tank = await tx.tank.findUnique({
        where: { id: tankId },
        select: { id: true, name: true },
      });

      if (!tank) {
        throw new Error("El tanque seleccionado no existe");
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
    await db.productionParameter.create({
      data: {
        productionId,
        ph: ph != null ? ph : null,
        brix: brix != null ? brix : null,
        temperature: temperature != null ? temperature : null,
        acidity: acidity != null ? acidity : null,
        notes: notes?.trim() || null,
        recordedBy: recordedBy || null,
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
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.production.update({
      where: { id: productionId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        litersProduced,
        notes,
      },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al completar la producción" };
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
