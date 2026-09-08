"use server";

import { db } from "@/lib/db";
import { createShippingLabel } from "@/lib/shipping-service";
import { ensureProductImageEuroSchema } from "@/lib/product-schema";
import { ensureFlavorPresentationSchema } from "@/lib/flavor-presentation-schema";
import { serializeFlavorPresentations } from "@/lib/flavor-presentations";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";

// ==========================================
// UBICACIONES
// ==========================================
function revalidateLocationViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/catalog/locations");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/raw-materials");
  revalidatePath("/admin/production");
  revalidatePath("/pos");
}

export async function createLocation(formData: FormData) {
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  await db.location.create({ data: { name, address, isDefault: false } });
  revalidateLocationViews();
}

export async function updateLocation(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  await db.location.update({ where: { id }, data: { name, address } });
  revalidateLocationViews();
}

export async function createCatalogLocation(data: {
  name: string;
  address?: string;
  isDefault?: boolean;
}): Promise<{ success: boolean; location?: { id: string; name: string; address: string | null; isDefault: boolean; isArchived: boolean }; error?: string }> {
  try {
    const name = data.name.trim();
    const address = data.address?.trim() || null;
    if (!name) return { success: false, error: "El nombre es obligatorio." };

    const location = await db.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.location.updateMany({ data: { isDefault: false } });
      }

      return tx.location.create({
        data: {
          name,
          address,
          isDefault: Boolean(data.isDefault),
        },
        select: {
          id: true,
          name: true,
          address: true,
          isDefault: true,
          isArchived: true,
        },
      });
    });

    revalidateLocationViews();
    return { success: true, location };
  } catch (error: any) {
    return { success: false, error: error.message || "No se pudo crear la ubicación." };
  }
}

export async function updateCatalogLocation(
  id: string,
  data: { name: string; address?: string; isDefault?: boolean },
): Promise<{ success: boolean; error?: string }> {
  try {
    const name = data.name.trim();
    const address = data.address?.trim() || null;
    if (!name) return { success: false, error: "El nombre es obligatorio." };

    await db.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.location.updateMany({
          where: { id: { not: id } },
          data: { isDefault: false },
        });
      }

      await tx.location.update({
        where: { id },
        data: {
          name,
          address,
          isDefault: Boolean(data.isDefault),
        },
      });
    });

    revalidateLocationViews();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "No se pudo actualizar la ubicación." };
  }
}

export async function archiveCatalogLocation(id: string, archive: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const location = await db.location.findUnique({
      where: { id },
      include: {
        stocks: { select: { quantity: true } },
        rawMaterialStocks: { select: { quantity: true } },
      },
    });

    if (!location) return { success: false, error: "La ubicación no existe." };
    if (archive && location.isDefault) {
      return { success: false, error: "No se puede archivar la ubicación principal." };
    }

    if (archive) {
      const productStock = location.stocks.reduce((sum, stock) => sum + Number(stock.quantity || 0), 0);
      const rawMaterialStock = location.rawMaterialStocks.reduce((sum, stock) => sum + Number(stock.quantity || 0), 0);
      const [openProductions, openGasification, openLabeling] = await Promise.all([
        db.production.count({
          where: {
            status: "IN_PROGRESS",
            OR: [
              { ingredients: { some: { locationId: id } } },
              { additions: { some: { locationId: id } } },
            ],
          },
        }),
        db.gasificationBatch.count({ where: { locationId: id, status: "IN_PROGRESS" } }),
        db.labelingBatch.count({ where: { locationId: id, status: "IN_PROGRESS" } }),
      ]);
      const openProcesses = openProductions + openGasification + openLabeling;

      if (productStock > 0 || rawMaterialStock > 0 || openProcesses > 0) {
        return {
          success: false,
          error: "No se puede archivar porque tiene inventario o procesos activos.",
        };
      }
    }

    await db.location.update({
      where: { id },
      data: { isArchived: archive },
    });

    revalidateLocationViews();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "No se pudo cambiar el estado de la ubicación." };
  }
}

