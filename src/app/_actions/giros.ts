"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const giroDb = () => {
  const g = (db as any).giro;
  if (!g) throw new Error("Prisma client desactualizado — ejecuta npx prisma generate y reinicia el servidor");
  return g;
};

export async function listGiros() {
  try {
    return await giroDb().findMany({ orderBy: { name: "asc" } });
  } catch {
    return [];
  }
}

export async function createGiro(data: { name: string; description?: string }) {
  try {
    const giro = await giroDb().create({ data });
    revalidatePath("/admin");
    return { success: true, giro };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateGiro(id: string, data: { name?: string; description?: string }) {
  try {
    const giro = await giroDb().update({ where: { id }, data });
    revalidatePath("/admin");
    return { success: true, giro };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteGiro(id: string) {
  try {
    await giroDb().delete({ where: { id } });
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
