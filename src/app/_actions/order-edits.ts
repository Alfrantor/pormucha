"use server";

import { db } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

type FlavorUsageMap = Map<string, number>;

function addFlavorUsage(target: FlavorUsageMap, flavorId: string, quantity: number) {
  if (!flavorId || !quantity) return;
  target.set(flavorId, (target.get(flavorId) || 0) + quantity);
}

function normalizeCompositionFromItem(item: {
  flavorId?: string | null;
  composition?: Array<{ flavorId: string; quantity: number }>;
}) {
  if (Array.isArray(item.composition) && item.composition.length > 0) {
    return item.composition.map((comp) => ({
      flavorId: comp.flavorId,
      quantity: Number(comp.quantity || 0),
    }));
  }

  if (item.flavorId) {
    return [{ flavorId: item.flavorId, quantity: 1 }];
  }

  return [] as Array<{ flavorId: string; quantity: number }>;
}

async function applyStockUsageDelta(tx: any, locationId: string | null | undefined, oldUsage: FlavorUsageMap, newUsage: FlavorUsageMap) {
  if (!locationId) return;

  const flavorIds = Array.from(new Set([...oldUsage.keys(), ...newUsage.keys()]));
  for (const flavorId of flavorIds) {
    const previous = oldUsage.get(flavorId) || 0;
    const next = newUsage.get(flavorId) || 0;
    const deltaSold = next - previous;
    if (deltaSold === 0) continue;

    const currentStock = await tx.stock.findUnique({
      where: {
        flavorId_locationId: {
          flavorId,
          locationId,
        },
      },
    });

    const currentQty = Number(currentStock?.quantity || 0);
    const nextQty = currentQty - deltaSold;

    if (nextQty < 0) {
      throw new Error("No hay inventario suficiente para guardar la edición del pedido.");
    }

    await tx.stock.upsert({
      where: {
        flavorId_locationId: {
          flavorId,
          locationId,
        },
      },
      update: { quantity: nextQty },
      create: {
        flavorId,
        locationId,
        quantity: nextQty,
      },
    });
  }
}

