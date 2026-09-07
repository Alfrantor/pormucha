"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FileDown, Globe2, MapPin, Repeat, X } from "lucide-react";

type WebInsightsData = {
  totalRevenue: number;
  oneTimeRevenue: number;
  subscriptionRevenue: number;
  orderCount: number;
  subscriptionOrderCount: number;
  activeSubscriptions: number;
  topSubscriptionPlan: { name: string; revenue: number; subscriptions: number; unitCount: number } | null;
  topFlavor: { name: string; units: number; ordersCount: number } | null;
  stateSales: { state: string; revenue: number; orders: number }[];
  stateTrend: Array<{ key: string; label: string; [state: string]: string | number }>;
  stateKeys: string[];
};

const STATE_COLORS = ["#0284c7", "#059669", "#f97316", "#7c3aed", "#e11d48"];

function money(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function compactMoney(value: number) {
  return value.toLocaleString("es-MX", {
    notation: "compact",
    maximumFractionDigits: 1,
    style: "currency",
    currency: "MXN",
  });
}

function tooltipMoney(value: unknown) {
  return money(Number(value || 0));
}

export function WebInsightsDashboard({ data }: { data: WebInsightsData }) {
  const [selectedState, setSelectedState] = useState(data.stateSales[0]?.state || "");
  const [showReportModal, setShowReportModal] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [reportFrom, setReportFrom] = useState(currentMonthStart);
  const [reportTo, setReportTo] = useState(today);
  const subscriptionShare = data.totalRevenue > 0 ? (data.subscriptionRevenue / data.totalRevenue) * 100 : 0;
  const oneTimeShare = data.totalRevenue > 0 ? (data.oneTimeRevenue / data.totalRevenue) * 100 : 0;
  const topStateRevenue = Math.max(...data.stateSales.map((state) => state.revenue), 1);
  const selectedStateStats = data.stateSales.find((state) => state.state === selectedState) || null;
  const selectedStateTrend = useMemo(() => {
    if (!selectedState) return [];
    return data.stateTrend.map((point) => ({
      key: point.key,
      label: point.label,
      Total: Number(point[selectedState] || 0),
    }));
  }, [data.stateTrend, selectedState]);
  const downloadWebReport = () => {
    if (!reportFrom || !reportTo) return;
    const params = new URLSearchParams({ from: reportFrom, to: reportTo });
    const link = document.createElement("a");
    link.href = `/api/admin/web-insights/report?${params.toString()}`;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setShowReportModal(false);
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-950 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-sky-300">Website</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Insights Web</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Ventas en línea, estados compradores, suscripciones y sabores vendidos desde checkout web.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-950 shadow-sm transition hover:bg-sky-50"
              >
                <FileDown size={14} />
                Reporte PDF
              </button>
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Ingreso web</p>
                <p className="mt-1 text-2xl font-black">{money(data.totalRevenue)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
          <WebMetricCard
            label="Pedidos web"
            value={data.orderCount.toLocaleString("es-MX")}
            helper={`${data.subscriptionOrderCount.toLocaleString("es-MX")} vienen de suscripción`}
            icon={<Globe2 size={16} />}
          />
          <WebMetricCard
            label="Suscripciones activas"
            value={data.activeSubscriptions.toLocaleString("es-MX")}
            helper="Clientes con plan vigente"
            icon={<Repeat size={16} />}
          />
          <WebMetricCard
            label="Plan más vendido"
            value={data.topSubscriptionPlan?.name || "Sin datos"}
            helper={data.topSubscriptionPlan ? `${data.topSubscriptionPlan.subscriptions} suscripciones · ${data.topSubscriptionPlan.unitCount} botellas` : "Aún no hay suscripciones"}
            icon={<Repeat size={16} />}
          />
          <WebMetricCard
            label="Sabor online líder"
            value={data.topFlavor?.name || "Sin datos"}
            helper={data.topFlavor ? `${data.topFlavor.units.toLocaleString("es-MX")} botellas · ${data.topFlavor.ordersCount} pedidos` : "Aún no hay sabores web"}
            icon={<MapPin size={16} />}
          />
        </div>
      </section>

      {showReportModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Reporte web</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Descargar PDF de Website</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Selecciona el rango para analizar ventas web, estados, suscripciones y sabores online.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Fecha inicial</span>
                <input
                  type="date"
                  value={reportFrom}
                  onChange={(event) => setReportFrom(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Fecha final</span>
                <input
                  type="date"
                  value={reportTo}
                  onChange={(event) => setReportTo(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={downloadWebReport}
                disabled={!reportFrom || !reportTo || reportFrom > reportTo}
                className="flex-1 rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Ingreso web</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">Suscripción vs venta única</h2>
          <div className="mt-5 space-y-4">
            <ChannelRow label="Suscripciones" value={data.subscriptionRevenue} total={data.totalRevenue} tone="bg-emerald-500" />
            <ChannelRow label="Ventas únicas" value={data.oneTimeRevenue} total={data.totalRevenue} tone="bg-sky-600" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Suscripción</p>
              <p className="mt-1 text-2xl font-black text-emerald-600">{Math.round(subscriptionShare)}%</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Venta única</p>
              <p className="mt-1 text-2xl font-black text-sky-600">{Math.round(oneTimeShare)}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Estados</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">Tendencia web por estado</h2>
              <p className="mt-1 text-sm text-slate-500">Selecciona un estado para ver su comportamiento mensual.</p>
            </div>
            <label className="block min-w-52">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Estado</span>
              <select
                value={selectedState}
                onChange={(event) => setSelectedState(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                {data.stateSales.length > 0 ? (
                  data.stateSales.map((state) => (
                    <option key={state.state} value={state.state}>
                      {state.state}
                    </option>
                  ))
                ) : (
                  <option value="">Sin estados</option>
                )}
              </select>
            </label>
          </div>
          {selectedStateStats ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-sky-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-500">Ingreso del estado</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{money(selectedStateStats.revenue)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Pedidos web</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{selectedStateStats.orders.toLocaleString("es-MX")}</p>
              </div>
            </div>
          ) : null}
          <div className="mt-6 h-80">
            {selectedState ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedStateTrend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={compactMoney} tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value, name) => [tooltipMoney(value), String(name)]}
                    labelStyle={{ color: "#0f172a", fontWeight: 900 }}
                    contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }}
                  />
                  <Line type="monotone" dataKey="Total" stroke="#0284c7" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm font-semibold text-slate-400">
                Aún no hay ventas web con estado registrado.
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
            {data.stateKeys.map((state, index) => (
              <button
                key={state}
                type="button"
                onClick={() => setSelectedState(state)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${
                  selectedState === state
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATE_COLORS[index % STATE_COLORS.length] }} />
                {state}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Ranking geográfico</p>
        <h2 className="mt-2 text-xl font-black text-slate-950">Estados donde más se vende</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {data.stateSales.length > 0 ? (
            data.stateSales.slice(0, 8).map((state, index) => (
              <button
                key={state.state}
                type="button"
                onClick={() => setSelectedState(state.state)}
                className={`rounded-2xl border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                  selectedState === state.state ? "border-sky-300 ring-2 ring-sky-100" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-950">{index + 1}. {state.state}</p>
                    <p className="text-xs font-semibold text-slate-400">{state.orders.toLocaleString("es-MX")} pedidos web</p>
                  </div>
                  <p className="shrink-0 font-black text-slate-950">{money(state.revenue)}</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-sky-600" style={{ width: `${Math.max(4, (state.revenue / topStateRevenue) * 100)}%` }} />
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-400 lg:col-span-2">
              Aún no hay pedidos web con estado capturado.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function WebMetricCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{label}</p>
        <span className="rounded-2xl bg-white p-2 text-slate-950 shadow-sm">{icon}</span>
      </div>
      <p className="mt-3 truncate text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

function ChannelRow({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const share = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="shrink-0 font-black text-slate-950">{money(value)} · {percent(share)}</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(share, 100)}%` }} />
      </div>
    </div>
  );
}
