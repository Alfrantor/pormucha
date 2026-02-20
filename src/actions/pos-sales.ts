"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

interface PosSaleData {
  locationId: string;
  cart: any[];
  total: number;
  method: string; // "CASH" | "CARD"
  userEmail: string;
}

export async function processPosSale(data: PosSaleData) {
  const { locationId, cart, total, method, userEmail } = data;

  if (!cart || cart.length === 0) {
    throw new Error("El carrito está vacío");
  }

  // Usamos una transacción para asegurar que si falla algo, no se cobre ni se descuente inventario a medias.
  await db.$transaction(async (tx) => {
    
    // 1. Crear el Registro de la Venta (Cabecera)
    const sale = await tx.posSale.create({
      data: {
        locationId,
        total,
        paymentMethod: method,
        status: "COMPLETED",
        userId: userEmail,
      },
    });

    // 2. Procesar cada ítem del carrito
    for (const item of cart) {
      
      // A. Guardar el detalle de venta (Item)
      await tx.posSaleItem.create({
        data: {
          saleId: sale.id,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        },
      });

      // B. Descontar Inventario (SOLO SI ES BOTELLA/SABOR INDIVIDUAL)
      // Si vendes Packs, por ahora solo registramos la venta sin descontar botellas 
      // (a menos que quieras agregar lógica compleja de desglose de packs).
      if (item.type === "BOTTLE") {
        await tx.stock.update({
          where: {
            // Buscamos el stock específico de ese sabor en ESA tienda
            flavorId_locationId: {
              flavorId: item.id,
              locationId: locationId,
            },
          },
          data: {
            quantity: { decrement: item.quantity },
          },
        });
      }
    }
  });

  // 3. Recargar la página para ver el stock actualizado
  revalidatePath("/pos");
  revalidatePath("/admin");
  
  return { success: true };
}