"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

interface PosSaleData {
  locationId: string;
  cart: any[];
  total: number;
  method: string; // "CASH" | "CARD" | "TRANSFER"
  userEmail: string;
}

export async function processPosSale(data: PosSaleData) {
  const { locationId, cart, total, method, userEmail } = data;

  if (!cart || cart.length === 0) {
    throw new Error("El carrito está vacío");
  }

  // Usamos una transacción para asegurar que si falla algo, no se cobre ni se descuente inventario a medias.
  await db.$transaction(async (tx) => {
    
    // 1. Crear el Registro de la Venta como Order unificada con channel POS
    const order = await tx.order.create({
      data: {
        channel: "POS",
        status: "PAID",
        total,
        subtotal: total,
        paymentMethod: method,
        locationId,
        sellerId: userEmail,
        // Items de la venta
        orderItems: {
          create: cart.map((item) => ({
            productName: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            subtotal: item.price * item.quantity,
            // Si es botella, conectar con el flavor
            flavorId: item.type === "BOTTLE" ? item.id : null,
            // Si es pack, conectar con el product  
            productId: item.type === "PACK" ? item.id : null,
          })),
        },
      },
    });

    // 2. Descontar Inventario (SOLO SI ES BOTELLA/SABOR INDIVIDUAL)
    for (const item of cart) {
      if (item.type === "BOTTLE") {
        await tx.stock.update({
          where: {
            flavorId_locationId: {
              flavorId: item.id,
              locationId: locationId,
            },
          },
          data: {
            quantity: { decrement: item.quantity },
          },
        });

        await tx.inventoryMovement.create({
          data: {
            flavorId: item.id,
            locationId: locationId,
            type: "OUT",
            quantity: item.quantity,
            reason: "Venta en POS",
            userId: userEmail,
          }
        });
      }
    }
  });

  // 3. Recargar la página para ver el stock actualizado
  revalidatePath("/pos");
  revalidatePath("/admin");
  
  return { success: true };
}