// ==========================================
// INVENTARIO
// ==========================================
export async function registerMovement(formData: FormData) {
  const flavorId = formData.get("flavorId") as string;
  const type = formData.get("type") as "IN" | "OUT";
  const quantity = parseInt(formData.get("quantity") as string);
  const reason = formData.get("reason") as string;
  const adminEmail = formData.get("adminEmail") as string;
  const locationId = formData.get("locationId") as string;

  if (quantity <= 0) return;

  await db.inventoryMovement.create({
    data: { flavorId, locationId, type, quantity, reason, userId: adminEmail }
  });

  const operation = type === "IN" ? { increment: quantity } : { decrement: quantity };

  await db.stock.upsert({
    where: { flavorId_locationId: { flavorId, locationId } },
    create: { flavorId, locationId, quantity: type === "IN" ? quantity : 0 },
    update: { quantity: operation }
  });

  revalidatePath("/admin");
}

// ==========================================
// TRANSFERS / TRASPASOS EN TRÁNSITO
// ==========================================
export async function createTransfer(formData: FormData) {
  const flavorId = formData.get("flavorId") as string;
  const fromLocationId = formData.get("fromLocationId") as string;
  const toLocationId = formData.get("toLocationId") as string;
  const quantitySent = parseInt(formData.get("quantitySent") as string);
  const senderEmail = formData.get("senderEmail") as string;
  const observations = String(formData.get("observations") || "").trim();

  try {
    if (!flavorId || !fromLocationId || !toLocationId) {
      throw new Error("Selecciona producto, origen y destino.");
    }

    if (!Number.isFinite(quantitySent) || quantitySent <= 0) {
      throw new Error("La cantidad debe ser mayor a cero.");
    }

    if (fromLocationId === toLocationId) {
      throw new Error("El origen y destino no pueden ser el mismo almacén.");
    }

    const result = await db.$transaction(async (tx) => {
      const [flavor, fromLocation, toLocation, currentStock] = await Promise.all([
        tx.flavor.findUnique({ where: { id: flavorId }, select: { id: true, name: true } }),
        tx.location.findUnique({ where: { id: fromLocationId }, select: { id: true, name: true } }),
        tx.location.findUnique({ where: { id: toLocationId }, select: { id: true, name: true } }),
        tx.stock.findUnique({ where: { flavorId_locationId: { flavorId, locationId: fromLocationId } } }),
      ]);

      if (!flavor) throw new Error("El producto seleccionado no existe.");
      if (!fromLocation) throw new Error("El almacén de origen no existe.");
      if (!toLocation) throw new Error("El almacén de destino no existe.");
      if (!currentStock || currentStock.quantity < quantitySent) {
        throw new Error(`No hay suficiente stock en origen. Disponibles: ${currentStock?.quantity || 0} pzas.`);
      }

      await tx.stock.update({
        where: { flavorId_locationId: { flavorId, locationId: fromLocationId } },
        data: { quantity: { decrement: quantitySent } }
      });

      await tx.inventoryMovement.create({
        data: {
          flavorId,
          locationId: fromLocationId,
          type: "OUT",
          quantity: quantitySent,
          reason: `Traspaso en tránsito hacia ${toLocation.name}`,
          userId: senderEmail
        }
      });

      const transfer = await tx.transfer.create({
        data: { flavorId, fromLocationId, toLocationId, quantitySent, senderEmail, observations, status: "PENDING" },
        include: { flavor: true, fromLocation: true, toLocation: true },
      });

      return transfer;
    });

    revalidatePath("/admin/inventory/transfers");
    revalidatePath("/admin/inventory/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    revalidatePath("/pos");

    return { success: true, transferId: result.id };
  } catch (err: any) {
    return { success: false, error: err.message || "No se pudo crear el traspaso." };
  }
}

export async function receiveTransfer(formData: FormData) {
  const transferId = formData.get("transferId") as string;
  const quantityReceived = parseInt(formData.get("quantityReceived") as string);
  const receiverEmail = formData.get("receiverEmail") as string;
  const obs = String(formData.get("observations") || "").trim();

  try {
    if (!transferId) throw new Error("No se encontró el traspaso.");
    if (!Number.isFinite(quantityReceived) || quantityReceived < 0) {
      throw new Error("La cantidad recibida debe ser válida.");
    }

    const result = await db.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
        include: { flavor: true, fromLocation: true, toLocation: true },
      });

      if (!transfer) throw new Error("El traspaso no existe.");
      if (transfer.status !== "PENDING") throw new Error("Este traspaso ya fue cerrado.");
      if (quantityReceived > transfer.quantitySent) {
        throw new Error("No puedes recibir más piezas de las enviadas.");
      }

      const finalObs = obs ? `${transfer.observations || ""}${transfer.observations ? "\n" : ""}[Recepción]: ${obs}` : transfer.observations;
      const shrinkage = transfer.quantitySent - quantityReceived;

      const updatedTransfer = await tx.transfer.update({
        where: { id: transferId },
        data: { status: "COMPLETED", quantityReceived, receiverEmail, observations: finalObs },
        include: { flavor: true, fromLocation: true, toLocation: true },
      });

      if (quantityReceived > 0) {
        await tx.stock.upsert({
          where: { flavorId_locationId: { flavorId: transfer.flavorId, locationId: transfer.toLocationId } },
          create: { flavorId: transfer.flavorId, locationId: transfer.toLocationId, quantity: quantityReceived },
          update: { quantity: { increment: quantityReceived } }
        });
        await tx.inventoryMovement.create({
          data: {
            flavorId: transfer.flavorId,
            locationId: transfer.toLocationId,
            type: "IN",
            quantity: quantityReceived,
            reason: `Recepción de traspaso desde ${transfer.fromLocation.name}`,
            userId: receiverEmail
          }
        });
      }

      if (shrinkage > 0) {
        await tx.inventoryMovement.create({
          data: {
            flavorId: transfer.flavorId,
            locationId: transfer.fromLocationId,
            type: "OUT",
            quantity: shrinkage,
            reason: `Merma/Pérdida en traspaso ${transferId}`,
            userId: receiverEmail
          }
        });
      }

      return updatedTransfer;
    });

    revalidatePath("/admin/inventory/transfers");
    revalidatePath("/admin/inventory/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    revalidatePath("/pos");

    return { success: true, transferId: result.id };
  } catch (err: any) {
    return { success: false, error: err.message || "No se pudo recibir el traspaso." };
  }
}

