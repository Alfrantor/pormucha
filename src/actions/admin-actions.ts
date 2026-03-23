"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ==========================================
// UBICACIONES
// ==========================================
export async function createLocation(formData: FormData) {
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  await db.location.create({ data: { name, address, isDefault: false } });
  revalidatePath("/admin");
  revalidatePath("/pos");
}

export async function updateLocation(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  await db.location.update({ where: { id }, data: { name, address } });
  revalidatePath("/admin");
  revalidatePath("/pos");
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
  const observations = formData.get("observations") as string;

  if (quantitySent <= 0 || fromLocationId === toLocationId) return;

  const currentStock = await db.stock.findUnique({
    where: { flavorId_locationId: { flavorId, locationId: fromLocationId } }
  });

  if (!currentStock || currentStock.quantity < quantitySent) {
    throw new Error("No hay suficiente stock en la ubicación de origen.");
  }

  await db.stock.update({
    where: { flavorId_locationId: { flavorId, locationId: fromLocationId } },
    data: { quantity: { decrement: quantitySent } }
  });

  await db.inventoryMovement.create({
    data: { flavorId, locationId: fromLocationId, type: "OUT", quantity: quantitySent, reason: "Envío en Tránsito", userId: senderEmail }
  });

  await db.transfer.create({
    data: { flavorId, fromLocationId, toLocationId, quantitySent, senderEmail, observations, status: "PENDING" }
  });

  revalidatePath("/admin");
  revalidatePath("/pos");
}

export async function receiveTransfer(formData: FormData) {
  const transferId = formData.get("transferId") as string;
  const quantityReceived = parseInt(formData.get("quantityReceived") as string);
  const receiverEmail = formData.get("receiverEmail") as string;
  const obs = formData.get("observations") as string;

  if (quantityReceived < 0) return;

  const transfer = await db.transfer.findUnique({ where: { id: transferId } });
  if (!transfer || transfer.status !== "PENDING") return;

  const finalObs = obs ? `${transfer.observations || ''}\n[Recepción]: ${obs}` : transfer.observations;
  const shrinkage = transfer.quantitySent - quantityReceived;

  await db.transfer.update({
    where: { id: transferId },
    data: { status: "COMPLETED", quantityReceived, receiverEmail, observations: finalObs }
  });

  if (quantityReceived > 0) {
    await db.stock.upsert({
      where: { flavorId_locationId: { flavorId: transfer.flavorId, locationId: transfer.toLocationId } },
      create: { flavorId: transfer.flavorId, locationId: transfer.toLocationId, quantity: quantityReceived },
      update: { quantity: { increment: quantityReceived } }
    });
    await db.inventoryMovement.create({
      data: { flavorId: transfer.flavorId, locationId: transfer.toLocationId, type: "IN", quantity: quantityReceived, reason: "Recepción de Envío", userId: receiverEmail }
    });
  }

  if (shrinkage > 0) {
    await db.inventoryMovement.create({
      data: { flavorId: transfer.flavorId, locationId: transfer.fromLocationId, type: "OUT", quantity: shrinkage, reason: `Merma/Pérdida (Envío ${transferId})`, userId: receiverEmail }
    });
  }

  revalidatePath("/admin");
  revalidatePath("/pos");
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
  revalidatePath("/admin");
}

export async function updateFlavorPrice(formData: FormData) {
  const flavorId = formData.get("flavorId") as string;
  const newPrice = parseFloat(formData.get("newPrice") as string);
  const adminEmail = formData.get("adminEmail") as string;
  const currentFlavor = await db.flavor.findUnique({ where: { id: flavorId } });
  if (!currentFlavor || Number(currentFlavor.price) === newPrice) return;
  await db.flavorPriceHistory.create({ data: { flavorId, oldPrice: currentFlavor.price, newPrice, userId: adminEmail } });
  await db.flavor.update({ where: { id: flavorId }, data: { price: newPrice } });
  revalidatePath("/admin");
}

// ==========================================
// PRODUCTOS Y SABORES
// ==========================================
export async function createProduct(formData: FormData) {
  const name = formData.get("name") as string;
  const price = parseFloat(formData.get("price") as string);
  const quantity = parseInt(formData.get("quantity") as string);
  const clubDiscountPercent = parseInt(formData.get("clubDiscountPercent") as string) || 0;

  const weight = parseFloat(formData.get("weight") as string) || 1.5;
  const height = parseFloat(formData.get("height") as string) || 20;
  const width = parseFloat(formData.get("width") as string) || 20;
  const length = parseFloat(formData.get("length") as string) || 20;

  await db.product.create({ data: { name, price, quantity, clubDiscountPercent, weight, height, width, length } });
  revalidatePath("/admin");
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
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const price = parseFloat(formData.get("price") as string);
  const initialStock = parseInt(formData.get("stock") as string) || 0;
  const adminEmail = formData.get("adminEmail") as string || "system";

  // 1. Buscamos la ubicación predeterminada (donde entrará el stock inicial)
  const defaultLocation = await db.location.findFirst({
    where: { isDefault: true }
  }) || await db.location.findFirst(); // Si no hay default, agarra la primera que encuentre

  // 2. Creamos el sabor
  const newFlavor = await db.flavor.create({
    data: { name, slug, price }
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
}

export async function updateClubDiscountPercent(formData: FormData) {
  const productId = formData.get("productId") as string;
  const clubDiscountPercent = parseInt(formData.get("clubDiscountPercent") as string);
  await db.product.update({ where: { id: productId }, data: { clubDiscountPercent: isNaN(clubDiscountPercent) ? 0 : clubDiscountPercent } });
  revalidatePath("/admin");
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
