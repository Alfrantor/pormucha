"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

async function requireInventoryAccess() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;
  const email = (sessionClaims as any)?.email || "admin";

  if (role !== "admin" && role !== "vendedor") {
    throw new Error("No autorizado");
  }

  return { role, email };
}

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

export async function registerProductInventoryEntry(data: {
  flavorId: string;
  locationId: string;
  quantity: number;
  lot: string;
}) {
  try {
    const { email } = await requireInventoryAccess();

    if (!data.flavorId || !data.locationId) {
      throw new Error("Producto y ubicación son obligatorios");
    }

    if (!(data.quantity > 0)) {
      throw new Error("La cantidad debe ser mayor a cero");
    }

    const lot = data.lot.trim();
    if (!lot) {
      throw new Error("El lote es obligatorio");
    }

    const result = await db.$transaction(async (tx) => {
      const [flavor, location, currentStock] = await Promise.all([
        tx.flavor.findUnique({
          where: { id: data.flavorId },
          select: { id: true, name: true, slug: true },
        }),
        tx.location.findUnique({
          where: { id: data.locationId },
          select: { id: true, name: true },
        }),
        tx.stock.findUnique({
          where: {
            flavorId_locationId: {
              flavorId: data.flavorId,
              locationId: data.locationId,
            },
          },
        }),
      ]);

      if (!flavor) {
        throw new Error("El producto seleccionado no existe");
      }

      if (!location) {
        throw new Error("La ubicación seleccionada no existe");
      }

      const nextQuantity = Number(currentStock?.quantity ?? 0) + Math.trunc(data.quantity);

      await tx.stock.upsert({
        where: {
          flavorId_locationId: {
            flavorId: data.flavorId,
            locationId: data.locationId,
          },
        },
        create: {
          flavorId: data.flavorId,
          locationId: data.locationId,
          quantity: Math.trunc(data.quantity),
        },
        update: {
          quantity: nextQuantity,
        },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          flavorId: data.flavorId,
          locationId: data.locationId,
          type: "IN",
          quantity: Math.trunc(data.quantity),
          reason: `Entrada manual de producto terminado | Lote: ${lot}`,
          userId: email,
        },
        include: {
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        flavor,
        location,
        movement: {
          ...movement,
          createdAt: movement.createdAt.toISOString(),
        },
        nextQuantity,
      };
    });

    revalidatePath("/admin/inventory/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin");

    return {
      success: true,
      flavorId: result.flavor.id,
      locationId: result.location.id,
      newQuantity: result.nextQuantity,
      movement: result.movement,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "No se pudo registrar la entrada" };
  }
}
