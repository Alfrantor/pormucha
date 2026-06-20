"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Recalcula amountPaid e isPaid desde la suma real de OrderPayment en DB
async function syncOrderPayment(tx: any, orderId: string) {
  const agg = await (tx as any).orderPayment.aggregate({
    where: { orderId },
    _sum: { amount: true },
  });
  const newAmountPaid = Number(agg._sum?.amount || 0);
  const order = await (tx as any).order.findUnique({
    where: { id: orderId },
    select: { total: true },
  });
  const total = Number(order?.total || 0);
  const isPaidNow = total > 0 && newAmountPaid >= total - 0.01;
  await (tx as any).order.update({
    where: { id: orderId },
    data: { amountPaid: newAmountPaid, isPaid: isPaidNow },
  });
  return { newAmountPaid, isPaidNow, total };
}

export async function registerOrderPayment(
  orderId: string,
  amount: number,
  paymentMethod: string,
  note?: string
): Promise<{ success: boolean; isPaidNow: boolean; amountPaid: number; remaining: number; error?: string }> {
  try {
    const result = await db.$transaction(async (tx) => {
      const order = await (tx as any).order.findUnique({
        where: { id: orderId },
        select: { total: true, isPaid: true },
      });
      if (!order) throw new Error("Orden no encontrada");
      if ((order as any).isPaid) throw new Error("Esta orden ya está completamente pagada");

      const total = Number(order.total);

      // Calcular saldo real desde DB (no confiar en amountPaid almacenado)
      const agg = await (tx as any).orderPayment.aggregate({
        where: { orderId },
        _sum: { amount: true },
      });
      const currentPaid = Number(agg._sum?.amount || 0);
      const remaining = total - currentPaid;

      if (amount <= 0) throw new Error("El monto debe ser mayor a 0");
      if (amount > remaining + 0.01) throw new Error(`El monto supera el saldo pendiente ($${remaining.toFixed(2)})`);

      await (tx as any).orderPayment.create({
        data: { orderId, amount, paymentMethod, note: note || null },
      });

      const { newAmountPaid, isPaidNow } = await syncOrderPayment(tx, orderId);
      return { isPaidNow, amountPaid: newAmountPaid, remaining: isPaidNow ? 0 : total - newAmountPaid };
    });

    revalidatePath("/admin");
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, isPaidNow: false, amountPaid: 0, remaining: 0, error: err.message };
  }
}

export async function cancelOrderPayment(
  paymentId: string,
  orderId: string
): Promise<{ success: boolean; amountPaid: number; isPaidNow: boolean; error?: string }> {
  try {
    const result = await db.$transaction(async (tx) => {
      const payment = await (tx as any).orderPayment.findUnique({
        where: { id: paymentId },
      });
      if (!payment) throw new Error("Pago no encontrado");
      if (payment.orderId !== orderId) throw new Error("El pago no pertenece a esta orden");

      await (tx as any).orderPayment.delete({ where: { id: paymentId } });

      const { newAmountPaid, isPaidNow } = await syncOrderPayment(tx, orderId);
      return { amountPaid: newAmountPaid, isPaidNow };
    });

    revalidatePath("/admin");
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, amountPaid: 0, isPaidNow: false, error: err.message };
  }
}

export async function recalculateOrderPayment(
  orderId: string
): Promise<{ success: boolean; amountPaid: number; isPaidNow: boolean; error?: string }> {
  try {
    const result = await db.$transaction(async (tx) => {
      const order = await (tx as any).order.findUnique({ where: { id: orderId }, select: { total: true } });
      if (!order) throw new Error("Orden no encontrada");
      const { newAmountPaid, isPaidNow } = await syncOrderPayment(tx, orderId);
      return { amountPaid: newAmountPaid, isPaidNow };
    });
    revalidatePath("/admin");
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, amountPaid: 0, isPaidNow: false, error: err.message };
  }
}
