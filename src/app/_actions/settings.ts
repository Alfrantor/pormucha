"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { normalizeShippingOrigin, type ShippingProvider } from "@/lib/shipping-config";
import { revalidatePath } from "next/cache";

export async function getInventoryPin(): Promise<string | null> {
  try {
    const setting = await (db as any).systemSetting.findUnique({
      where: { key: "inventory_pin" },
    });
    return setting?.value || null;
  } catch {
    return null;
  }
}

export async function setInventoryPin(pin: string) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;
  if (role !== "admin") return { error: "No autorizado" };

  const clean = pin.trim();
  if (clean.length < 4) return { error: "El PIN debe tener al menos 4 dígitos" };

  await (db as any).systemSetting.upsert({
    where: { key: "inventory_pin" },
    create: { key: "inventory_pin", value: clean },
    update: { value: clean },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function validateInventoryPin(pin: string): Promise<boolean> {
  try {
    const setting = await (db as any).systemSetting.findUnique({
      where: { key: "inventory_pin" },
    });
    if (!setting) return true; // sin PIN configurado → permitir
    return setting.value === pin.trim();
  } catch {
    return false;
  }
}

export async function saveShippingConfig(formData: FormData) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;
  if (role !== "admin") return;

  const providerValue = String(formData.get("provider") || "skydropx");
  const provider: ShippingProvider = providerValue === "enviosperros" ? "enviosperros" : "skydropx";
  const apiToken = String(formData.get("apiToken") || "").trim();

  const origin = normalizeShippingOrigin({
    companyName: String(formData.get("companyName") || ""),
    contactName: String(formData.get("contactName") || ""),
    email: String(formData.get("email") || ""),
    phone: String(formData.get("phone") || ""),
    countryCode: String(formData.get("countryCode") || "MX"),
    postalCode: String(formData.get("postalCode") || ""),
    state: String(formData.get("state") || ""),
    city: String(formData.get("city") || ""),
    neighborhood: String(formData.get("neighborhood") || ""),
    street1: String(formData.get("street1") || ""),
    apartmentNumber: String(formData.get("apartmentNumber") || ""),
    reference: String(formData.get("reference") || ""),
  });

  await (db as any).systemSetting.upsert({
    where: { key: "shipping_config" },
    create: {
      key: "shipping_config",
      value: JSON.stringify({ provider, apiToken, origin }),
    },
    update: {
      value: JSON.stringify({ provider, apiToken, origin }),
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/checkout");
}
