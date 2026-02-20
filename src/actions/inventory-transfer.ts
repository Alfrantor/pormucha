"use server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function transferStock(formData: FormData) {
  const flavorId = formData.get("flavorId") as string;
  const fromLocationId = formData.get("fromLocationId") as string;
  const toLocationId = formData.get("toLocationId") as string;
  const quantity = parseInt(formData.get("quantity") as string);
  const userEmail = formData.get("userEmail") as string;

  // --- 1. NUEVA VALIDACIÓN DE SEGURIDAD ---
  // Evitamos mover de "Bodega" a "Bodega", lo cual ensuciaría el Kardex sin sentido.
  if (fromLocationId === toLocationId) {
    return { error: "El almacén de origen y destino no pueden ser el mismo." };
  }

  // Validar cantidad positiva
  if (quantity <= 0) return { error: "La cantidad debe ser mayor a 0." };

  try {
    // 2. Validar Stock en el Origen
    const sourceStock = await db.stock.findUnique({
      where: { flavorId_locationId: { flavorId, locationId: fromLocationId } }
    });
    
    // Si no existe registro o la cantidad es menor a la solicitada
    if (!sourceStock || sourceStock.quantity < quantity) {
      return { error: `Stock insuficiente en origen. Disponibles: ${sourceStock?.quantity || 0}` };
    }

    // 3. Ejecutar Transacción Atómica (Todo o nada)
    await db.$transaction(async (tx) => {
      
      // A. Restar del Origen
      await tx.stock.update({
        where: { id: sourceStock.id },
        data: { quantity: { decrement: quantity } }
      });

      // B. Sumar al Destino (Crear registro si es la primera vez que esa sucursal tiene ese producto)
      await tx.stock.upsert({
        where: { flavorId_locationId: { flavorId, locationId: toLocationId } },
        create: { flavorId, locationId: toLocationId, quantity: quantity },
        update: { quantity: { increment: quantity } }
      });

      // C. Registrar SALIDA en Kardex (Origen)
      await tx.inventoryMovement.create({
        data: {
          flavorId,
          locationId: fromLocationId,
          type: "TRANSFER_OUT",
          quantity: quantity,
          reason: `Traspaso SALIDA hacia: ${toLocationId}`, // Podrías buscar el nombre de la locación si quisieras ser más específico, pero el ID sirve
          userId: userEmail
        }
      });

      // D. Registrar ENTRADA en Kardex (Destino)
      await tx.inventoryMovement.create({
        data: {
          flavorId,
          locationId: toLocationId,
          type: "TRANSFER_IN",
          quantity: quantity,
          reason: `Traspaso ENTRADA desde: ${fromLocationId}`,
          userId: userEmail
        }
      });
    });

    // 4. Actualizar vistas
    revalidatePath("/admin");
    revalidatePath("/pos");
    
    return { success: true };

  } catch (error: any) {
    console.error("Error en transferencia:", error);
    return { error: error.message || "Error al procesar la transferencia" };
  }
}