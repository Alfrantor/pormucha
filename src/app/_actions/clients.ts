"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ensureSubscriptionScheduleSchema } from "@/lib/subscriptions";

export async function createClient(data: {
  type: string;
  fullName: string;
  email?: string;
  phone?: string;
  rfc?: string;
  businessName?: string;
  zipCode?: string;
  classification?: string;
  creditLimit?: number;
  paymentTerms?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  giroId?: string;
}) {
  try {
    const normalizedEmail = data.email?.trim() || null;
    const normalizedBusinessName = data.businessName?.trim() || null;

    const client = await db.client.create({
      data: {
        type: data.type,
        fullName: data.fullName.trim(),
        email: normalizedEmail,
        phone: data.phone?.trim() || null,
        rfc: data.rfc?.trim().toUpperCase() || null,
        businessName: normalizedBusinessName,
        zipCode: data.zipCode?.trim() || null,
        classification: data.classification || "MINORISTA",
        creditLimit: data.creditLimit ? parseFloat(data.creditLimit.toString()) : 0,
        paymentTerms: data.paymentTerms,
        contactName: data.contactName?.trim() || null,
        contactPhone: data.contactPhone?.trim() || null,
        contactEmail: data.contactEmail?.trim() || null,
        giroId: data.giroId || null,
      },
    });

    revalidatePath("/admin/clients");
    return {
      success: true,
      client: {
        ...client,
        creditLimit: Number(client.creditLimit || 0),
        creditUsed: Number(client.creditUsed || 0),
        globalDiscount: client.globalDiscount ? Number(client.globalDiscount) : null,
        createdAt: client.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: client.updatedAt?.toISOString() || new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error("Error creating client:", error);
    return { error: error.message };
  }
}

export async function updateClient(
  id: string,
  data: {
    type?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    rfc?: string;
    businessName?: string;
    zipCode?: string;
    classification?: string;
    creditLimit?: number;
    paymentTerms?: number;
    globalDiscount?: number | null;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    status?: string;
    giroId?: string | null;
  },
) {
  try {
    const normalizedData = {
      ...data,
      fullName: data.fullName?.trim(),
      email: data.email !== undefined ? data.email.trim() || null : undefined,
      phone: data.phone !== undefined ? data.phone.trim() || null : undefined,
      rfc: data.rfc !== undefined ? data.rfc.trim().toUpperCase() || null : undefined,
      businessName: data.businessName !== undefined ? data.businessName.trim() || null : undefined,
      zipCode: data.zipCode !== undefined ? data.zipCode.trim() || null : undefined,
      contactName: data.contactName !== undefined ? data.contactName.trim() || null : undefined,
      contactPhone: data.contactPhone !== undefined ? data.contactPhone.trim() || null : undefined,
      contactEmail: data.contactEmail !== undefined ? data.contactEmail.trim() || null : undefined,
    };

    const client = await db.client.update({
      where: { id },
      data: {
        ...normalizedData,
        creditLimit: data.creditLimit ? parseFloat(data.creditLimit.toString()) : undefined,
      },
    });

    revalidatePath("/admin/clients");
    revalidatePath(`/admin/clients/${id}`);
    return {
      success: true,
      client: {
        ...client,
        creditLimit: Number(client.creditLimit || 0),
        creditUsed: Number(client.creditUsed || 0),
        globalDiscount: client.globalDiscount ? Number(client.globalDiscount) : null,
        createdAt: client.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: client.updatedAt?.toISOString() || new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error("Error updating client:", error);
    return { error: error.message };
  }
}

export async function getClient(id: string) {
  try {
    await ensureSubscriptionScheduleSchema();

    return await db.client.findUnique({
      where: { id },
      include: {
        addresses: true,
        orders: { take: 10, orderBy: { createdAt: "desc" } },
        credits: { orderBy: { createdAt: "desc" } },
        interactions: { take: 20, orderBy: { createdAt: "desc" } },
      },
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    return null;
  }
}

export async function listClients(params: {
  search?: string;
  classification?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    await ensureSubscriptionScheduleSchema();

    const where: any = {};

    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
        { rfc: { contains: params.search, mode: "insensitive" } },
        { businessName: { contains: params.search, mode: "insensitive" } },
      ];
    }

    if (params.classification) {
      where.classification = params.classification;
    }

    if (params.status) {
      where.status = params.status;
    }

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
        include: {
          addresses: { where: { isDefault: true }, take: 1 },
          orders: { select: { id: true }, take: 1 },
          credits: { where: { status: "PENDING" }, select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
        take: params.limit || 20,
        skip: params.offset || 0,
      }),
      db.client.count({ where }),
    ]);

    return { clients, total };
  } catch (error) {
    console.error("Error listing clients:", error);
    return { clients: [], total: 0 };
  }
}

export async function createAddress(data: {
  clientId: string;
  type: string;
  street: string;
  number: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode: string;
  reference?: string;
  isDefault?: boolean;
}) {
  try {
    await ensureSubscriptionScheduleSchema();

    const address = await db.address.create({
      data: {
        clientId: data.clientId,
        type: data.type,
        street: data.street,
        number: data.number,
        neighborhood: data.neighborhood || null,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        reference: data.reference,
        isDefault: data.isDefault || false,
      },
    });

    revalidatePath(`/admin/clients/${data.clientId}`);
    return { success: true, address };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateAddress(
  id: string,
  data: {
    type?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    reference?: string;
    isDefault?: boolean;
  },
) {
  try {
    await ensureSubscriptionScheduleSchema();

    const address = await db.address.update({
      where: { id },
      data,
    });

    revalidatePath(`/admin/clients/${address.clientId}`);
    return { success: true, address };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteAddress(id: string) {
  try {
    const address = await db.address.delete({ where: { id } });
    revalidatePath(`/admin/clients/${address.clientId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createInteraction(data: {
  clientId: string;
  type: string;
  note: string;
  createdBy?: string;
}) {
  try {
    const interaction = await db.clientInteraction.create({
      data,
    });

    revalidatePath(`/admin/clients/${data.clientId}`);
    return { success: true, interaction };
  } catch (error: any) {
    return { error: error.message };
  }
}
