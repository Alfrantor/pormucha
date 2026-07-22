"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { canEditSubscriptionFlavors, ensureSubscriptionScheduleSchema, normalizeStoredFlavorSelection } from "@/lib/subscriptions";
import { tryFulfillDueSubscriptionShipment } from "@/lib/commerce-processing";

export async function saveSelectedFlavors(
  subscriptionId: string,
  flavors: Record<string, number>,
  totalSelected: number,
  unitCount: number,
) {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  await ensureSubscriptionScheduleSchema();

  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      client: true,
    },
  });

  if (!subscription) {
    throw new Error("No encontramos esa suscripción.");
  }

  if (subscription.client.clerkUserId !== userId) {
    throw new Error("No puedes editar una suscripción que no te pertenece.");
  }

  if (!canEditSubscriptionFlavors(subscription)) {
    throw new Error("Los sabores de esta suscripción ya quedaron cerrados para el próximo envío.");
  }

  if (totalSelected !== unitCount) {
    throw new Error(`Debes seleccionar exactamente ${unitCount} bebidas.`);
  }

  const availableFlavors = await db.flavor.findMany({
    where: { isArchived: false },
    select: {
      id: true,
      name: true,
    },
  });

  const normalizedSelection = normalizeStoredFlavorSelection(flavors, availableFlavors);
  const normalizedTotal = Object.values(normalizedSelection).reduce((sum, value) => sum + value, 0);

  if (normalizedTotal !== unitCount) {
    throw new Error(`Debes seleccionar exactamente ${unitCount} bebidas válidas.`);
  }

  await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      selectedFlavors: normalizedSelection,
    },
  });

  await tryFulfillDueSubscriptionShipment(subscriptionId, {
    paymentMethod: "STRIPE_SUBSCRIPTION",
    paymentNote: "Surtido liberado al guardar sabores",
  }).catch(() => null);

  revalidatePath("/perfil");
  return { success: true };
}
