"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function createAdjustmentRequest(data: {
  locationId: string;
  flavorId: string;
  type: string;
  quantity: number;
  reason: string;
  requestedBy: string;
}) {
  const { sessionClaims } = await auth();
  if (!sessionClaims) return { error: "No autenticado" };

  await (db as any).adjustmentRequest.create({
    data: {
      locationId: data.locationId,
      flavorId: data.flavorId,
      type: data.type,
      quantity: data.quantity,
      reason: data.reason,
      requestedBy: data.requestedBy,
      status: "PENDING",
    },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function approveAdjustmentRequest(id: string) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;
  const email = (sessionClaims as any)?.email || "admin";
  if (role !== "admin") return { error: "No autorizado" };

  const req = await (db as any).adjustmentRequest.findUnique({ where: { id } });
  if (!req || req.status !== "PENDING") return { error: "Solicitud no encontrada o ya procesada" };

  const delta = req.type === "IN" ? req.quantity : -req.quantity;

  await db.inventoryMovement.create({
    data: {
      flavorId: req.flavorId,
      locationId: req.locationId,
      type: req.type,
      quantity: req.quantity,
      reason: `[Aprobado por ${email}] ${req.reason}`,
      userId: email,
    },
  });

  await db.stock.upsert({
    where: { flavorId_locationId: { flavorId: req.flavorId, locationId: req.locationId } },
    create: { flavorId: req.flavorId, locationId: req.locationId, quantity: Math.max(0, delta) },
    update: { quantity: { increment: delta } },
  });

  await (db as any).adjustmentRequest.update({
    where: { id },
    data: { status: "APPROVED", reviewedBy: email },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function rejectAdjustmentRequest(id: string, note?: string) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;
  const email = (sessionClaims as any)?.email || "admin";
  if (role !== "admin") return { error: "No autorizado" };

  await (db as any).adjustmentRequest.update({
    where: { id },
    data: { status: "REJECTED", reviewedBy: email, reviewNote: note || null },
  });

  revalidatePath("/admin");
  return { success: true };
}
