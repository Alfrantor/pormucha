import { db } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export function toDecimal(value: number | string | Decimal | null | undefined) {
  return new Decimal(value ?? 0);
}

async function ensureCreditOrderIdColumn(tx: any) {
  await tx.$executeRawUnsafe(`
    ALTER TABLE "Credit"
    ADD COLUMN IF NOT EXISTS "orderId" TEXT
  `);
}

export async function syncClientCreditUsage(tx: any, clientId: string) {
  const agg = await tx.credit.aggregate({
    where: {
      clientId,
      status: { in: ["PENDING", "OVERDUE"] },
    },
    _sum: { amount: true },
  });

  const creditUsed = new Decimal(agg._sum?.amount ?? 0);

  await tx.client.update({
    where: { id: clientId },
    data: { creditUsed },
  });

  return creditUsed;
}

export async function getClientCreditState(clientId: string) {
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      creditLimit: true,
      creditUsed: true,
      paymentTerms: true,
      status: true,
    },
  });

  if (!client) {
    return null;
  }

  const creditLimit = Number(client.creditLimit ?? 0);
  const creditUsed = Number(client.creditUsed ?? 0);

  return {
    ...client,
    creditLimit,
    creditUsed,
    availableCredit: Math.max(0, creditLimit - creditUsed),
  };
}

export async function validateClientCreditLimit(clientId: string, amount: number) {
  const state = await getClientCreditState(clientId);

  if (!state) {
    return { ok: false, error: "Cliente no encontrado" };
  }

  if (state.creditLimit <= 0) {
    return { ok: false, error: "Este cliente no tiene l\u00edmite de cr\u00e9dito configurado" };
  }

  if (amount > state.availableCredit + 0.01) {
    return {
      ok: false,
      error: `El cr\u00e9dito disponible es insuficiente. Disponible: $${state.availableCredit.toFixed(2)}`,
    };
  }

  return { ok: true, availableCredit: state.availableCredit };
}

export async function createOrUpdateOrderCredit(tx: any, data: {
  clientId: string;
  orderId: string;
  amount: number;
  dueDate: Date;
  notes?: string | null;
}) {
  await ensureCreditOrderIdColumn(tx);

  const existing = await tx.credit.findUnique({
    where: { orderId: data.orderId },
  });

  if (existing) {
    if (existing.status === "PENDING" || existing.status === "OVERDUE") {
      return existing;
    }

    return tx.credit.update({
      where: { id: existing.id },
      data: {
        amount: toDecimal(data.amount),
        dueDate: data.dueDate,
        status: "PENDING",
        notes: data.notes ?? existing.notes,
      },
    });
  }

  return tx.credit.create({
    data: {
      clientId: data.clientId,
      orderId: data.orderId,
      amount: toDecimal(data.amount),
      dueDate: data.dueDate,
      status: "PENDING",
      notes: data.notes ?? null,
    },
  });
}

export async function closeOrderCredit(tx: any, orderId: string, status: "PAID" | "CANCELLED" = "PAID") {
  await ensureCreditOrderIdColumn(tx);

  const credit = await tx.credit.findUnique({
    where: { orderId },
    select: { id: true, clientId: true, status: true },
  });

  if (!credit) {
    return null;
  }

  const updated = await tx.credit.update({
    where: { id: credit.id },
    data: { status },
  });

  await syncClientCreditUsage(tx, credit.clientId);

  return updated;
}
