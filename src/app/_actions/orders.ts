"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { closeOrderCredit, syncClientCreditUsage } from "@/lib/credits";

type ReplacementOrderItem = {
  productId: string | null;
  flavorId: string | null;
  productName: string;
  quantity: number;
  unitPrice: unknown;
  subtotal: unknown;
  composition: Array<{
    flavorId: string;
    quantity: number;
  }>;
};

export async function cancelOrder(
  orderId: string,
  returnStock: boolean,
  createReplacement: boolean,
  cancellationNote?: string
): Promise<{ success: boolean; replacementOrderId?: string; error?: string }> {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;
  if (role !== "admin" && role !== "vendedor") {
    return { success: false, error: "Sin permisos" };
  }

  try {
    const order = await (db as any).order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: { composition: true },
        },
        credit: true,
      },
    });

    if (!order) return { success: false, error: "Orden no encontrada" };
    if (order.status === "CANCELLED") return { success: false, error: "La orden ya está cancelada" };

    const result = await db.$transaction(async (tx) => {
      // 1. Cancelar la orden original
      await (tx as any).order.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationNote: cancellationNote || null,
        },
      });

      if (order.credit) {
        await closeOrderCredit(tx, orderId, "CANCELLED");
      }

      // 2. Regresar stock automáticamente al cancelar
      if (order.locationId) {
        for (const item of order.orderItems) {
          for (const comp of item.composition) {
            await tx.stock.upsert({
              where: {
                flavorId_locationId: {
                  flavorId: comp.flavorId,
                  locationId: order.locationId!,
                },
              },
              update: { quantity: { increment: comp.quantity * item.quantity } },
              create: {
                flavorId: comp.flavorId,
                locationId: order.locationId!,
                quantity: comp.quantity * item.quantity,
              },
            });
          }
        }
      }

      if (order.clientId) {
        await syncClientCreditUsage(tx, order.clientId);
      }

      // 3. Crear orden de reemplazo si se solicitó
      let replacementOrder = null;
      if (createReplacement) {
        replacementOrder = await (tx as any).order.create({
          data: {
            channel: order.channel,
            status: "PENDING",
            paymentMethod: order.paymentMethod,
            total: order.total,
            subtotal: order.subtotal ?? order.total,
            locationId: order.locationId,
            clientId: order.clientId,
            fullName: order.fullName,
            email: order.email,
            requiresInvoice: (order as any).requiresInvoice ?? false,
            notes: `Reemplazo de orden #${orderId.slice(-6).toUpperCase()}`,
            replacesOrderId: orderId,
            orderItems: {
              create: order.orderItems.map((item: ReplacementOrderItem) => ({
                productId: item.productId,
                flavorId: item.flavorId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
                composition: item.composition.length > 0
                  ? {
                      create: item.composition.map((c: ReplacementOrderItem["composition"][number]) => ({
                        flavorId: c.flavorId,
                        quantity: c.quantity,
                      })),
                    }
                  : undefined,
              })),
            },
          },
        });
      }

      return replacementOrder;
    });

    return {
      success: true,
      replacementOrderId: result?.id,
    };
  } catch (err: any) {
    console.error("cancelOrder error:", err);
    return { success: false, error: err.message };
  }
}