export async function cancelTransfer(formData: FormData) {
  const transferId = formData.get("transferId") as string;
  const userEmail = formData.get("userEmail") as string;
  const reason = String(formData.get("reason") || "").trim();

  try {
    if (!transferId) throw new Error("No se encontró el traspaso.");
    if (!reason) throw new Error("Escribe el motivo de cancelación.");

    const result = await db.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
        include: { flavor: true, fromLocation: true, toLocation: true },
      });

      if (!transfer) throw new Error("El traspaso no existe.");
      if (transfer.status !== "PENDING") throw new Error("Solo se pueden cancelar traspasos en tránsito.");

      await tx.stock.upsert({
        where: { flavorId_locationId: { flavorId: transfer.flavorId, locationId: transfer.fromLocationId } },
        create: { flavorId: transfer.flavorId, locationId: transfer.fromLocationId, quantity: transfer.quantitySent },
        update: { quantity: { increment: transfer.quantitySent } },
      });

      await tx.inventoryMovement.create({
        data: {
          flavorId: transfer.flavorId,
          locationId: transfer.fromLocationId,
          type: "IN",
          quantity: transfer.quantitySent,
          reason: `Cancelación de traspaso | ${reason}`,
          userId: userEmail,
        },
      });

      return tx.transfer.update({
        where: { id: transferId },
        data: {
          status: "CANCELLED",
          receiverEmail: userEmail,
          quantityReceived: 0,
          observations: `${transfer.observations || ""}${transfer.observations ? "\n" : ""}[Cancelación]: ${reason}`,
        },
        include: { flavor: true, fromLocation: true, toLocation: true },
      });
    });

    revalidatePath("/admin/inventory/transfers");
    revalidatePath("/admin/inventory/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    revalidatePath("/pos");

    return { success: true, transferId: result.id };
  } catch (err: any) {
    return { success: false, error: err.message || "No se pudo cancelar el traspaso." };
  }
}

