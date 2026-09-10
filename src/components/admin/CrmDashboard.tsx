"use client";

import { useMemo, useState, useTransition } from "react";
import type React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, CircleDollarSign, Clipboard, Eye, Mail, MessageSquarePlus, Pencil, Phone, Plus, Search, UserRoundCheck, X } from "lucide-react";
import { addLeadActivity, convertLeadToClient, createCrmLead, markLeadLost, updateCrmLead } from "@/app/_actions/crm";
import { MEXICO_STATES } from "@/lib/mexico-states";

const STAGES = [
  { id: "ALL", label: "Todos" },
  { id: "NEW", label: "Nuevos" },
  { id: "FIRST_CONTACT", label: "Primer contacto" },
  { id: "INTERESTED", label: "Interesados" },
  { id: "SAMPLE_SENT", label: "Muestra" },
  { id: "NEGOTIATION", label: "Negociación" },
  { id: "CONVERTED", label: "Convertidos" },
  { id: "LOST", label: "Perdidos" },
];

const SOURCES = ["WEB", "MANUAL", "INSTAGRAM", "WHATSAPP", "REFERIDO", "OTRO"];
const PAGE_SIZE = 25;

const ACTIVITY_TYPES = [
  { id: "CALL", label: "Llamada" },
  { id: "WHATSAPP", label: "WhatsApp" },
  { id: "EMAIL", label: "Correo" },
  { id: "MEETING", label: "Reunión" },
  { id: "SAMPLE", label: "Muestra" },
  { id: "QUOTE", label: "Cotización" },
  { id: "NOTE", label: "Nota" },
];

const STATUS_FILTERS = [
  { id: "ACTIVE", label: "Activos" },
  { id: "CONVERTED", label: "Convertidos" },
  { id: "LOST", label: "Perdidos" },
  { id: "ALL", label: "Todos" },
];

const TASK_FILTERS = [
  { id: "ALL", label: "Todos" },
  { id: "OVERDUE", label: "Vencidos" },
  { id: "TODAY", label: "Hoy" },
  { id: "NEXT_7", label: "Próximos 7 días" },
  { id: "UNASSIGNED", label: "Sin seguimiento" },
];

const stageLabels: Record<string, string> = {
  NEW: "Nuevo",
  FIRST_CONTACT: "Primer contacto",
  INTERESTED: "Interesado",
  SAMPLE_SENT: "Muestra enviada",
  NEGOTIATION: "Negociación",
  CONVERTED: "Convertido",
  LOST: "Perdido",
};

const stageClasses: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-700",
  FIRST_CONTACT: "bg-blue-50 text-blue-700",
  INTERESTED: "bg-cyan-50 text-cyan-700",
  SAMPLE_SENT: "bg-amber-50 text-amber-700",
  NEGOTIATION: "bg-violet-50 text-violet-700",
  CONVERTED: "bg-emerald-50 text-emerald-700",
  LOST: "bg-rose-50 text-rose-700",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function dateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function getTaskState(value?: string | null) {
  if (!value) return "UNASSIGNED";
  const followUp = new Date(value);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const nextSevenEnd = new Date(todayStart.getTime() + 8 * 24 * 60 * 60 * 1000);

  if (followUp < todayStart) return "OVERDUE";
  if (followUp >= todayStart && followUp < tomorrowStart) return "TODAY";
  if (followUp >= tomorrowStart && followUp < nextSevenEnd) return "NEXT_7";
  return "LATER";
}

const attentionLabels: Record<string, { label: string; className: string }> = {
  OVERDUE: { label: "Vencido", className: "bg-rose-50 text-rose-700" },
  TODAY: { label: "Vence hoy", className: "bg-amber-50 text-amber-700" },
  NEXT_7: { label: "Próx. 7 días", className: "bg-blue-50 text-blue-700" },
  UNASSIGNED: { label: "Sin seguimiento", className: "bg-slate-100 text-slate-600" },
  LATER: { label: "Al día", className: "bg-emerald-50 text-emerald-700" },
};

function normalizeText(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeWords(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4);
}

function normalizePhone(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}

function editDistance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[a.length][b.length];
}

