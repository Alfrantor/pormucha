import { db } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

interface PriceCalculation {
  basePrice: number;
  finalPrice: number;
  discountPercent: number;
  scaling: boolean;
  breakdown: string;
}

/**
 * Calcula el precio final de un flavor considerando:
 * 1. Escalas de precio por cantidad
 * 2. Descuentos específicos del cliente
 * 3. Descuentos por clasificación
 * 4. Descuentos globales del cliente
 */
export async function calculateFlavorPrice(
  flavorId: string,
  quantity: number,
  clientId?: string
): Promise<PriceCalculation> {
  const flavor = await db.flavor.findUnique({
    where: { id: flavorId },
    include: {
      priceScales: {
        orderBy: { minQuantity: "asc" },
      },
      discounts: {
        where: {
          OR: [
            { applicableTo: "TODAS" },
            { clientId: clientId || "" },
          ],
          validUntil: { gte: new Date() },
        },
      },
    },
  });

  if (!flavor) {
    throw new Error(`Flavor con ID ${flavorId} no encontrado`);
  }

  // Usar basePrice si existe, sino usar price (compatibilidad)
  const priceValue = flavor.basePrice || flavor.price || new Decimal(0);
  let finalPrice = new Decimal(priceValue);
  const basePrice = new Decimal(priceValue);
  let discountPercent = 0;
  let scaling = false;
  let breakdown = "Precio minorista";

  // 1. Aplicar escala de precios por cantidad
  const isWholesale = quantity >= flavor.minimumWholesale;
  if (isWholesale) {
    // Buscar escala exacta
    const scale = flavor.priceScales.find(
      (s) =>
        quantity >= s.minQuantity &&
        (!s.maxQuantity || quantity <= s.maxQuantity)
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

  // 2. Aplicar descuentos específicos (si hay cliente)
  if (clientId) {
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: {
        classification: true,
        globalDiscount: true,
      },
    });

    if (client) {
      // Buscar descuento específico para este cliente
      const clientDiscount = flavor.discounts.find(
        (d) => d.clientId === clientId && d.applicableTo === "CLIENTE"
      );

      if (clientDiscount) {
        if (clientDiscount.fixedPrice) {
          finalPrice = new Decimal(clientDiscount.fixedPrice);
          discountPercent = 0;
          breakdown += " + descuento especial (precio fijo)";
        } else if (clientDiscount.discountPercent) {
          discountPercent = clientDiscount.discountPercent;
          finalPrice = finalPrice.mul(
            new Decimal(1 - discountPercent / 100)
          );
          breakdown += ` + ${discountPercent}% descuento especial`;
        }
      } else {
        // Buscar descuento por clasificación
        const classificationDiscount = flavor.discounts.find(
          (d) => d.applicableTo === client.classification
        );

        if (classificationDiscount?.discountPercent) {
          discountPercent = classificationDiscount.discountPercent;
          finalPrice = finalPrice.mul(
            new Decimal(1 - discountPercent / 100)
          );
          breakdown += ` + ${discountPercent}% (${client.classification})`;
        } else if (client.globalDiscount && discountPercent === 0) {
          // Descuento global del cliente
          discountPercent = client.globalDiscount;
          finalPrice = finalPrice.mul(
            new Decimal(1 - discountPercent / 100)
          );
          breakdown += ` + ${discountPercent}% descuento global`;
        }
      }
    }
  }

  return {
    basePrice: Number(basePrice),
    finalPrice: Number(finalPrice),
    discountPercent,
    scaling,
    breakdown,
  };
}

/**
 * Calcula precio para múltiples items (usado en carritos)
 */
export async function calculateCartTotal(
  items: Array<{ flavorId: string; quantity: number }>,
  clientId?: string
): Promise<{
  items: Array<{
    flavorId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotal: number;
  total: number;
}> {
  const cartItems = await Promise.all(
    items.map(async (item) => {
      const pricing = await calculateFlavorPrice(
        item.flavorId,
        item.quantity,
        clientId
      );
      return {
        flavorId: item.flavorId,
        quantity: item.quantity,
        unitPrice: pricing.finalPrice,
        subtotal: pricing.finalPrice * item.quantity,
      };
    })
  );

  const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    items: cartItems,
    subtotal,
    total: subtotal,
  };
}

/**
 * Obtiene el historial de precios de un flavor
 */
export async function getFlavorPriceHistory(
  flavorId: string,
  limit = 20
) {
  const history = await db.flavorPriceHistory.findMany({
    where: { flavorId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return history;
}

/**
 * Obtiene descuentos activos para un cliente
 */
export async function getClientDiscounts(clientId: string) {
  const client = await db.client.findUnique({
    where: { id: clientId },
    include: {
      flavorDiscounts: {
        where: {
          validUntil: { gte: new Date() },
        },
      },
    },
  });

  return {
    globalDiscount: client?.globalDiscount,
    classification: client?.classification,
    specificDiscounts: client?.flavorDiscounts || [],
  };
}