// ==========================================
// PRECIOS
// ==========================================
export async function updatePackPrice(formData: FormData) {
  const productId = formData.get("productId") as string;
  const newPrice = parseFloat(formData.get("newPrice") as string);
  const adminEmail = formData.get("adminEmail") as string;
  const currentProduct = await db.product.findUnique({ where: { id: productId } });
  if (!currentProduct || Number(currentProduct.price) === newPrice) return;
  await db.productPriceHistory.create({ data: { productId, oldPrice: currentProduct.price, newPrice, userId: adminEmail } });
  await db.product.update({ where: { id: productId }, data: { price: newPrice } });

  const updatedProduct = await db.product.findUnique({
    where: { id: productId },
    include: { plans: true },
  });

  if (updatedProduct) {
    const discountPercent = Number(updatedProduct.clubDiscountPercent || 0);
    const subscriptionPrice = Math.max(0, newPrice * (1 - discountPercent / 100));

    await Promise.all(
      updatedProduct.plans.map((plan) =>
        db.plan.update({
          where: { id: plan.id },
          data: {
            price: subscriptionPrice,
            stripePriceId: null,
          },
        })
      )
    );
  }

  revalidatePath("/admin");
  revalidatePath("/tienda");
  revalidatePath("/suscripciones");
}

export async function updateCatalogProduct(formData: FormData) {
  const productId = formData.get("productId") as string;
  const name = ((formData.get("name") as string) || "").trim();
  const newPrice = parseFloat(formData.get("newPrice") as string);
  const quantity = parseInt(formData.get("quantity") as string);
  const clubDiscountPercent = parseInt(formData.get("clubDiscountPercent") as string);
  const safeDiscount = Number.isNaN(clubDiscountPercent) ? 0 : Math.max(0, Math.min(100, clubDiscountPercent));

  const currentProduct = await db.product.findUnique({
    where: { id: productId },
    include: { plans: true },
  });

  if (!currentProduct || !name || Number.isNaN(newPrice) || Number.isNaN(quantity) || quantity <= 0) return;

  if (Number(currentProduct.price) !== newPrice) {
    await db.productPriceHistory.create({
      data: {
        productId,
        oldPrice: currentProduct.price,
        newPrice,
        userId: ((formData.get("adminEmail") as string) || "system").trim(),
      },
    });
  }

  await db.product.update({
    where: { id: productId },
    data: {
      name,
      price: newPrice,
      quantity,
      clubDiscountPercent: safeDiscount,
    },
  });

  const subscriptionPrice = Math.max(0, newPrice * (1 - safeDiscount / 100));
  await Promise.all(
    currentProduct.plans.map((plan) =>
      db.plan.update({
        where: { id: plan.id },
        data: {
          price: subscriptionPrice,
          stripePriceId: null,
        },
      })
    )
  );

  revalidatePath("/admin");
  revalidatePath("/admin/catalog/products");
  revalidatePath("/admin/catalog/products?scope=web");
  revalidatePath("/pos");
  revalidatePath("/tienda");
  revalidatePath("/suscripciones");
}

export async function updateFlavorPrice(formData: FormData) {
  const flavorId = formData.get("flavorId") as string;
  const newPrice = parseFloat(formData.get("newPrice") as string);
  const adminEmail = formData.get("adminEmail") as string;
  const currentFlavor = await db.flavor.findUnique({ where: { id: flavorId } });
  if (!currentFlavor || Number(currentFlavor.price) === newPrice) return;

  const oldPriceDecimal = new Decimal(currentFlavor.price || 0);
  const newPriceDecimal = new Decimal(newPrice);

  await db.flavorPriceHistory.create({
    data: {
      flavorId,
      oldBasePrice: oldPriceDecimal,
      newBasePrice: newPriceDecimal,
      userId: adminEmail
    }
  });
  await db.flavor.update({ where: { id: flavorId }, data: { price: newPrice, basePrice: newPrice } });
  revalidatePath("/admin");
  revalidatePath("/admin/catalog/products");
  revalidatePath("/admin/pricing");
  revalidatePath("/tienda");
  revalidatePath("/pos");
}

