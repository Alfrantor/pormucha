"use server";

import { randomUUID } from "crypto";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ensureClientStateSchema } from "@/lib/client-schema";
import { ensureCrmSchema } from "@/lib/crm-schema";
import { isMexicoState } from "@/lib/mexico-states";

function optionalText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function optionalDate(value: unknown) {
  const text = optionalText(value);
  return text ? new Date(text) : null;
}

function refreshCrm() {
  revalidatePath("/admin/crm");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/clients");
}

async function getCurrentCrmUser() {
  const user = await currentUser().catch(() => null);
  const email = user?.emailAddresses?.[0]?.emailAddress || null;
  const clerkId = user?.id || null;

  const staffRows = clerkId || email
    ? await db.$queryRaw<any[]>`
        SELECT "id", "fullName", "email"
        FROM "StaffUser"
        WHERE "clerkUserId" = ${clerkId} OR "email" = ${email}
        LIMIT 1
      `.catch(() => [])
    : [];
  const staff = staffRows[0];

  return {
    id: staff?.id || clerkId || email || "system",
    name: staff?.fullName || user?.fullName || email || "Sistema",
    email,
  };
}

async function resolveResponsible(userId: string | null | undefined, fallback: { id: string; name: string }) {
  if (!userId) return fallback;

  const rows = await db.$queryRaw<any[]>`
    SELECT "id", "fullName"
    FROM "StaffUser"
    WHERE "id" = ${userId} OR "clerkUserId" = ${userId}
    LIMIT 1
  `.catch(() => []);
  const user = rows[0];

  return {
    id: user?.id || userId,
    name: user?.fullName || fallback.name,
  };
}

export async function createCrmLead(input: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  personType?: string;
  source?: string;
  state?: string;
  city?: string;
  interest?: string;
  responsible?: string;
  responsibleUserId?: string;
  nextFollowUpAt?: string;
  note?: string;
}) {
  try {
    await ensureCrmSchema();

    const state = optionalText(input.state);
    if (state && !isMexicoState(state)) return { error: "Selecciona un estado válido de México." };

    const leadId = randomUUID();
    const now = new Date();
    const nextFollowUpAt = optionalDate(input.nextFollowUpAt);
    const actor = await getCurrentCrmUser();
    const responsible = await resolveResponsible(input.responsibleUserId, { id: actor.id, name: actor.name });

    await db.$executeRaw`
      INSERT INTO "Lead" (
        "id", "name", "email", "phone", "company", "personType", "source", "state", "city", "interest",
        "stage", "status", "responsible", "responsibleUserId", "responsibleName", "createdByUserId", "createdByName",
        "nextFollowUpAt", "createdAt", "updatedAt"
      )
      VALUES (
        ${leadId}, ${input.name.trim()}, ${input.email.trim().toLowerCase()}, ${optionalText(input.phone)},
        ${optionalText(input.company)}, ${optionalText(input.personType) || "PERSONA"}, ${optionalText(input.source) || "MANUAL"},
        ${state}, ${optionalText(input.city)}, ${optionalText(input.interest)}, 'NEW', 'ACTIVE',
        ${responsible.name}, ${responsible.id}, ${responsible.name}, ${actor.id}, ${actor.name}, ${nextFollowUpAt}, ${now}, ${now}
      )
    `;

    if (input.note?.trim()) {
      await db.$executeRaw`
        INSERT INTO "LeadActivity" ("id", "leadId", "type", "note", "nextFollowUpAt", "createdBy", "createdByUserId", "createdByName", "createdAt")
        VALUES (${randomUUID()}, ${leadId}, 'NOTE', ${input.note.trim()}, ${nextFollowUpAt}, ${actor.name}, ${actor.id}, ${actor.name}, ${now})
      `;
    }

    refreshCrm();
    return { success: true, leadId };
  } catch (error: any) {
    if (error.code === "P2002" || String(error.message || "").includes("Lead_email_key")) {
      return { error: "Ya existe un lead con ese correo." };
    }
    return { error: error.message || "No se pudo crear el lead." };
  }
}

