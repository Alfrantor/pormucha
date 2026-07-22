"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ensureSubscriptionScheduleSchema } from "@/lib/subscriptions";
import { tryFulfillDueSubscriptionShipment } from "@/lib/commerce-processing";

export async function updateClientAddress(formData: any) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) throw new Error("No autorizado");

  await ensureSubscriptionScheduleSchema();

  const userEmail = user.emailAddresses[0].emailAddress;

  const client = await db.client.upsert({
    where: { clerkUserId: userId },
    update: {
      email: userEmail,
      phone: formData.phone,
    },
    create: {
      clerkUserId: userId,
      email: userEmail,
      fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      phone: formData.phone,
      type: "FISICA",
    },
  });

  if (formData.street || formData.city) {
    const existingAddress = await db.address.findFirst({
      where: {
        clientId: client.id,
        type: "ENVIO",
      },
    });

    const addressData = {
      street: String(formData.street || ""),
      number: String(formData.number || ""),
      neighborhood: String(formData.neighborhood || ""),
      zipCode: String(formData.zipCode || ""),
      city: String(formData.city || ""),
      state: String(formData.state || ""),
      country: "MX",
      reference: String(formData.reference || ""),
      isDefault: true,
    };

    if (existingAddress) {
      await db.address.update({
        where: { id: existingAddress.id },
        data: addressData,
      });
    } else {
      await db.address.create({
        data: {
          clientId: client.id,
          type: "ENVIO",
          ...addressData,
        },
      });
    }
  }

  const activeSubscriptions = await db.subscription.findMany({
    where: {
      clientId: client.id,
      status: "active",
    },
    select: {
      id: true,
    },
  });

  for (const subscription of activeSubscriptions) {
    await tryFulfillDueSubscriptionShipment(subscription.id, {
      paymentMethod: "STRIPE_SUBSCRIPTION",
      paymentNote: "Surtido liberado al guardar dirección",
    }).catch(() => null);
  }

  revalidatePath("/perfil");
}
