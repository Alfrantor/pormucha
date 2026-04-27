"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";

// Actualizar precios base de un flavor
export async function updateFlavorPrices(
  flavorId: string,
  data: {
    basePrice: number;
    wholesalePrice?: number;
    minimumWholesale?: number;
    changeReason?: string;
    userId?: string;
  }
) {
  try {
    const flavor = await db.flavor.findUnique({
      where: { id: flavorId },
      select: { basePrice: true, price: true, wholesalePrice: true },
    });

    if (!flavor) {
      return { error: "Flavor no encontrado" };
    }

    // Usar basePrice si existe, sino usar price
    const currentPrice = flavor.basePrice || flavor.price || new Decimal(0);

    // Crear registro en historial
    if (currentPrice !== new Decimal(data.basePrice)) {
      await db.flavorPriceHistory.create({
        data: {
          flavorId,
          oldBasePrice: currentPrice,
          newBasePrice: new Decimal(data.basePrice),
          oldWholesale: flavor.wholesalePrice,
          newWholesale: data.wholesalePrice ? new Decimal(data.wholesalePrice) : null,
          changeReason: data.changeReason,
          userId: data.userId,
        },
      });
    }

    const updated = await db.flavor.update({
      where: { id: flavorId },
      data: {
        price: new Decimal(data.basePrice), // Mantener compatible
        basePrice: new Decimal(data.basePrice),
        wholesalePrice: data.wholesalePrice ? new Decimal(data.wholesalePrice) : null,
        minimumWholesale: data.minimumWholesale || 50,
      },
    });

    revalidatePath("/admin");
    return { success: true, flavor: updated };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Crear escala de precios
export async function createPriceScale(data: {
  flavorId: string;
  minQuantity: number;
  maxQuantity?: number;
  price: number;
}) {
  try {
    const scale = await db.flavorPriceScale.create({
      data: {
        flavorId: data.flavorId,
        minQuantity: data.minQuantity,
        maxQuantity: data.maxQuantity || null,
        price: new Decimal(data.price),
      },
    });

    revalidatePath("/admin/precios");
    return { success: true, scale };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { error: "Ya existe una escala con esa cantidad mínima" };
    }
    return { error: error.message };
  }
}

// Actualizar escala de precios
export async function updatePriceScale(
  id: string,
  data: {
    minQuantity?: number;
    maxQuantity?: number;
    price?: number;
  }
) {
  try {
    const scale = await db.flavorPriceScale.update({
      where: { id },
      data: {
        minQuantity: data.minQuantity,
        maxQuantity: data.maxQuantity || null,
        price: data.price ? new Decimal(data.price) : undefined,
      },
    });

    revalidatePath("/admin/precios");
    return { success: true, scale };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Eliminar escala de precios
export async function deletePriceScale(id: string) {
  try {
    await db.flavorPriceScale.delete({ where: { id } });
    revalidatePath("/admin/precios");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Crear descuento
export async function createDiscount(data: {
  flavorId: string;
  applicableTo: string;
  clientId?: string;
  discountPercent?: number;
  fixedPrice?: number;
  validUntil?: string;
}) {
  try {
    const discount = await db.flavorDiscount.create({
      data: {
        flavorId: data.flavorId,
        applicableTo: data.applicableTo,
        clientId: data.clientId,
        discountPercent: data.discountPercent,
        fixedPrice: data.fixedPrice ? new Decimal(data.fixedPrice) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
      },
    });

    revalidatePath("/admin/precios");
    return { success: true, discount };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Actualizar descuento
export async function updateDiscount(
  id: string,
  data: {
    discountPercent?: number;
    fixedPrice?: number;
    validUntil?: string;
  }
) {
  try {
    const discount = await db.flavorDiscount.update({
      where: { id },
      data: {
        discountPercent: data.discountPercent,
        fixedPrice: data.fixedPrice ? new Decimal(data.fixedPrice) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
      },
    });

    revalidatePath("/admin/precios");
    return { success: true, discount };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Eliminar descuento
export async function deleteDiscount(id: string) {
  try {
    await db.flavorDiscount.delete({ where: { id } });
    revalidatePath("/admin/precios");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Calcular precio final (usar en checkout y pedidos)
export async function calculateFlavorPrice(
  flavorId: string,
  quantity: number,
  clientId?: string
): Promise<{
  basePrice: number;
  finalPrice: number;
  discount: number;
  scaling?: boolean;
  breakdown: string;
}> {
  try {
    const flavor = await db.flavor.findUnique({
      where: { id: flavorId },
      include: {
        priceScales: {
          orderBy: { minQuantity: "asc" },
        },
        discounts: {
          where: {
            OR: [{ applicableTo: "TODAS" }, { clientId: clientId || "" }],
            validUntil: { gte: new Date() },
          },
        },
      },
    });

    if (!flavor) {
      throw new Error("Flavor no encontrado");
    }

    let finalPrice: Decimal = flavor.basePrice ?? new Decimal(0);
    let basePrice = flavor.basePrice;
    let discount = 0;
    let scaling = false;
    let breakdown = "Precio minorista";

    // 1. Aplicar escala de precios por cantidad
    const isWholesale = quantity >= flavor.minimumWholesale;
    if (isWholesale && flavor.wholesalePrice) {
      const scale = flavor.priceScales.find(
        (s) => quantity >= s.minQuantity && (!s.maxQuantity || quantity <= s.maxQuantity)
      );

      if (scale) {
        finalPrice = new Decimal(scale.price);
        scaling = true;
        breakdown = `Escala: ${scale.minQuantity}-${scale.maxQuantity || "∞"} unidades`;
      } else if (flavor.wholesalePrice) {
        finalPrice = new Decimal(flavor.wholesalePrice);
        scaling = true;
        breakdown = "Precio mayorista";
      }
    }

    // 2. Aplicar descuentos específicos
    if (clientId) {
      const client = await db.client.findUnique({
        where: { id: clientId },
        select: { classification: true, globalDiscount: true },
      });

      if (client) {
        // Descuento específico para cliente
        const clientDiscount = flavor.discounts.find((d) => d.clientId === clientId);
        if (clientDiscount) {
          if (clientDiscount.fixedPrice) {
            finalPrice = new Decimal(clientDiscount.fixedPrice);
            discount = 0;
            breakdown += " + descuento especial (precio fijo)";
          } else if (clientDiscount.discountPercent) {
            discount = clientDiscount.discountPercent;
            finalPrice = finalPrice.mul(new Decimal(1 - discount / 100));
            breakdown += ` + ${discount}% descuento especial`;
          }
        } else {
          // Descuento por clasificación
          const classificationDiscount = flavor.discounts.find(
            (d) => d.applicableTo === client.classification
          );
          if (classificationDiscount?.discountPercent) {
            discount = classificationDiscount.discountPercent;
            finalPrice = finalPrice.mul(new Decimal(1 - discount / 100));
            breakdown += ` + ${discount}% (${client.classification})`;
          } else if (client.globalDiscount) {
            // Descuento global del cliente
            discount = client.globalDiscount;
            finalPrice = finalPrice.mul(new Decimal(1 - discount / 100));
            breakdown += ` + ${discount}% descuento global`;
          }
        }
      }
    }

    return {
      basePrice: Number(basePrice),
      finalPrice: Number(finalPrice),
      discount,
      scaling,
      breakdown,
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

// Obtener historial de precios
export async function getPriceHistory(flavorId: string, limit = 20) {
  try {
    const history = await db.flavorPriceHistory.findMany({
      where: { flavorId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return history;
  } catch (error) {
    return [];
  }
}
