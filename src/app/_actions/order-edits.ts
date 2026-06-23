"use server";

import { db } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function updateOrderItems(
  orderId: string,
  items: { id: string; quantity: number; unitPrice: number }[]
): Promise<{ success: boolean; newTotal?: number; error?: string }> {
  try {
    const result = await db.$transaction(async (tx) => {
      for (const item of items) {
        const subtotal = item.quantity * item.unitPrice;
        await (tx as any).orderItem.update({
          where: { id: item.id },
          data: { quantity: item.quantity, unitPrice: item.unitPrice, subtotal },
        });
      }
      // Recalcular total de la orden
      const order = await (tx as any).order.findUnique({
        where: { id: orderId },
        select: { shippingCost: true, orderItems: { select: { subtotal: true } } },
      });
      const itemsTotal = order.orderItems.reduce((s: number, i: any) => s + Number(i.subtotal), 0);
      const newTotal = itemsTotal + Number(order.shippingCost || 0);
      await (tx as any).order.update({ where: { id: orderId }, data: { total: newTotal } });
      return newTotal;
    });
    revalidatePath("/admin");
    return { success: true, newTotal: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

const EDITABLE_FIELDS = ["fullName", "email", "phone", "notes", "requiresInvoice", "paymentMethod", "invoiceNumber", "invoiceDate", "invoiceUrl"] as const;
type EditableField = typeof EDITABLE_FIELDS[number];

export async function editOrder(
  orderId: string,
  newValues: Partial<Record<EditableField, string | boolean | null>>
): Promise<{ success: boolean; error?: string }> {
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
        notes: true, requiresInvoice: true, paymentMethod: true,
        invoiceNumber: true, invoiceDate: true, invoiceUrl: true,
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

    await db.$transaction(async (tx) => {
      await (tx as any).order.update({
        where: { id: orderId },
        data: newValues,
      });
      await (tx as any).orderEdit.create({
        data: { orderId, changes, changedBy },
      });
    });

    revalidatePath("/admin");
    return { success: true };
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