function namesLookSimilar(a?: string | null, b?: string | null) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (left.length < 6 || right.length < 6) return false;
  if (left === right) return true;

  const leftWords = normalizeWords(a);
  const rightWords = normalizeWords(b);
  const commonWords = leftWords.filter((word) => rightWords.includes(word));

  if (leftWords.length >= 2 && rightWords.length >= 2) {
    return commonWords.length >= 2;
  }

  if (leftWords.length === 1 && rightWords.length === 1 && left[0] === right[0]) {
    return editDistance(left, right) <= 1;
  }

  return false;
}

function getDuplicateMatches(lead: any, leads: any[], clients: any[]) {
  const email = (lead.email || "").toLowerCase().trim();
  const phone = normalizePhone(lead.phone);
  const matches: Array<{ type: string; label: string; reason: string; href?: string }> = [];

  leads.forEach((other) => {
    if (other.id === lead.id) return;
    const otherEmail = (other.email || "").toLowerCase().trim();
    const otherPhone = normalizePhone(other.phone);
    const reasons = [];
    if (email && otherEmail && email === otherEmail) reasons.push("correo");
    if (phone && otherPhone && phone === otherPhone) reasons.push("teléfono");
    if (namesLookSimilar(lead.name, other.name)) reasons.push("nombre similar");
    if (namesLookSimilar(lead.company, other.company)) reasons.push("empresa similar");
    if (reasons.length) matches.push({ type: "Lead", label: other.name || other.email, reason: reasons.join(", ") });
  });

  clients.forEach((client) => {
    const otherEmail = (client.email || "").toLowerCase().trim();
    const otherPhone = normalizePhone(client.phone);
    const reasons = [];
    if (email && otherEmail && email === otherEmail) reasons.push("correo");
    if (phone && otherPhone && phone === otherPhone) reasons.push("teléfono");
    if (namesLookSimilar(lead.name, client.fullName)) reasons.push("nombre similar");
    if (namesLookSimilar(lead.company, client.businessName)) reasons.push("empresa similar");
    if (reasons.length) matches.push({ type: "Cliente", label: client.fullName || client.email, reason: reasons.join(", "), href: `/admin/clients/${client.id}` });
  });

  return matches.slice(0, 6);
}

