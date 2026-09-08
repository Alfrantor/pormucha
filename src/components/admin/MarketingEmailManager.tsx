"use client";

import { useMemo, useState, useTransition } from "react";
import { Mail, Send, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { sendMarketingEmailCampaign, type MarketingAudience } from "@/app/_actions/marketing-emails";

type AudienceCounts = Record<MarketingAudience, number>;

type Campaign = {
  id: string;
  audience: string;
  subject: string;
  preheader: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  createdBy: string | null;
  createdAt: string;
};

type Props = {
  audienceCounts: AudienceCounts;
  campaigns: Campaign[];
};

const AUDIENCES: { id: MarketingAudience; label: string; helper: string }[] = [
  { id: "LEADS", label: "Leads", helper: "Prospectos capturados desde la web." },
  { id: "CLIENTS", label: "Clientes", helper: "Clientes activos con correo registrado." },
  { id: "SUBSCRIBERS", label: "Suscriptores", helper: "Clientes con suscripción activa." },
  { id: "ALL", label: "Todos", helper: "Unifica leads, clientes y suscriptores sin duplicar correos." },
];

function statusLabel(status: string) {
  if (status === "SENT") return "Enviado";
  if (status === "PARTIAL") return "Parcial";
  if (status === "SENDING") return "Enviando";
  return status;
}

function statusClass(status: string) {
  if (status === "SENT") return "bg-emerald-50 text-emerald-700";
  if (status === "PARTIAL") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

export function MarketingEmailManager({ audienceCounts, campaigns }: Props) {
  const [audience, setAudience] = useState<MarketingAudience>("LEADS");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedAudience = useMemo(() => AUDIENCES.find((item) => item.id === audience) || AUDIENCES[0], [audience]);
  const recipientCount = audienceCounts[audience] || 0;

  const sendCampaign = () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Completa el asunto y el mensaje antes de enviar.");
      return;
    }

    if (recipientCount <= 0) {
      toast.error("Esta audiencia no tiene correos disponibles.");
      return;
    }

    const confirmed = window.confirm(`¿Enviar esta promoción a ${recipientCount} correo(s)?`);
    if (!confirmed) return;

    const formData = new FormData();
    formData.set("audience", audience);
    formData.set("subject", subject);
    formData.set("preheader", preheader);
    formData.set("body", body);
    formData.set("ctaLabel", ctaLabel);
    formData.set("ctaUrl", ctaUrl);

    startTransition(async () => {
      const result = await sendMarketingEmailCampaign(formData);
      if (!result.success) {
        toast.error(result.error || "No se pudo enviar la campaña.");
        return;
      }

      toast.success(`Campaña enviada a ${result.sentCount} correo(s).`);
      setSubject("");
      setPreheader("");
      setBody("");
      setCtaLabel("");
      setCtaUrl("");
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        {AUDIENCES.map((item) => {
          const active = audience === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setAudience(item.id)}
              className={`rounded-[1.5rem] border p-5 text-left shadow-sm transition ${
                active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`rounded-2xl p-3 ${active ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"}`}>
                  <Users size={18} />
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${active ? "bg-white text-slate-950" : "bg-slate-100 text-slate-600"}`}>
                  {audienceCounts[item.id] || 0}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-black">{item.label}</h3>
              <p className={`mt-1 text-sm leading-5 ${active ? "text-slate-300" : "text-slate-500"}`}>{item.helper}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Campaña</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Nuevo correo promocional</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Audiencia: <span className="font-black text-slate-900">{selectedAudience.label}</span> · {recipientCount} correo(s) disponibles.
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
              Envío real
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Asunto">
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Ej. Promoción especial de septiembre"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
              />
            </Field>
            <Field label="Texto previo">
              <input
                value={preheader}
                onChange={(event) => setPreheader(event.target.value)}
                placeholder="Frase corta que acompaña al asunto"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
              />
            </Field>
          </div>

          <Field label="Mensaje">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={9}
              placeholder="Escribe aquí la promoción, lanzamiento o aviso comercial."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold leading-6 outline-none transition focus:border-slate-950"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Botón opcional">
              <input
                value={ctaLabel}
                onChange={(event) => setCtaLabel(event.target.value)}
                placeholder="Ej. Comprar ahora"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
              />
            </Field>
            <Field label="Enlace del botón">
              <input
                value={ctaUrl}
                onChange={(event) => setCtaUrl(event.target.value)}
                placeholder="https://pormuchakombucha.com/tienda"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={sendCampaign}
            disabled={isPending || recipientCount <= 0}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:bg-slate-300"
          >
            <Send size={16} />
            {isPending ? "Enviando campaña..." : `Enviar promoción a ${recipientCount} contacto(s)`}
          </button>
        </section>

        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-950 p-3 text-white">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Vista previa</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Cómo se verá</h2>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
            <div className="bg-slate-950 p-6 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Pormucha</p>
              <h3 className="mt-3 text-2xl font-black leading-tight">{subject || "Asunto de la promoción"}</h3>
              <p className="mt-2 text-sm text-slate-300">{preheader || "Texto previo del correo."}</p>
            </div>
            <div className="space-y-3 p-6">
              {(body || "Aquí aparecerá el mensaje promocional que escribas para tus contactos.")
                .split("\n")
                .filter(Boolean)
                .map((line, index) => (
                  <p key={`${line}-${index}`} className="text-sm leading-6 text-slate-600">{line}</p>
                ))}
              {ctaLabel && ctaUrl ? (
                <div className="pt-2">
                  <span className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-white">
                    {ctaLabel}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Historial</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Campañas recientes</h2>
          </div>
          <Mail className="text-slate-300" size={24} />
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                <th className="px-5 py-4">Asunto</th>
                <th className="px-5 py-4">Audiencia</th>
                <th className="px-5 py-4">Enviados</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {campaigns.length > 0 ? campaigns.map((campaign) => (
                <tr key={campaign.id} className="text-sm text-slate-700">
                  <td className="px-5 py-4">
                    <p className="font-black text-slate-950">{campaign.subject}</p>
                    <p className="mt-1 text-xs text-slate-400">{campaign.preheader || "Sin texto previo"}</p>
                  </td>
                  <td className="px-5 py-4 font-semibold">{campaign.audience}</td>
                  <td className="px-5 py-4 font-semibold">
                    {campaign.sentCount}/{campaign.recipientCount}
                    {campaign.failedCount > 0 ? <span className="ml-2 text-rose-600">Fallidos: {campaign.failedCount}</span> : null}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(campaign.status)}`}>
                      {statusLabel(campaign.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                    {new Date(campaign.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                    Aún no hay campañas enviadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 block">
      <span className="mb-2 block text-xs font-black text-slate-600">{label}</span>
      {children}
    </label>
  );
}
