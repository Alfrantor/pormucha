"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Crear cliente
export async function createClient(data: {
  type: string;
  fullName: string;
  email: string;
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
    const client = await db.client.create({
      data: {
        type: data.type,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        rfc: data.rfc?.toUpperCase(),
        businessName: data.businessName,
        zipCode: data.zipCode || null,
        classification: data.classification || "MINORISTA",
        creditLimit: data.creditLimit ? parseFloat(data.creditLimit.toString()) : 0,
        paymentTerms: data.paymentTerms,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        giroId: data.giroId || null,
      },
    });

    revalidatePath("/admin/clientes");
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

// Actualizar cliente
export async function updateClient(
  id: string,
  data: {
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
  }
) {
  try {
    const client = await db.client.update({
      where: { id },
      data: {
        ...data,
        rfc: data.rfc?.toUpperCase(),
        creditLimit: data.creditLimit ? parseFloat(data.creditLimit.toString()) : undefined,
      },
    });

    revalidatePath("/admin/clientes");
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

// Obtener cliente con todas sus relaciones
export async function getClient(id: string) {
  try {
    const client = await db.client.findUnique({
      where: { id },
      include: {
        addresses: true,
        orders: { take: 10, orderBy: { createdAt: "desc" } },
        credits: { orderBy: { createdAt: "desc" } },
        interactions: { take: 20, orderBy: { createdAt: "desc" } },
      },
    });
    return client;
  } catch (error) {
    console.error("Error fetching client:", error);
    return null;
  }
}

// Listar clientes con filtros
export async function listClients(params: {
  search?: string;
  classification?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  try {
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

// Crear dirección
export async function createAddress(data: {
  clientId: string;
  type: string;
  street: string;
  number: string;
  city: string;
  state: string;
  zipCode: string;
  reference?: string;
  isDefault?: boolean;
}) {
  try {
    const address = await db.address.create({
      data: {
        clientId: data.clientId,
        type: data.type,
        street: data.street,
        number: data.number,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        reference: data.reference,
        isDefault: data.isDefault || false,
      },
    });

    revalidatePath(`/admin/clientes/${data.clientId}`);
    return { success: true, address };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Actualizar dirección
export async function updateAddress(
  id: string,
  data: {
    type?: string;
    street?: string;
    number?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    reference?: string;
    isDefault?: boolean;
  }
) {
  try {
    const address = await db.address.update({
      where: { id },
      data,
    });

    revalidatePath(`/admin/clientes/${address.clientId}`);
    return { success: true, address };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Eliminar dirección
export async function deleteAddress(id: string) {
  try {
    const address = await db.address.delete({ where: { id } });
    revalidatePath(`/admin/clientes/${address.clientId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Crear nota/interacción
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

    revalidatePath(`/admin/clientes/${data.clientId}`);
    return { success: true, interaction };
  } catch (error: any) {
    return { error: error.message };
  }
}
