"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { closeOrderCredit, syncClientCreditUsage } from "@/lib/credits";
import { ensureFlavorPresentationSchema } from "@/lib/flavor-presentation-schema";

function paymentErrorMessage(err: any) {
  const message = String(err?.message || err || "Error desconocido");
  if (
    message.includes("Can't reach database server") ||
    message.includes("PrismaClientInitializationError") ||
    message.includes("P1001")
  ) {
    return "No se pudo conectar a la base de datos. Revisa la conexión a Neon e inténtalo de nuevo.";
  }
  return message;
}

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
  note?: string,
  proofUrl?: string
): Promise<{ success: boolean; isPaidNow: boolean; amountPaid: number; remaining: number; payment?: { id: string; amount: number; paymentMethod: string; note: string | null; proofUrl: string | null; createdAt: string }; error?: string }> {
  try {
    const result = await db.$transaction(async (tx) => {
      const order = await (tx as any).order.findUnique({
        where: { id: orderId },
        select: { total: true },
      });
      if (!order) throw new Error("Orden no encontrada");

      const total = Number(order.total);

      // Calcular saldo real desde DB (no confiar en amountPaid almacenado)
      const agg = await (tx as any).orderPayment.aggregate({
        where: { orderId },
        _sum: { amount: true },
      });
      const currentPaid = Number(agg._sum?.amount || 0);
      const remaining = total - currentPaid;
      if (remaining <= 0.01) throw new Error("Esta orden ya está completamente pagada");

      if (amount <= 0) throw new Error("El monto debe ser mayor a 0");
      if (amount > remaining + 0.01) throw new Error(`El monto supera el saldo pendiente ($${remaining.toFixed(2)})`);

      const created = await (tx as any).orderPayment.create({
        data: { orderId, amount, paymentMethod, note: note || null, proofUrl: proofUrl || null },
      });

      const { newAmountPaid, isPaidNow } = await syncOrderPayment(tx, orderId);

      if (isPaidNow) {
        await closeOrderCredit(tx, orderId, "PAID");
      } else {
        const order = await (tx as any).order.findUnique({
          where: { id: orderId },
          select: { clientId: true },
        });
        if (order?.clientId) {
          await syncClientCreditUsage(tx, order.clientId);
        }
      }

      return {
        isPaidNow,
        amountPaid: newAmountPaid,
        remaining: isPaidNow ? 0 : total - newAmountPaid,
        payment: {
          id: created.id,
          amount: Number(created.amount),
          paymentMethod: created.paymentMethod,
          note: created.note ?? null,
          proofUrl: created.proofUrl ?? null,
          createdAt: created.createdAt.toISOString(),
        },
      };
    });

    revalidatePath("/admin");
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, isPaidNow: false, amountPaid: 0, remaining: 0, error: paymentErrorMessage(err) };
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

      const order = await (tx as any).order.findUnique({
        where: { id: orderId },
        select: { clientId: true },
      });

      if (order?.clientId) {
        await syncClientCreditUsage(tx, order.clientId);
      }

      if (isPaidNow) {
        await closeOrderCredit(tx, orderId, "PAID");
      }

      return { amountPaid: newAmountPaid, isPaidNow };
    });

    revalidatePath("/admin");
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, amountPaid: 0, isPaidNow: false, error: paymentErrorMessage(err) };
  }
}

export async function getOrderPayments(orderId: string): Promise<{
  success: boolean;
  order?: {
    id: string;
    total: number;
    amountPaid: number;
    isPaid: boolean;
    folio: string | null;
    fullName: string | null;
    orderItems: { id: string; productName: string; presentation: string | null; quantity: number; unitPrice: number; subtotal: number }[];
  };
  payments?: { id: string; amount: number; paymentMethod: string; note: string | null; proofUrl: string | null; createdAt: string }[];
  error?: string;
}> {
  try {
    await ensureFlavorPresentationSchema();

    const order = await (db as any).order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        total: true,
        amountPaid: true,
        isPaid: true,
        folio: true,
        fullName: true,
        orderItems: {
          select: {
            id: true,
            productName: true,
            presentation: true,
            quantity: true,
            unitPrice: true,
            subtotal: true,
          },
        },
      },
    });
    if (!order) return { success: false, error: "Orden no encontrada" };

    const payments = await (db as any).orderPayment.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
    });

    return {
      success: true,
      order: {
        ...order,
        total: Number(order.total),
        amountPaid: Number(order.amountPaid || 0),
        orderItems: (order.orderItems || []).map((item: any) => ({
          ...item,
          unitPrice: Number(item.unitPrice || 0),
          subtotal: Number(item.subtotal || 0),
        })),
      },
      payments: payments.map((p: any) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod,
        note: p.note ?? null,
        proofUrl: p.proofUrl ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  } catch (err: any) {
    return { success: false, error: paymentErrorMessage(err) };
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

      const orderWithClient = await (tx as any).order.findUnique({
        where: { id: orderId },
        select: { clientId: true },
      });

      if (orderWithClient?.clientId) {
        await syncClientCreditUsage(tx, orderWithClient.clientId);
      }

      if (isPaidNow) {
        await closeOrderCredit(tx, orderId, "PAID");
      }

      return { amountPaid: newAmountPaid, isPaidNow };
    });
    revalidatePath("/admin");
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, amountPaid: 0, isPaidNow: false, error: paymentErrorMessage(err) };
  }
}
