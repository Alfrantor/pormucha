"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { db } from "@/lib/db";

export type MarketingAudience = "LEADS" | "CLIENTS" | "SUBSCRIBERS" | "ALL";

type Recipient = {
  email: string;
  name: string | null;
  source: string;
};

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_EMAIL = "Equipo Pormucha <ventas@pormuchakombucha.com>";

function normalizeEmail(value: string | null | undefined) {
  const email = String(value || "").trim().toLowerCase();
  if (!email || email === "sin@correo.com" || !email.includes("@")) return null;
  return email;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderParagraphs(body: string) {
  return escapeHtml(body)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#45556c;">${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function renderMarketingEmail(params: {
  preheader: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  const cta = params.ctaLabel && params.ctaUrl
    ? `
      <a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;margin-top:10px;border-radius:999px;background:#020617;color:#ffffff;text-decoration:none;padding:14px 22px;font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">
        ${escapeHtml(params.ctaLabel)}
      </a>
    `
    : "";

  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(params.preheader)}</div>
    <div style="background:#f4f1e9;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:28px;overflow:hidden;box-shadow:0 24px 70px rgba(15,23,42,.10);">
        <div style="background:#020617;padding:34px 28px;">
          <p style="margin:0 0 10px;color:#93a4c7;font-size:11px;font-weight:900;letter-spacing:.32em;text-transform:uppercase;">Pormucha</p>
          <h1 style="margin:0;color:#ffffff;font-size:34px;line-height:1.08;letter-spacing:-.04em;">${escapeHtml(params.title)}</h1>
        </div>
        <div style="padding:34px 28px 38px;">
          ${renderParagraphs(params.body)}
          ${cta}
        </div>
        <div style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6;">
          Recibiste este correo porque dejaste tus datos en Pormucha o eres cliente/suscriptor registrado.
        </div>
      </div>
    </div>
  `;
}

export async function ensureMarketingEmailSchema() {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MarketingEmailCampaign" (
        "id" TEXT NOT NULL,
        "audience" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "preheader" TEXT,
        "body" TEXT NOT NULL,
        "ctaLabel" TEXT,
        "ctaUrl" TEXT,
        "recipientCount" INTEGER NOT NULL DEFAULT 0,
        "sentCount" INTEGER NOT NULL DEFAULT 0,
        "failedCount" INTEGER NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "error" TEXT,
        "createdBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MarketingEmailCampaign_pkey" PRIMARY KEY ("id")
      )
    `);
    return { success: true as const };
  } catch (error) {
    console.error("No se pudo preparar el módulo de correo:", error);
    return {
      success: false as const,
      error: "No se pudo conectar con la base de datos para preparar el módulo de correo.",
    };
  }
}

export async function getMarketingRecipients(audience: MarketingAudience): Promise<Recipient[]> {
  const includeLeads = audience === "LEADS" || audience === "ALL";
  const includeClients = audience === "CLIENTS" || audience === "ALL";
  const includeSubscribers = audience === "SUBSCRIBERS" || audience === "ALL";

  const [leads, clients, subscriptions] = await Promise.all([
    includeLeads
      ? db.lead.findMany({
          select: { email: true, name: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    includeClients
      ? db.client.findMany({
          where: { status: "ACTIVO", email: { not: null } },
          select: { email: true, fullName: true },
          orderBy: { fullName: "asc" },
        })
      : Promise.resolve([]),
    includeSubscribers
      ? db.subscription.findMany({
          where: { status: "active" },
          select: { client: { select: { email: true, fullName: true } } },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const recipients = new Map<string, Recipient>();

  for (const lead of leads) {
    const email = normalizeEmail(lead.email);
    if (email) recipients.set(email, { email, name: lead.name || null, source: "Lead" });
  }

  for (const client of clients) {
    const email = normalizeEmail(client.email);
    if (email && !recipients.has(email)) {
      recipients.set(email, { email, name: client.fullName || null, source: "Cliente" });
    }
  }

  for (const subscription of subscriptions) {
    const email = normalizeEmail(subscription.client.email);
    if (email) {
      recipients.set(email, { email, name: subscription.client.fullName || recipients.get(email)?.name || null, source: "Suscriptor" });
    }
  }

  return Array.from(recipients.values()).sort((a, b) => a.email.localeCompare(b.email));
}

async function requireMarketingAccess() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;

  if (role !== "admin") {
    return { ok: false as const, error: "No tienes permisos para enviar campañas." };
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress || "system";
  return { ok: true as const, email };
}

export async function sendMarketingEmailCampaign(formData: FormData) {
  const access = await requireMarketingAccess();
  if (!access.ok) return { success: false, error: access.error };

  const schema = await ensureMarketingEmailSchema();
  if (!schema.success) return { success: false, error: schema.error };

  if (!resend) {
    return { success: false, error: "Falta configurar RESEND_API_KEY para poder enviar correos." };
  }

  const audience = String(formData.get("audience") || "LEADS") as MarketingAudience;
  const subject = String(formData.get("subject") || "").trim();
  const preheader = String(formData.get("preheader") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const ctaLabel = String(formData.get("ctaLabel") || "").trim();
  const ctaUrl = String(formData.get("ctaUrl") || "").trim();

  if (!["LEADS", "CLIENTS", "SUBSCRIBERS", "ALL"].includes(audience)) {
    return { success: false, error: "Selecciona una audiencia válida." };
  }

  if (!subject || !body) {
    return { success: false, error: "El asunto y el mensaje son obligatorios." };
  }

  if ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl)) {
    return { success: false, error: "Para usar botón necesitas completar texto y enlace." };
  }

  const recipients = await getMarketingRecipients(audience);
  if (recipients.length === 0) {
    return { success: false, error: "No hay correos disponibles para esta audiencia." };
  }

  const campaignId = randomUUID();

  await db.$executeRaw`
    INSERT INTO "MarketingEmailCampaign" (
      "id", "audience", "subject", "preheader", "body", "ctaLabel", "ctaUrl",
      "recipientCount", "sentCount", "failedCount", "status", "createdBy"
    )
    VALUES (
      ${campaignId}, ${audience}, ${subject}, ${preheader || null}, ${body}, ${ctaLabel || null}, ${ctaUrl || null},
      ${recipients.length}, ${0}, ${0}, ${"SENDING"}, ${access.email}
    )
  `;

  let sentCount = 0;
  let failedCount = 0;
  let lastError: string | null = null;
  const html = renderMarketingEmail({
    preheader: preheader || subject,
    title: subject,
    body,
    ctaLabel: ctaLabel || undefined,
    ctaUrl: ctaUrl || undefined,
  });

  for (const recipient of recipients) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: recipient.email,
        subject,
        html,
      });
      sentCount += 1;
    } catch (error) {
      failedCount += 1;
      lastError = error instanceof Error ? error.message : "Error desconocido al enviar";
    }
  }

  await db.$executeRaw`
    UPDATE "MarketingEmailCampaign"
    SET "sentCount" = ${sentCount},
        "failedCount" = ${failedCount},
        "status" = ${failedCount > 0 ? "PARTIAL" : "SENT"},
        "error" = ${lastError}
    WHERE "id" = ${campaignId}
  `;

  revalidatePath("/admin/email");

  return {
    success: failedCount === 0,
    sentCount,
    failedCount,
    error: failedCount > 0 ? `Se enviaron ${sentCount}, pero fallaron ${failedCount}.` : undefined,
  };
}