export function CrmDashboard({ leads, users, clients, stats, insights }: { leads: any[]; users: any[]; clients: any[]; stats: any; insights: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [stage, setStage] = useState("ALL");
  const [taskFilter, setTaskFilter] = useState("ALL");
  const [source, setSource] = useState("");
  const [state, setState] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [selectedId, setSelectedId] = useState(leads[0]?.id || "");
  const [showNewLead, setShowNewLead] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showEditLead, setShowEditLead] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (status !== "ALL" && lead.status !== status) return false;
      if (stage !== "ALL" && lead.stage !== stage) return false;
      if (taskFilter !== "ALL" && getTaskState(lead.nextFollowUpAt) !== taskFilter) return false;
      if (source && lead.source !== source) return false;
      if (state && lead.state !== state) return false;
      if (responsibleUserId && lead.responsibleUserId !== responsibleUserId) return false;
      if (!q) return true;
      return [lead.name, lead.email, lead.phone, lead.company, lead.city, lead.state, lead.interest]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [leads, query, source, stage, state, status, taskFilter, responsibleUserId]);

  const taskCounts = useMemo(() => {
    return leads
      .filter((lead) => status === "ALL" || lead.status === status)
      .reduce(
        (acc, lead) => {
          const key = getTaskState(lead.nextFollowUpAt);
          if (key === "OVERDUE") acc.OVERDUE += 1;
          if (key === "TODAY") acc.TODAY += 1;
          if (key === "NEXT_7") acc.NEXT_7 += 1;
          if (key === "UNASSIGNED") acc.UNASSIGNED += 1;
          return acc;
        },
        { OVERDUE: 0, TODAY: 0, NEXT_7: 0, UNASSIGNED: 0 },
      );
  }, [leads, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selectedLead = leads.find((lead) => lead.id === selectedId) || filtered[0] || null;
  const selectedDuplicates = selectedLead ? getDuplicateMatches(selectedLead, leads, clients) : [];

  const resetPage = () => setPage(1);

  const openLead = (lead: any) => {
    setSelectedId(lead.id);
    setShowDetail(true);
  };

  const runAction = (action: () => Promise<any>, onSuccess?: () => void) => {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setError(result.error);
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={<Plus size={18} />} label="Leads nuevos" value={stats.newLeads} helper="Últimos 30 días" />
        <MetricCard icon={<UserRoundCheck size={18} />} label="Convertidos" value={stats.convertedLeads} helper={`${stats.conversionRate}% conversión`} />
        <MetricCard icon={<CalendarClock size={18} />} label="Seguimientos vencidos" value={stats.overdueFollowUps} helper="Requieren atención" tone="amber" />
        <MetricCard icon={<CircleDollarSign size={18} />} label="Activos" value={stats.activeLeads} helper="En proceso comercial" tone="blue" />
      </div>

      <CrmInsights insights={insights} />

      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setStatus(item.id);
                setStage("ALL");
                setTaskFilter("ALL");
                resetPage();
              }}
              className={`rounded-full px-4 py-2 text-xs font-black transition ${
                status === item.id ? "bg-slate-950 text-white shadow-sm" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-slate-400">Tareas y recordatorios</p>
            <p className="text-xs font-semibold text-slate-500">Se calculan con la fecha manual de próximo seguimiento.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TASK_FILTERS.map((item) => {
              const count = item.id === "ALL" ? null : taskCounts[item.id as keyof typeof taskCounts] || 0;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTaskFilter(item.id);
                    resetPage();
                  }}
                  className={`rounded-full px-4 py-2 text-xs font-black transition ${
                    taskFilter === item.id ? "bg-amber-500 text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                  {count !== null ? <span className="ml-2 rounded-full bg-white/25 px-2 py-0.5">{count}</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {STAGES.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setStage(item.id);
                  resetPage();
                }}
                className={`rounded-full px-4 py-2 text-xs font-black transition ${
                  stage === item.id ? "bg-slate-950 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowNewLead(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-white transition hover:bg-slate-800"
          >
            <Plus size={15} />
            Nuevo lead
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_170px_220px_220px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                resetPage();
              }}
              placeholder="Buscar por nombre, correo, empresa, interés o estado..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-slate-950"
            />
          </div>
          <select
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              resetPage();
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
          >
            <option value="">Origen</option>
            {SOURCES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={state}
            onChange={(event) => {
              setState(event.target.value);
              resetPage();
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
          >
            <option value="">Estado</option>
            {MEXICO_STATES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={responsibleUserId}
            onChange={(event) => {
              setResponsibleUserId(event.target.value);
              resetPage();
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
          >
            <option value="">Vendedor</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-slate-400">Pipeline</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{filtered.length} prospectos</h2>
          </div>
          <p className="text-xs font-bold text-slate-400">
            Mostrando {filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1260px] w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
              <tr>
                <th className="px-5 py-4">Prospecto</th>
                <th className="px-5 py-4">Etapa</th>
                <th className="px-5 py-4">Origen</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4">Vendedor</th>
                <th className="px-5 py-4">Atención</th>
                <th className="px-5 py-4">Último contacto</th>
                <th className="px-5 py-4">Próximo</th>
                <th className="px-5 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length ? (
                paginated.map((lead) => {
                  const attention = attentionLabels[getTaskState(lead.nextFollowUpAt)];
                  const hasDuplicates = getDuplicateMatches(lead, leads, clients).length > 0;
                  return (
                  <tr key={lead.id} onClick={() => openLead(lead)} className="cursor-pointer transition hover:bg-slate-50">
                    <td
                      className="px-5 py-4"
                    >
                      <p className="font-black text-slate-950">{lead.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                        <Mail size={12} />
                        {lead.email}
                      </p>
                      {lead.company ? <p className="mt-1 text-xs text-slate-400">{lead.company}</p> : null}
                      {hasDuplicates ? <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Posible duplicado</p> : null}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${stageClasses[lead.stage] || "bg-slate-100 text-slate-600"}`}>
                        {stageLabels[lead.stage] || lead.stage}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-600">{lead.source || "WEB"}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-600">{lead.state || "-"}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-600">{lead.responsibleName || lead.responsible || "-"}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${attention.className}`}>{attention.label}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">{formatDate(lead.lastContactAt || lead.firstContactAt)}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-700">{formatDate(lead.nextFollowUpAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          openLead(lead);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-slate-950 hover:text-slate-950"
                      >
                        <Eye size={14} />
                        Ver
                      </button>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-slate-500" colSpan={9}>
                    No hay leads con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 ? (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-slate-400">25 registros por página</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
                className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
                Página {safePage} de {totalPages}
              </span>
              <button
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage === totalPages}
                className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {showDetail && selectedLead ? (
        <Modal title="Detalle del lead" onClose={() => setShowDetail(false)}>
          <LeadDetail
            lead={selectedLead}
            duplicates={selectedDuplicates}
            isPending={isPending}
            onUpdate={(input: any) => runAction(() => updateCrmLead(selectedLead.id, input))}
            onActivity={() => setShowActivity(true)}
            onEdit={() => setShowEditLead(true)}
            onConvert={() => runAction(() => convertLeadToClient(selectedLead.id))}
            onLost={(reason: string) => runAction(() => markLeadLost(selectedLead.id, reason))}
          />
        </Modal>
      ) : null}

      {showNewLead ? (
        <NewLeadModal
          users={users}
          isPending={isPending}
          onClose={() => setShowNewLead(false)}
          onSubmit={(input: any) => runAction(() => createCrmLead(input), () => setShowNewLead(false))}
        />
      ) : null}

      {showActivity && selectedLead ? (
        <ActivityModal
          isPending={isPending}
          onClose={() => setShowActivity(false)}
          onSubmit={(input: any) => runAction(() => addLeadActivity(selectedLead.id, input), () => setShowActivity(false))}
        />
      ) : null}

      {showEditLead && selectedLead ? (
        <EditLeadModal
          lead={selectedLead}
          users={users}
          isPending={isPending}
          onClose={() => setShowEditLead(false)}
          onSubmit={(input: any) => runAction(() => updateCrmLead(selectedLead.id, input), () => setShowEditLead(false))}
        />
      ) : null}
    </div>
  );
}

