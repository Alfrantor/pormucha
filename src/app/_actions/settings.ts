"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
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
