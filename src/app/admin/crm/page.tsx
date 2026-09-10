import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CrmDashboard } from "@/components/admin/CrmDashboard";
import { db } from "@/lib/db";
import { ensureCrmSchema } from "@/lib/crm-schema";

function normalizeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : value || null;
}

function serializeLead(lead: any) {
  return {
    ...lead,
    createdAt: normalizeDate(lead.createdAt),
    updatedAt: normalizeDate(lead.updatedAt),
    firstContactAt: normalizeDate(lead.firstContactAt),
    lastContactAt: normalizeDate(lead.lastContactAt),
    nextFollowUpAt: normalizeDate(lead.nextFollowUpAt),
    sampleSentAt: normalizeDate(lead.sampleSentAt),
    convertedAt: normalizeDate(lead.convertedAt),
    lostAt: normalizeDate(lead.lostAt),
    activities: Array.isArray(lead.activities)
      ? lead.activities.map((activity: any) => ({
          ...activity,
          createdAt: normalizeDate(activity.createdAt),
          nextFollowUpAt: normalizeDate(activity.nextFollowUpAt),
        }))
      : [],
  };
}

export default async function AdminCrmPage() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;

  if (role !== "admin") {
    redirect("/perfil");
  }

  await ensureCrmSchema();

  const leads = await db.$queryRaw<any[]>`
    SELECT
      l."id",
      l."name",
      l."email",
      l."phone",
      l."company",
      l."personType",
      l."source",
      l."state",
      l."city",
      l."interest",
      l."stage",
      l."status",
      l."responsible",
      l."responsibleUserId",
      l."responsibleName",
      l."createdByUserId",
      l."createdByName",
      l."firstContactAt",
      l."lastContactAt",
      l."nextFollowUpAt",
      l."sampleSentAt",
      l."convertedAt",
      l."lostAt",
      l."lostReason",
      l."clientId",
      l."createdAt",
      l."updatedAt",
      c."fullName" AS "clientName",
      COALESCE(
        (
          SELECT json_agg(activity_row ORDER BY activity_row."createdAt" DESC)
          FROM (
            SELECT
              a."id",
              a."type",
              a."note",
              a."outcome",
              a."nextFollowUpAt",
              a."createdBy",
              a."createdByUserId",
              a."createdByName",
              a."createdAt"
            FROM "LeadActivity" a
            WHERE a."leadId" = l."id"
            ORDER BY a."createdAt" DESC
            LIMIT 25
          ) activity_row
        ),
        '[]'::json
      ) AS "activities"
    FROM "Lead" l
    LEFT JOIN "Client" c ON c."id" = l."clientId"
    ORDER BY l."status" ASC, l."updatedAt" DESC
  `;

  const staffUsers = await db.$queryRaw<any[]>`
    SELECT "id", "fullName", "email", "role", "status"
    FROM "StaffUser"
    WHERE "status" = 'ACTIVO'
    ORDER BY "fullName" ASC
  `.catch(() => []);
  const signedUser = await currentUser().catch(() => null);
  const signedEmail = signedUser?.emailAddresses?.[0]?.emailAddress || null;
  const visibleUsers = signedUser && !staffUsers.some((user) => user.id === signedUser.id || user.email === signedEmail)
    ? [
        ...staffUsers,
        {
          id: signedUser.id,
          fullName: signedUser.fullName || signedEmail || "Usuario actual",
          email: signedEmail,
          role: "admin",
          status: "ACTIVO",
        },
      ]
    : staffUsers;

  const clientsForDuplicates = await db.client.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      businessName: true,
    },
    take: 2000,
    orderBy: { fullName: "asc" },
  });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const activeLeads = leads.filter((lead) => lead.status === "ACTIVE").length;
  const convertedLeads = leads.filter((lead) => lead.status === "CONVERTED").length;
  const newLeads = leads.filter((lead) => new Date(lead.createdAt) >= thirtyDaysAgo).length;
  const newToday = leads.filter((lead) => new Date(lead.createdAt) >= todayStart).length;
  const newWeek = leads.filter((lead) => new Date(lead.createdAt) >= sevenDaysAgo).length;
  const newMonth = leads.filter((lead) => new Date(lead.createdAt) >= monthStart).length;
  const overdueFollowUps = leads.filter((lead) => lead.status === "ACTIVE" && lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < now).length;
  const conversionRate = leads.length ? Math.round((convertedLeads / leads.length) * 100) : 0;
  const convertedDurations = leads
    .filter((lead) => lead.convertedAt)
    .map((lead) => Math.max(0, new Date(lead.convertedAt).getTime() - new Date(lead.createdAt).getTime()) / (24 * 60 * 60 * 1000));
  const avgConversionDays = convertedDurations.length ? Math.round(convertedDurations.reduce((sum, days) => sum + days, 0) / convertedDurations.length) : 0;

  const countBy = (field: string) =>
    Object.entries(
      leads.reduce((acc: Record<string, number>, lead) => {
        const key = lead[field] || "Sin dato";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    )
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

  const convertedByResponsible = Object.entries(
    leads
      .filter((lead) => lead.status === "CONVERTED")
      .reduce((acc: Record<string, number>, lead) => {
        const key = lead.responsibleName || lead.responsible || "Sin responsable";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const lostReasons = Object.entries(
    leads
      .filter((lead) => lead.status === "LOST")
      .reduce((acc: Record<string, number>, lead) => {
        const key = lead.lostReason || "Sin motivo";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const webLeads = leads.filter((lead) => lead.source === "WEB").length;
  const manualLeads = leads.filter((lead) => lead.source !== "WEB").length;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">CRM</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Seguimiento comercial</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Administra leads, contacto comercial, muestras, negociación y conversión a cliente sin perder el historial.
        </p>
      </section>

      <CrmDashboard
        leads={leads.map(serializeLead)}
        users={visibleUsers}
        clients={clientsForDuplicates}
        stats={{
          activeLeads,
          convertedLeads,
          newLeads,
          overdueFollowUps,
          conversionRate,
        }}
        insights={{
          newToday,
          newWeek,
          newMonth,
          bySource: countBy("source"),
          byState: countBy("state"),
          conversionRate,
          avgConversionDays,
          overdueFollowUps,
          convertedByResponsible,
          lostReasons,
          webLeads,
          manualLeads,
        }}
      />
    </div>
  );
}
