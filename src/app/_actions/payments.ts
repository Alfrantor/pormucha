"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

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
        select: { total: true, amountPaid: true, isPaid: true },
      });

      if (!order) throw new Error("Orden no encontrada");
      if ((order as any).isPaid) throw new Error("Esta orden ya está completamente pagada");

      const currentPaid = Number((order as any).amountPaid || 0);
      const total = Number(order.total);
      const remaining = total - currentPaid;

      if (amount <= 0) throw new Error("El monto debe ser mayor a 0");
      if (amount > remaining + 0.01) throw new Error(`El monto supera el saldo pendiente ($${remaining.toFixed(2)})`);

      await (tx as any).orderPayment.create({
        data: { orderId, amount, paymentMethod, note: note || null },
      });

      const newAmountPaid = currentPaid + amount;
      const isPaidNow = newAmountPaid >= total - 0.01;

      await (tx as any).order.update({
        where: { id: orderId },
        data: {
          amountPaid: newAmountPaid,
          isPaid: isPaidNow,
        },
      });

      return { isPaidNow, amountPaid: newAmountPaid, remaining: isPaidNow ? 0 : total - newAmountPaid };
    });

    revalidatePath("/admin");
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, isPaidNow: false, amountPaid: 0, remaining: 0, error: err.message };
  }
}
