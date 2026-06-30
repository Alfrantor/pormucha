"use server";

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createProductionSecondPhase(data: {
  productionId: string;
  receivedCondition?: string;
  receivedBy?: string;
  measuredBy?: string;
  startedBy?: string;
  measuredAt?: string;
  ph?: number;
  brix?: number;
  temperature?: number;
  acidity?: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.productionId) return { success: false, error: "Produccion requerida" };

    await db.$executeRaw`
      INSERT INTO "ProductionPhaseRecord"
      ("id","productionId","phase","receivedCondition","receivedBy","measuredBy","startedBy","measuredAt","ph","brix","temperature","acidity","notes","createdAt")
      VALUES
      (${randomUUID()}, ${data.productionId}, 2, ${data.receivedCondition || null}, ${data.receivedBy || null}, ${data.measuredBy || null}, ${data.startedBy || null}, ${data.measuredAt ? new Date(data.measuredAt) : new Date()}, ${data.ph ?? null}, ${data.brix ?? null}, ${data.temperature ?? null}, ${data.acidity ?? null}, ${data.notes || null}, NOW())
    `;

    revalidatePath("/admin/production");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al iniciar la segunda fase" };
  }
}