export async function updateOrderItems(
  orderId: string,
  items: Array<{
    id?: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    productId?: string | null;
    flavorId?: string | null;
  }>
): Promise<{ success: boolean; newTotal?: number; newSubtotal?: number; updatedItems?: any[]; error?: string }> {
  try {
    const result = await db.$transaction(async (tx) => {
      const existingOrder = await (tx as any).order.findUnique({
        where: { id: orderId },
        select: {
          locationId: true,
          shippingCost: true,
          orderItems: {
            select: {
              id: true,
              productId: true,
              flavorId: true,
              productName: true,
              quantity: true,
              unitPrice: true,
              subtotal: true,
              composition: {
                select: {
                  flavorId: true,
                  quantity: true,
                },
              },
            },
          },
        },
      });

      if (!existingOrder) {
        throw new Error("Orden no encontrada");
      }

      const existingItemsById = new Map(existingOrder.orderItems.map((item: any) => [item.id, item]));
      const oldUsage: FlavorUsageMap = new Map();
      for (const item of existingOrder.orderItems) {
        for (const comp of normalizeCompositionFromItem(item)) {
          addFlavorUsage(oldUsage, comp.flavorId, Number(item.quantity || 0) * Number(comp.quantity || 0));
        }
      }

      const newUsage: FlavorUsageMap = new Map();
      for (const item of items) {
        if (item.quantity <= 0) continue;
        const sourceItem = item.id ? existingItemsById.get(item.id) : null;
        for (const comp of normalizeCompositionFromItem(sourceItem || item)) {
          addFlavorUsage(newUsage, comp.flavorId, Number(item.quantity || 0) * Number(comp.quantity || 0));
        }
      }

      for (const item of items) {
        const normalizedName = item.productName?.trim() || "Producto";
        const subtotal = item.quantity * item.unitPrice;

        if (item.id) {
          if (item.quantity <= 0) {
            await (tx as any).orderItem.delete({
              where: { id: item.id },
            });
            continue;
          }

          await (tx as any).orderItem.update({
            where: { id: item.id },
            data: {
              productName: normalizedName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal,
            },
          });
          continue;
        }

        if (item.quantity <= 0) continue;

        await (tx as any).orderItem.create({
          data: {
            orderId,
            productId: item.productId || null,
            flavorId: item.flavorId || null,
            productName: normalizedName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal,
            composition: item.flavorId
              ? {
                  create: [{ flavorId: item.flavorId, quantity: 1 }],
                }
              : undefined,
          },
        });
      }

      await applyStockUsageDelta(tx, existingOrder.locationId, oldUsage, newUsage);

      const order = await (tx as any).order.findUnique({
        where: { id: orderId },
        select: {
          shippingCost: true,
          orderItems: {
            select: {
              id: true,
              productId: true,
              flavorId: true,
              productName: true,
              quantity: true,
              unitPrice: true,
              subtotal: true,
              composition: {
                select: {
                  flavorId: true,
                  quantity: true,
                },
              },
            },
            orderBy: { productName: "asc" },
          },
        },
      });
      const itemsTotal = order.orderItems.reduce((s: number, i: any) => s + Number(i.subtotal), 0);
      const newTotal = itemsTotal + Number(order.shippingCost || 0);
      await (tx as any).order.update({
        where: { id: orderId },
        data: {
          subtotal: itemsTotal,
          total: newTotal,
        },
      });
      return {
        newSubtotal: itemsTotal,
        newTotal,
        updatedItems: order.orderItems.map((item: any) => ({
          ...item,
          unitPrice: Number(item.unitPrice || 0),
          subtotal: Number(item.subtotal || 0),
        })),
      };
    });
    revalidatePath("/admin");
    return {
      success: true,
      newTotal: result.newTotal,
      newSubtotal: result.newSubtotal,
      updatedItems: result.updatedItems,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

const EDITABLE_FIELDS = ["fullName", "email", "phone", "notes", "shippingCost", "shippingProvider", "requiresInvoice", "paymentMethod", "invoiceNumber", "invoiceDate", "invoiceUrl"] as const;
type EditableField = typeof EDITABLE_FIELDS[number];

export async function editOrder(
  orderId: string,
  newValues: Partial<Record<EditableField, string | boolean | number | null>>
): Promise<{ success: boolean; error?: string; newTotal?: number; newShippingCost?: number; newSubtotal?: number }> {
  try {
    const user = await currentUser();
    const changedBy =
      user?.emailAddresses[0]?.emailAddress ||
      user?.id ||
      "sistema";

    const order = await (db as any).order.findUnique({
      where: { id: orderId },
      select: {
        fullName: true, email: true, phone: true,
        notes: true, shippingCost: true, shippingProvider: true, requiresInvoice: true, paymentMethod: true,
        invoiceNumber: true, invoiceDate: true, invoiceUrl: true,
        subtotal: true,
      },
    });
    if (!order) throw new Error("Orden no encontrada");

    // Construir diff solo con campos que realmente cambiaron
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in newValues && newValues[field] !== (order as any)[field]) {
        changes[field] = { old: (order as any)[field] ?? null, new: newValues[field] ?? null };
      }
    }

    if (Object.keys(changes).length === 0) {
      return { success: true }; // nada cambió
    }

    const normalizedValues = {
      ...newValues,
      shippingCost:
        newValues.shippingCost === undefined
          ? undefined
          : newValues.shippingCost === null
            ? null
            : Number(newValues.shippingCost),
    };

    const result = await db.$transaction(async (tx) => {
      const subtotal = Number(order.subtotal || 0);
      const shippingCost = normalizedValues.shippingCost === undefined
        ? Number(order.shippingCost || 0)
        : Number(normalizedValues.shippingCost || 0);

      await (tx as any).order.update({
        where: { id: orderId },
        data: {
          ...normalizedValues,
          total: subtotal + shippingCost,
        },
      });
      await (tx as any).orderEdit.create({
        data: { orderId, changes, changedBy },
      });
      return {
        newSubtotal: subtotal,
        newShippingCost: shippingCost,
        newTotal: subtotal + shippingCost,
      };
    });

    revalidatePath("/admin");
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getOrderEdits(orderId: string): Promise<{
  success: boolean;
  edits?: { id: string; changes: any; changedBy: string; changedAt: string }[];
  error?: string;
}> {
  try {
    const edits = await (db as any).orderEdit.findMany({
      where: { orderId },
      orderBy: { changedAt: "desc" },
    });
    return {
      success: true,
      edits: edits.map((e: any) => ({
        id: e.id,
        changes: e.changes,
        changedBy: e.changedBy,
        changedAt: e.changedAt.toISOString(),
      })),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