function MetricCard({ icon, label, value, helper, tone = "slate" }: { icon: React.ReactNode; label: string; value: number | string; helper: string; tone?: string }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-950 text-white",
    amber: "bg-amber-50 text-amber-800",
    blue: "bg-blue-50 text-blue-800",
  };

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex rounded-2xl p-3 ${tones[tone] || tones.slate}`}>{icon}</div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.32em] text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
    </div>
  );
}

function CrmInsights({ insights }: { insights: any }) {
  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Insights CRM</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Rendimiento comercial</h2>
        </div>
        <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
          Conversión {insights.conversionRate}%
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <InsightNumber label="Hoy" value={insights.newToday} helper="Leads nuevos" />
        <InsightNumber label="Semana" value={insights.newWeek} helper="Leads nuevos" />
        <InsightNumber label="Mes" value={insights.newMonth} helper="Leads nuevos" />
        <InsightNumber label="Promedio conversión" value={`${insights.avgConversionDays} d`} helper="Tiempo a cliente" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <InsightList title="Leads por origen" items={insights.bySource} />
        <InsightList title="Leads por estado" items={insights.byState} />
        <InsightList title="Convertidos por vendedor" items={insights.convertedByResponsible} empty="Sin conversiones todavía" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <InsightList title="Motivos de pérdida" items={insights.lostReasons} empty="Sin leads perdidos" />
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Web vs manual</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InsightNumber label="Web" value={insights.webLeads} helper="Captados por formulario" />
            <InsightNumber label="Manual / otros" value={insights.manualLeads} helper="Prospectados por equipo" />
          </div>
          <p className="mt-4 text-xs font-semibold text-amber-700">Seguimientos vencidos: {insights.overdueFollowUps}</p>
        </div>
      </div>
    </section>
  );
}

function InsightNumber({ label, value, helper }: { label: string; value: number | string; helper: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
    </div>
  );
}

function InsightList({ title, items, empty = "Sin datos" }: { title: string; items: Array<{ label: string; value: number }>; empty?: string }) {
  const topItems = Array.isArray(items) ? items.slice(0, 5) : [];
  const max = Math.max(...topItems.map((item) => item.value), 1);

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{title}</p>
      <div className="mt-4 space-y-3">
        {topItems.length ? (
          topItems.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-3 text-xs font-black text-slate-700">
                <span className="truncate">{item.label}</span>
                <span>{item.value}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white">
                <div className="h-2 rounded-full bg-slate-950" style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">{empty}</p>
        )}
      </div>
    </div>
  );
}

function LeadDetail({ lead, duplicates = [], isPending, onUpdate, onActivity, onEdit, onConvert, onLost }: any) {
  const [lostReason, setLostReason] = useState("");
  const attention = attentionLabels[getTaskState(lead.nextFollowUpAt)];
  const phoneDigits = normalizePhone(lead.phone);
  const whatsappUrl = phoneDigits ? `https://wa.me/${phoneDigits.startsWith("52") ? phoneDigits : `52${phoneDigits}`}` : "";

  const copyValue = async (value?: string | null) => {
    if (!value) return;
    await navigator.clipboard?.writeText(value);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="space-y-4">
        <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Ficha CRM</p>
          <h2 className="mt-2 text-2xl font-black leading-tight">{lead.name}</h2>
          <p className="mt-2 text-sm font-semibold text-slate-300">{lead.email}</p>
          {lead.company ? <p className="mt-1 text-sm text-slate-400">{lead.company}</p> : null}
          <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${attention.className}`}>{attention.label}</span>
        </div>

        {duplicates.length ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-700">Posibles duplicados</p>
            <div className="mt-3 space-y-2">
              {duplicates.map((match: any, index: number) => (
                <div key={`${match.type}-${match.label}-${index}`} className="rounded-2xl bg-white px-3 py-2 text-sm">
                  <p className="font-black text-slate-900">
                    {match.type}: {match.href ? <Link href={match.href} className="underline">{match.label}</Link> : match.label}
                  </p>
                  <p className="text-xs font-semibold text-amber-700">Coincide por {match.reason}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Info label="Origen" value={lead.source || "WEB"} />
          <Info label="Estado" value={lead.state || "-"} />
          <Info label="Interés" value={lead.interest || "-"} />
          <Info label="Responsable" value={lead.responsibleName || lead.responsible || "-"} />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Acciones rápidas</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <QuickAction disabled={!lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} icon={<Phone size={15} />} label="Llamar" />
            <QuickAction disabled={!whatsappUrl} href={whatsappUrl || undefined} icon={<MessageSquarePlus size={15} />} label="WhatsApp" external />
            <QuickAction disabled={!lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} icon={<Mail size={15} />} label="Correo" />
            <button
              disabled={!lead.phone}
              onClick={() => copyValue(lead.phone)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Clipboard size={15} />
              Copiar teléfono
            </button>
            <button
              disabled={!lead.email}
              onClick={() => copyValue(lead.email)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-2"
            >
              <Clipboard size={15} />
              Copiar correo
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Actualizar seguimiento</p>
          <div className="mt-3 grid gap-3">
            <select
              defaultValue={lead.stage}
              onChange={(event) => onUpdate({ stage: event.target.value })}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none"
            >
              {STAGES.filter((item) => item.id !== "ALL").map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <input
              defaultValue={lead.responsible || ""}
              onBlur={(event) => onUpdate({ responsible: event.target.value })}
              placeholder="Responsable"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none"
            />
            <input
              type="datetime-local"
              defaultValue={dateTimeLocal(lead.nextFollowUpAt)}
              onBlur={(event) => onUpdate({ nextFollowUpAt: event.target.value })}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <button
            disabled={isPending}
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Pencil size={16} />
            Editar datos del lead
          </button>
          <button
            disabled={isPending}
            onClick={onActivity}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            <MessageSquarePlus size={16} />
            Agregar seguimiento
          </button>
          <button
            disabled={isPending || lead.status === "CONVERTED"}
            onClick={onConvert}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            Convertir a cliente
          </button>
          {lead.clientId ? (
            <Link href={`/admin/clients/${lead.clientId}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700 transition hover:bg-slate-50">
              Ver cliente vinculado
            </Link>
          ) : null}
        </div>

        {lead.status !== "LOST" ? (
          <div className="rounded-3xl border border-rose-100 bg-rose-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-rose-500">Marcar perdido</p>
            <textarea
              value={lostReason}
              onChange={(event) => setLostReason(event.target.value)}
              placeholder="Motivo de pérdida"
              className="mt-3 h-20 w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm outline-none"
            />
            <button
              disabled={isPending}
              onClick={() => onLost(lostReason)}
              className="mt-3 w-full rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white transition hover:bg-rose-700 disabled:opacity-50"
            >
              Marcar como perdido
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-slate-400">Timeline</p>
        <div className="mt-3 max-h-[33rem] space-y-3 overflow-y-auto pr-1">
          {lead.activities?.length ? (
            lead.activities.map((activity: any) => (
              <div key={activity.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{activity.type}</span>
                  <span className="text-xs text-slate-400">{formatDate(activity.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-700">{activity.note}</p>
                {activity.nextFollowUpAt ? <p className="mt-2 text-xs font-bold text-amber-700">Próximo: {formatDate(activity.nextFollowUpAt)}</p> : null}
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Sin seguimientos todavía.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, label, icon, disabled = false, external = false }: { href?: string; label: string; icon: React.ReactNode; disabled?: boolean; external?: boolean }) {
  if (disabled || !href) {
    return (
      <span className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-300">
        {icon}
        {label}
      </span>
    );
  }

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
    >
      {icon}
      {label}
    </a>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function NewLeadModal({ users, isPending, onClose, onSubmit }: any) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    personType: "PERSONA",
    source: "MANUAL",
    state: "",
    city: "",
    interest: "",
    responsibleUserId: "",
    nextFollowUpAt: "",
    note: "",
  });

  return (
    <Modal title="Nuevo lead" onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(form);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Nombre *" value={form.name} onChange={(value: string) => setForm({ ...form, name: value })} required />
          <TextInput label="Correo *" value={form.email} onChange={(value: string) => setForm({ ...form, email: value })} required type="email" />
          <TextInput label="Teléfono" value={form.phone} onChange={(value: string) => setForm({ ...form, phone: value })} />
          <TextInput label="Empresa" value={form.company} onChange={(value: string) => setForm({ ...form, company: value })} />
          <SelectInput label="Tipo" value={form.personType} onChange={(value: string) => setForm({ ...form, personType: value })} options={["PERSONA", "EMPRESA"]} />
          <SelectInput label="Origen" value={form.source} onChange={(value: string) => setForm({ ...form, source: value })} options={SOURCES} />
          <SelectInput label="Estado" value={form.state} onChange={(value: string) => setForm({ ...form, state: value })} options={MEXICO_STATES as unknown as string[]} empty="Sin estado" />
          <TextInput label="Ciudad" value={form.city} onChange={(value: string) => setForm({ ...form, city: value })} />
          <TextInput label="Interés" value={form.interest} onChange={(value: string) => setForm({ ...form, interest: value })} />
          <UserSelect label="Vendedor asignado" value={form.responsibleUserId} onChange={(value: string) => setForm({ ...form, responsibleUserId: value })} users={users} />
          <TextInput label="Próximo seguimiento" value={form.nextFollowUpAt} onChange={(value: string) => setForm({ ...form, nextFollowUpAt: value })} type="datetime-local" />
        </div>
        <textarea
          value={form.note}
          onChange={(event) => setForm({ ...form, note: event.target.value })}
          placeholder="Comentario inicial"
          className="h-24 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
        />
        <button disabled={isPending} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50">
          Guardar lead
        </button>
      </form>
    </Modal>
  );
}

function EditLeadModal({ lead, users, isPending, onClose, onSubmit }: any) {
  const [form, setForm] = useState({
    name: lead.name || "",
    email: lead.email || "",
    phone: lead.phone || "",
    company: lead.company || "",
    personType: lead.personType || "PERSONA",
    source: lead.source || "WEB",
    state: lead.state || "",
    city: lead.city || "",
    interest: lead.interest || "",
    responsibleUserId: lead.responsibleUserId || "",
    nextFollowUpAt: dateTimeLocal(lead.nextFollowUpAt),
  });

  return (
    <Modal title="Editar lead" onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(form);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Nombre *" value={form.name} onChange={(value: string) => setForm({ ...form, name: value })} required />
          <TextInput label="Correo *" value={form.email} onChange={(value: string) => setForm({ ...form, email: value })} required type="email" />
          <TextInput label="Teléfono" value={form.phone} onChange={(value: string) => setForm({ ...form, phone: value })} />
          <TextInput label="Empresa" value={form.company} onChange={(value: string) => setForm({ ...form, company: value })} />
          <SelectInput label="Tipo" value={form.personType} onChange={(value: string) => setForm({ ...form, personType: value })} options={["PERSONA", "EMPRESA"]} />
          <SelectInput label="Origen" value={form.source} onChange={(value: string) => setForm({ ...form, source: value })} options={SOURCES} />
          <SelectInput label="Estado" value={form.state} onChange={(value: string) => setForm({ ...form, state: value })} options={MEXICO_STATES as unknown as string[]} empty="Sin estado" />
          <TextInput label="Ciudad" value={form.city} onChange={(value: string) => setForm({ ...form, city: value })} />
          <TextInput label="Interés" value={form.interest} onChange={(value: string) => setForm({ ...form, interest: value })} />
          <UserSelect label="Vendedor asignado" value={form.responsibleUserId} onChange={(value: string) => setForm({ ...form, responsibleUserId: value })} users={users} />
          <TextInput label="Próximo seguimiento" value={form.nextFollowUpAt} onChange={(value: string) => setForm({ ...form, nextFollowUpAt: value })} type="datetime-local" />
        </div>
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800">
          El próximo seguimiento se captura manualmente. Con esa fecha el CRM lo clasifica como vencido, hoy, próximos 7 días o sin seguimiento.
        </div>
        <button disabled={isPending} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50">
          Guardar cambios
        </button>
      </form>
    </Modal>
  );
}

function ActivityModal({ isPending, onClose, onSubmit }: any) {
  const [form, setForm] = useState({
    type: "WHATSAPP",
    note: "",
    outcome: "",
    nextFollowUpAt: "",
  });

  return (
    <Modal title="Agregar seguimiento" onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(form);
        }}
      >
        <SelectInput label="Tipo" value={form.type} onChange={(value: string) => setForm({ ...form, type: value })} options={ACTIVITY_TYPES.map((item) => item.id)} />
        <textarea
          required
          value={form.note}
          onChange={(event) => setForm({ ...form, note: event.target.value })}
          placeholder="Qué pasó con el cliente/prospecto..."
          className="h-28 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
        />
        <TextInput label="Resultado" value={form.outcome} onChange={(value: string) => setForm({ ...form, outcome: value })} />
        <TextInput label="Próximo seguimiento" value={form.nextFollowUpAt} onChange={(value: string) => setForm({ ...form, nextFollowUpAt: value })} type="datetime-local" />
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
          El seguimiento se registrará automáticamente con tu usuario.
        </div>
        <button disabled={isPending} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50">
          Guardar seguimiento
        </button>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children, size = "default" }: { title: string; onClose: () => void; children: React.ReactNode; size?: "default" | "wide" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-[2rem] bg-white shadow-2xl ${size === "wide" ? "max-w-6xl" : "max-w-3xl"}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">CRM</p>
            <h2 className="text-2xl font-black text-slate-950">{title}</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange, type = "text", required = false }: any) {
  return (
    <label className="grid gap-1 text-sm font-black text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
      />
    </label>
  );
}

function SelectInput({ label, value, onChange, options, empty }: any) {
  return (
    <label className="grid gap-1 text-sm font-black text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
      >
        {empty ? <option value="">{empty}</option> : null}
        {options.map((option: string) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function UserSelect({ label, value, onChange, users }: { label: string; value: string; onChange: (value: string) => void; users: any[] }) {
  return (
    <label className="grid gap-1 text-sm font-black text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
      >
        <option value="">Asignar automáticamente</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.fullName}
          </option>
        ))}
      </select>
    </label>
  );
}