export async function updateCatalogFlavor(formData: FormData) {
  await ensureFlavorPresentationSchema();

  const flavorId = formData.get("flavorId") as string;
  const name = ((formData.get("name") as string) || "").trim();
  const slug = ((formData.get("slug") as string) || "").trim();
  const newPrice = parseFloat(formData.get("newPrice") as string);
  const presentations = serializeFlavorPresentations(formData.get("presentations"));
  const adminEmail = ((formData.get("adminEmail") as string) || "system").trim();
  const currentFlavor = await db.flavor.findUnique({ where: { id: flavorId } });

  if (!currentFlavor || !name || !slug || Number.isNaN(newPrice)) return;

  if (Number(currentFlavor.price || 0) !== newPrice) {
    await db.flavorPriceHistory.create({
      data: {
        flavorId,
        oldBasePrice: new Decimal(currentFlavor.price || 0),
        newBasePrice: new Decimal(newPrice),
        userId: adminEmail,
      },
    });
  }

  await db.flavor.update({
    where: { id: flavorId },
    data: {
      name,
      slug,
      price: newPrice,
      basePrice: newPrice,
      presentations,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/catalog/products");
  revalidatePath("/admin/catalog/products?scope=web");
  revalidatePath("/admin/pricing");
  revalidatePath("/pos");
  revalidatePath("/tienda");
  revalidatePath("/suscripciones");
}

export async function updatePackImage(formData: FormData) {
  const productId = formData.get("productId") as string;
  const image = ((formData.get("image") as string) || "").trim();

  await db.product.update({
    where: { id: productId },
    data: { image: image || null },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/catalog/products");
  revalidatePath("/tienda");
  revalidatePath("/suscripciones");
}

export async function updatePackSubscriptionCopy(formData: FormData) {
  const productId = formData.get("productId") as string;
  const subscriptionNote = ((formData.get("subscriptionNote") as string) || "").trim();
  const subscriptionBenefit1 = ((formData.get("subscriptionBenefit1") as string) || "").trim();
  const subscriptionBenefit2 = ((formData.get("subscriptionBenefit2") as string) || "").trim();
  const subscriptionBenefit3 = ((formData.get("subscriptionBenefit3") as string) || "").trim();

  await db.product.update({
    where: { id: productId },
    data: {
      subscriptionNote: subscriptionNote || null,
      subscriptionBenefit1: subscriptionBenefit1 || null,
      subscriptionBenefit2: subscriptionBenefit2 || null,
      subscriptionBenefit3: subscriptionBenefit3 || null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/catalog/products");
  revalidatePath("/suscripciones");
}

export async function updateWebPackSettings(formData: FormData) {
  await ensureProductImageEuroSchema();

  const productId = formData.get("productId") as string;
  const adminEmail = (formData.get("adminEmail") as string) || "system";
  const newPrice = parseFloat((formData.get("newPrice") as string) || "0");
  const discountPercent = parseFloat((formData.get("clubDiscountPercent") as string) || "0");
  const image = ((formData.get("image") as string) || "").trim();
  const imageEuro = ((formData.get("imageEuro") as string) || "").trim();
  const subscriptionNote = ((formData.get("subscriptionNote") as string) || "").trim();
  const subscriptionBenefit1 = ((formData.get("subscriptionBenefit1") as string) || "").trim();
  const subscriptionBenefit2 = ((formData.get("subscriptionBenefit2") as string) || "").trim();
  const subscriptionBenefit3 = ((formData.get("subscriptionBenefit3") as string) || "").trim();

  const currentProduct = await db.product.findUnique({
    where: { id: productId },
    include: { plans: true },
  });

  if (!currentProduct) return;

  const safePrice = Number.isFinite(newPrice) ? Math.max(0, newPrice) : Number(currentProduct.price || 0);
  const safeDiscount = Number.isFinite(discountPercent) ? Math.min(100, Math.max(0, discountPercent)) : Number(currentProduct.clubDiscountPercent || 0);
  const priceChanged = Number(currentProduct.price || 0) !== safePrice;
  const discountChanged = Number(currentProduct.clubDiscountPercent || 0) !== safeDiscount;

  if (priceChanged) {
    await db.productPriceHistory.create({
      data: {
        productId,
        oldPrice: currentProduct.price,
        newPrice: safePrice,
        userId: adminEmail,
      },
    });
  }

  await db.product.update({
    where: { id: productId },
    data: {
      price: safePrice,
      clubDiscountPercent: safeDiscount,
      image: image || null,
      subscriptionNote: subscriptionNote || null,
      subscriptionBenefit1: subscriptionBenefit1 || null,
      subscriptionBenefit2: subscriptionBenefit2 || null,
      subscriptionBenefit3: subscriptionBenefit3 || null,
    },
  });

  await db.$executeRaw`
    UPDATE "Product"
    SET "imageEuro" = ${imageEuro || null}
    WHERE "id" = ${productId}
  `;

  if (priceChanged || discountChanged) {
    const subscriptionPrice = Math.max(0, safePrice * (1 - safeDiscount / 100));

    await Promise.all(
      currentProduct.plans.map((plan) =>
        db.plan.update({
          where: { id: plan.id },
          data: {
            price: subscriptionPrice,
            stripePriceId: null,
          },
        })
      )
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/catalog/products");
  revalidatePath("/tienda");
  revalidatePath("/suscripciones");
}

export async function updateFlavorImages(formData: FormData) {
  const flavorId = formData.get("flavorId") as string;
  const image = ((formData.get("image") as string) || "").trim();
  const imageEuro = ((formData.get("imageEuro") as string) || "").trim();

  await db.flavor.update({
    where: { id: flavorId },
    data: {
      image: image || null,
      imageEuro: imageEuro || null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/catalog/products");
  revalidatePath("/tienda");
  revalidatePath("/checkout");
}

// ==========================================
// PRODUCTOS Y SABORES
// ==========================================
export async function createProduct(formData: FormData) {
  const name = ((formData.get("name") as string) || "").trim();
  const price = parseFloat(formData.get("price") as string);
  const quantity = parseInt(formData.get("quantity") as string);
  const clubDiscountPercent = parseInt(formData.get("clubDiscountPercent") as string) || 0;
  const image = ((formData.get("image") as string) || "").trim();

  const weight = parseFloat(formData.get("weight") as string) || 1.5;
  const height = parseFloat(formData.get("height") as string) || 20;
  const width = parseFloat(formData.get("width") as string) || 20;
  const length = parseFloat(formData.get("length") as string) || 20;

  await db.product.create({ data: { name, price, quantity, clubDiscountPercent, image: image || null, weight, height, width, length } });
  revalidatePath("/admin");
  revalidatePath("/admin/catalog/products");
  revalidatePath("/admin/catalog/products?scope=web");
  revalidatePath("/pos");
  revalidatePath("/tienda");
  revalidatePath("/suscripciones");
}

export async function updateProductDimensions(formData: FormData) {
  const productId = formData.get("productId") as string;
  const weight = parseFloat(formData.get("weight") as string);
  const height = parseFloat(formData.get("height") as string);
  const width = parseFloat(formData.get("width") as string);
  const length = parseFloat(formData.get("length") as string);
  await db.product.update({ where: { id: productId }, data: { weight, height, width, length } });
  revalidatePath("/admin");
}

export async function createFlavor(formData: FormData) {
  await ensureFlavorPresentationSchema();

  const name = ((formData.get("name") as string) || "").trim();
  const slug = ((formData.get("slug") as string) || "").trim();
  const price = parseFloat(formData.get("price") as string);
  const image = ((formData.get("image") as string) || "").trim();
  const imageEuro = ((formData.get("imageEuro") as string) || "").trim();
  const presentations = serializeFlavorPresentations(formData.get("presentations"));
  const initialStock = parseInt(formData.get("stock") as string) || 0;
  const adminEmail = formData.get("adminEmail") as string || "system";

  // 1. Buscamos la ubicación predeterminada (donde entrará el stock inicial)
  const defaultLocation = await db.location.findFirst({
    where: { isDefault: true }
  }) || await db.location.findFirst(); // Si no hay default, agarra la primera que encuentre

  // 2. Creamos el sabor
  const newFlavor = await db.flavor.create({
    data: { name, slug, price, basePrice: price, image: image || null, imageEuro: imageEuro || null, presentations }
  });

  // 3. Si mandaste un stock inicial, lo registramos en la ubicación encontrada
  if (initialStock > 0 && defaultLocation) {
    await db.stock.create({
      data: {
        flavorId: newFlavor.id,
        locationId: defaultLocation.id,
        quantity: initialStock
      }
    });

    // 4. Dejamos rastro en el historial de movimientos
    await db.inventoryMovement.create({
      data: {
        flavorId: newFlavor.id,
        locationId: defaultLocation.id,
        type: "IN",
        quantity: initialStock,
        reason: "Stock inicial al crear sabor",
        userId: adminEmail
      }
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/catalog/products");
  revalidatePath("/admin/catalog/products?scope=web");
  revalidatePath("/admin/pricing");
  revalidatePath("/pos");
  revalidatePath("/tienda");
  revalidatePath("/suscripciones");
}

export async function updateClubDiscountPercent(formData: FormData) {
  const productId = formData.get("productId") as string;
  const clubDiscountPercent = parseInt(formData.get("clubDiscountPercent") as string);
  const safeDiscount = isNaN(clubDiscountPercent) ? 0 : Math.max(0, Math.min(100, clubDiscountPercent));

  await db.product.update({ where: { id: productId }, data: { clubDiscountPercent: safeDiscount } });

  const updatedProduct = await db.product.findUnique({
    where: { id: productId },
    include: { plans: true },
  });

  if (updatedProduct) {
    const subscriptionPrice = Math.max(
      0,
      Number(updatedProduct.price || 0) * (1 - safeDiscount / 100)
    );

    await Promise.all(
      updatedProduct.plans.map((plan) =>
        db.plan.update({
          where: { id: plan.id },
          data: {
            price: subscriptionPrice,
            stripePriceId: null,
          },
        })
      )
    );
  }

  revalidatePath("/admin");
  revalidatePath("/tienda");
  revalidatePath("/suscripciones");
}

// ==========================================
// PLANES DE SUSCRIPCIÓN
// ==========================================
export async function createPlan(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const interval = formData.get("interval") as string;
  const intervalCount = parseInt(formData.get("intervalCount") as string);
  const productId = formData.get("productId") as string;
  await db.plan.create({ data: { name, description, price, interval, intervalCount, productId: productId || null } });
  revalidatePath("/admin");
}

export async function updatePlanPrice(formData: FormData) {
  const planId = formData.get("planId") as string;
  const newPrice = parseFloat(formData.get("newPrice") as string);
  await db.plan.update({ where: { id: planId }, data: { price: newPrice } });
  revalidatePath("/admin");
}

export async function updatePlanProduct(formData: FormData) {
  const planId = formData.get("planId") as string;
  const productId = formData.get("productId") as string;
  await db.plan.update({ where: { id: planId }, data: { productId: productId || null } });
  revalidatePath("/admin");
}

// ==========================================
// LEADS
// ==========================================
export async function deleteLead(formData: FormData) {
  const leadId = formData.get("leadId") as string;
  await db.lead.delete({ where: { id: leadId } });
  revalidatePath("/admin");
}

// ==========================================
// LOGÍSTICA (SKYDROPX)
// ==========================================
export async function generateShippingLabel(orderId: string): Promise<{ success: true; labelUrl: string; trackingNumber?: string } | { success: false; error: string }> {
  try {
    const result = await createShippingLabel(orderId);
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/subscriptions");
    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido al generar guía";
    console.error("Error en guía:", message);
    return { success: false, error: message };
  }
}

export async function markOrderAsShipped(orderId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, trackingNumber: true, trackingUrl: true, shippingId: true },
    });

    if (!order) {
      return { success: false, error: "Pedido no encontrado" };
    }

    if (!order.trackingNumber && !order.trackingUrl && !order.shippingId) {
      return { success: false, error: "Primero genera o registra una guía para este pedido." };
    }

    await db.order.update({
      where: { id: orderId },
      data: { status: "SHIPPED" },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/subscriptions");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo marcar el pedido como enviado";
    return { success: false, error: message };
  }
}

export async function updateProductsSortOrder(items: { id: string; sortOrder: number }[]) {
  await Promise.all(
    items.map(({ id, sortOrder }) => db.product.update({ where: { id }, data: { sortOrder } }))
  );
  revalidatePath("/admin");
  revalidatePath("/pos");
}

export async function updateFlavorsSortOrder(items: { id: string; sortOrder: number }[]) {
  await Promise.all(
    items.map(({ id, sortOrder }) => db.flavor.update({ where: { id }, data: { sortOrder } }))
  );
  revalidatePath("/admin");
  revalidatePath("/pos");
}