export async function updateCrmLead(
  id: string,
  input: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    personType?: string;
    source?: string;
    state?: string;
    city?: string;
    interest?: string;
    stage?: string;
    status?: string;
    responsible?: string;
    responsibleUserId?: string;
    nextFollowUpAt?: string;
  },
) {
  try {
    await ensureCrmSchema();

    const state = input.state !== undefined ? optionalText(input.state) : undefined;
    if (state && !isMexicoState(state)) return { error: "Selecciona un estado válido de México." };
    const currentRows = input.responsibleUserId !== undefined
      ? await db.$queryRaw<any[]>`SELECT "responsibleUserId", "responsibleName" FROM "Lead" WHERE "id" = ${id} LIMIT 1`.catch(() => [])
      : [];
    const currentResponsible = currentRows[0];
    const responsible = input.responsibleUserId !== undefined
      ? await resolveResponsible(input.responsibleUserId, {
          id: currentResponsible?.responsibleUserId || "",
          name: currentResponsible?.responsibleName || "",
        })
      : null;

    await db.$executeRaw`
      UPDATE "Lead"
      SET
        "name" = COALESCE(${input.name !== undefined ? input.name.trim() : null}, "name"),
        "email" = COALESCE(${input.email !== undefined ? input.email.trim().toLowerCase() : null}, "email"),
        "phone" = COALESCE(${input.phone !== undefined ? optionalText(input.phone) : null}, "phone"),
        "company" = COALESCE(${input.company !== undefined ? optionalText(input.company) : null}, "company"),
        "personType" = COALESCE(${input.personType !== undefined ? optionalText(input.personType) : null}, "personType"),
        "source" = COALESCE(${input.source !== undefined ? optionalText(input.source) : null}, "source"),
        "state" = COALESCE(${state === undefined ? null : state}, "state"),
        "city" = COALESCE(${input.city !== undefined ? optionalText(input.city) : null}, "city"),
        "interest" = COALESCE(${input.interest !== undefined ? optionalText(input.interest) : null}, "interest"),
        "stage" = COALESCE(${input.stage || null}, "stage"),
        "status" = COALESCE(${input.status || null}, "status"),
        "responsible" = COALESCE(${responsible ? responsible.name : input.responsible !== undefined ? optionalText(input.responsible) : null}, "responsible"),
        "responsibleUserId" = COALESCE(${responsible ? responsible.id : null}, "responsibleUserId"),
        "responsibleName" = COALESCE(${responsible ? responsible.name : null}, "responsibleName"),
        "nextFollowUpAt" = COALESCE(${input.nextFollowUpAt !== undefined ? optionalDate(input.nextFollowUpAt) : null}, "nextFollowUpAt"),
        "updatedAt" = ${new Date()}
      WHERE "id" = ${id}
    `;

    refreshCrm();
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "No se pudo actualizar el lead." };
  }
}

export async function addLeadActivity(
  leadId: string,
  input: {
    type: string;
    note: string;
    outcome?: string;
    nextFollowUpAt?: string;
  },
) {
  try {
    await ensureCrmSchema();

    const now = new Date();
    const nextFollowUpAt = optionalDate(input.nextFollowUpAt);
    const activityType = input.type || "NOTE";
    const actor = await getCurrentCrmUser();
    const nextStage =
      activityType === "SAMPLE"
        ? "SAMPLE_SENT"
        : activityType === "QUOTE"
          ? "NEGOTIATION"
          : activityType === "PURCHASE"
            ? "CONVERTED"
            : "FIRST_CONTACT";

    await db.$transaction([
      db.$executeRaw`
        INSERT INTO "LeadActivity" ("id", "leadId", "type", "note", "outcome", "nextFollowUpAt", "createdBy", "createdByUserId", "createdByName", "createdAt")
        VALUES (${randomUUID()}, ${leadId}, ${activityType}, ${input.note.trim()}, ${optionalText(input.outcome)}, ${nextFollowUpAt}, ${actor.name}, ${actor.id}, ${actor.name}, ${now})
      `,
      db.$executeRaw`
        UPDATE "Lead"
        SET
          "stage" = ${nextStage},
          "status" = ${activityType === "PURCHASE" ? "CONVERTED" : "ACTIVE"},
          "firstContactAt" = COALESCE("firstContactAt", ${activityType === "NOTE" ? null : now}),
          "lastContactAt" = ${now},
          "nextFollowUpAt" = ${nextFollowUpAt},
          "sampleSentAt" = COALESCE("sampleSentAt", ${activityType === "SAMPLE" ? now : null}),
          "convertedAt" = COALESCE("convertedAt", ${activityType === "PURCHASE" ? now : null}),
          "updatedAt" = ${now}
        WHERE "id" = ${leadId}
      `,
    ]);

    refreshCrm();
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "No se pudo agregar el seguimiento." };
  }
}

