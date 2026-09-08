import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { db } from "@/lib/db";
import { MarketingEmailManager } from "@/components/admin/MarketingEmailManager";
import { ensureMarketingEmailSchema, getMarketingRecipients, type MarketingAudience } from "@/app/_actions/marketing-emails";

type CampaignRow = {
  id: string;
  audience: string;
  subject: string;
  preheader: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  createdBy: string | null;
  createdAt: Date;
};

export default async function AdminEmailPage() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;

  if (role !== "admin") {
    redirect("/perfil");
  }

  const schema = await ensureMarketingEmailSchema();

  if (!schema.success) {
    return (
      <div className="space-y-6">
        <EmailHeader />
        <section className="rounded-[1.8rem] border border-amber-200 bg-amber-50 p-6 shadow-sm sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-600">Base de datos no disponible</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-amber-950">No pudimos cargar el módulo de correo</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-800">
            Prisma no pudo conectarse a la base de datos. Revisa que Neon esté disponible y que `DATABASE_URL` apunte al servidor correcto.
          </p>
        </section>
      </div>
    );
  }

  const audienceKeys: MarketingAudience[] = ["LEADS", "CLIENTS", "SUBSCRIBERS", "ALL"];
  let audienceEntries: readonly (readonly [MarketingAudience, number])[] = [];
  let campaigns: CampaignRow[] = [];

  try {
    [audienceEntries, campaigns] = await Promise.all([
      Promise.all(audienceKeys.map(async (audience) => [audience, (await getMarketingRecipients(audience)).length] as const)),
      db.$queryRaw<CampaignRow[]>`
        SELECT "id", "audience", "subject", "preheader", "recipientCount", "sentCount", "failedCount", "status", "createdBy", "createdAt"
        FROM "MarketingEmailCampaign"
        ORDER BY "createdAt" DESC
        LIMIT 25
      `,
    ]);
  } catch (error) {
    console.error("No se pudo cargar el módulo de correo:", error);
    return (
      <div className="space-y-6">
        <EmailHeader />
        <section className="rounded-[1.8rem] border border-amber-200 bg-amber-50 p-6 shadow-sm sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-600">Conexión interrumpida</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-amber-950">No pudimos consultar tus audiencias</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-800">
            La página ya está protegida contra el error, pero necesitamos que la base de datos responda para contar contactos, ver campañas y enviar correos.
          </p>
        </section>
      </div>
    );
  }

  const audienceCounts = Object.fromEntries(audienceEntries) as Record<MarketingAudience, number>;

  return (
    <div className="space-y-6">
      <EmailHeader />

      <MarketingEmailManager
        audienceCounts={audienceCounts}
        campaigns={campaigns.map((campaign) => ({
          ...campaign,
          createdAt: campaign.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

function EmailHeader() {
  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Website</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Correo</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Envía promociones a leads, clientes activos y suscriptores. El sistema deduplica correos para evitar envíos repetidos.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <Mail size={24} />
        </div>
      </div>
    </section>
  );
}