export async function markLeadLost(leadId: string, reason: string) {
  try {
    await ensureCrmSchema();
    const now = new Date();
    const note = reason.trim();
    const actor = await getCurrentCrmUser();

    await db.$executeRaw`
      UPDATE "Lead"
      SET "stage" = 'LOST', "status" = 'LOST', "lostAt" = ${now}, "lostReason" = ${optionalText(reason)}, "updatedAt" = ${now}
      WHERE "id" = ${leadId}
    `;

    if (note) {
      await db.$executeRaw`
        INSERT INTO "LeadActivity" ("id", "leadId", "type", "note", "createdBy", "createdByUserId", "createdByName", "createdAt")
        VALUES (${randomUUID()}, ${leadId}, 'NOTE', ${`Lead marcado como perdido: ${note}`}, ${actor.name}, ${actor.id}, ${actor.name}, ${now})
      `;
    }

    refreshCrm();
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "No se pudo marcar como perdido." };
  }
}

export async function convertLeadToClient(leadId: string) {
  try {
    await ensureCrmSchema();
    await ensureClientStateSchema();
    const actor = await getCurrentCrmUser();

    const rows = await db.$queryRaw<any[]>`
      SELECT "id", "name", "email", "phone", "company", "personType", "state", "clientId"
      FROM "Lead"
      WHERE "id" = ${leadId}
      LIMIT 1
    `;
    const lead = rows[0];
    if (!lead) return { error: "Lead no encontrado." };
    if (lead.clientId) return { success: true, clientId: lead.clientId };

    const existingClient = lead.email
      ? await db.client.findUnique({ where: { email: lead.email } }).catch(() => null)
      : null;

    const client =
      existingClient ||
      (await db.client.create({
        data: {
          type: lead.personType === "EMPRESA" ? "JURIDICA" : "FISICA",
          fullName: lead.name,
          email: lead.email,
          phone: lead.phone,
          businessName: lead.company,
          state: lead.state,
          classification: "MINORISTA",
        },
      }));

    const now = new Date();
    await db.$transaction([
      db.$executeRaw`
        UPDATE "Lead"
        SET "clientId" = ${client.id}, "stage" = 'CONVERTED', "status" = 'CONVERTED', "convertedAt" = ${now}, "updatedAt" = ${now}
        WHERE "id" = ${leadId}
      `,
      db.$executeRaw`
        INSERT INTO "LeadActivity" ("id", "leadId", "type", "note", "createdBy", "createdByUserId", "createdByName", "createdAt")
        VALUES (${randomUUID()}, ${leadId}, 'PURCHASE', ${`Lead convertido a cliente: ${client.fullName}`}, ${actor.name}, ${actor.id}, ${actor.name}, ${now})
      `,
    ]);

    refreshCrm();
    revalidatePath(`/admin/clients/${client.id}`);
    return { success: true, clientId: client.id };
  } catch (error: any) {
    return { error: error.message || "No se pudo convertir el lead." };
  }
}
