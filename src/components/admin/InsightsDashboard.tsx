"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FileDown, Search, X } from "lucide-react";

type SalesTrendPoint = {
  key: string;
  label: string;
  Web: number;
  POS: number;
  Total: number;
  pedidos: number;
};

type InsightClient = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  classification: string;
};

type InsightOrder = {
  id: string;
  folio: string | null;
  clientId: string | null;
  fullName: string | null;
  channel: string;
  total: number;
  createdAt: string;
};

type InsightsDashboardProps = {
  salesTrend: SalesTrendPoint[];
  clients: InsightClient[];
  orders: InsightOrder[];
};

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function money(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
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

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return `${MONTH_LABELS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`;
}

function recentMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return {
      key: monthKey(date),
      label: monthLabel(date),
    };
  });
}

export function InsightsDashboard({ salesTrend, clients, orders }: InsightsDashboardProps) {
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [showReportModal, setShowReportModal] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [reportFrom, setReportFrom] = useState(currentMonthStart);
  const [reportTo, setReportTo] = useState(today);
  const deferredSearch = useDeferredValue(clientSearch.trim().toLowerCase());

  const clientsWithPurchases = useMemo(() => {
    const statsByClient = new Map<string, { total: number; orders: number; lastPurchase: string | null }>();
    for (const order of orders) {
      if (!order.clientId) continue;
      const current = statsByClient.get(order.clientId) || { total: 0, orders: 0, lastPurchase: null };
      current.total += order.total;
      current.orders += 1;
      if (!current.lastPurchase || new Date(order.createdAt) > new Date(current.lastPurchase)) {
        current.lastPurchase = order.createdAt;
      }
      statsByClient.set(order.clientId, current);
    }

    return clients
      .map((client) => ({
        ...client,
        total: statsByClient.get(client.id)?.total || 0,
        orders: statsByClient.get(client.id)?.orders || 0,
        lastPurchase: statsByClient.get(client.id)?.lastPurchase || null,
      }))
      .filter((client) => client.orders > 0)
      .sort((a, b) => b.total - a.total);
  }, [clients, orders]);

  const filteredClients = useMemo(() => {
    if (!deferredSearch) return clientsWithPurchases.slice(0, 8);

    return clientsWithPurchases
      .filter((client) => {
        const haystack = [
          client.fullName,
          client.email || "",
          client.phone || "",
          client.classification,
        ].join(" ").toLowerCase();
        return haystack.includes(deferredSearch);
      })
      .slice(0, 8);
  }, [clientsWithPurchases, deferredSearch]);

  const selectedClient = useMemo(() => {
    return clientsWithPurchases.find((client) => client.id === selectedClientId) || filteredClients[0] || null;
  }, [clientsWithPurchases, filteredClients, selectedClientId]);

  const selectedClientOrders = useMemo(() => {
    if (!selectedClient) return [];
    return orders
      .filter((order) => order.clientId === selectedClient.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, selectedClient]);

  const selectedClientTrend = useMemo(() => {
    const months = recentMonths(12);
    return months.map((month) => {
      const monthOrders = selectedClientOrders.filter((order) => monthKey(new Date(order.createdAt)) === month.key);
      const total = monthOrders.reduce((sum, order) => sum + order.total, 0);
      return {
        ...month,
        Total: total,
        pedidos: monthOrders.length,
      };
    });
  }, [selectedClientOrders]);

  const selectedClientTotal = selectedClientOrders.reduce((sum, order) => sum + order.total, 0);

  const downloadSalesReport = () => {
    if (!reportFrom || !reportTo) return;
    const params = new URLSearchParams({ from: reportFrom, to: reportTo });
    const link = document.createElement("a");
    link.href = `/api/admin/insights/sales-report?${params.toString()}`;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setShowReportModal(false);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Tendencia</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">Ventas por mes</h2>
            <p className="mt-1 text-sm text-slate-500">Línea comparativa de ventas web, POS y total acumulado mensual.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white shadow-sm transition hover:bg-slate-800"
          >
            <FileDown size={14} />
            Reporte PDF
          </button>
        </div>

        <div className="mt-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesTrend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={compactMoney} tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value, name) => [tooltipMoney(value), String(name)]}
                labelStyle={{ color: "#0f172a", fontWeight: 900 }}
                contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }}
              />
              <Line type="monotone" dataKey="Total" stroke="#020617" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Web" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="POS" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-950" />Total</span>
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-sky-600" />Web</span>
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-violet-600" />POS</span>
        </div>
      </section>

      {showReportModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Reporte</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Reporte de ventas PDF</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Selecciona el rango de fechas para descargar el resumen de ventas.
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
                onClick={downloadSalesReport}
                disabled={!reportFrom || !reportTo || reportFrom > reportTo}
                className="flex-1 rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Cliente</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">Buscar histórico</h2>
          <div className="relative mt-5">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
            <input
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
              placeholder="Buscar por cliente, correo o teléfono..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>

          <div className="mt-4 space-y-2">
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClientId(client.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedClient?.id === client.id
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{client.fullName}</p>
                      <p className={`mt-1 truncate text-xs font-semibold ${selectedClient?.id === client.id ? "text-slate-300" : "text-slate-400"}`}>
                        {client.email || client.phone || client.classification}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-black">{money(client.total)}</p>
                      <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${selectedClient?.id === client.id ? "text-slate-300" : "text-slate-400"}`}>
                        {client.orders} compras
                      </p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-400">
                No encontré clientes con compras para esa búsqueda.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          {selectedClient ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Histórico de compras</p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">{selectedClient.fullName}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-400">{selectedClient.classification}</p>
                </div>
                <div className="rounded-2xl bg-slate-950 px-4 py-3 text-right text-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Total comprado</p>
                  <p className="mt-1 text-xl font-black">{money(selectedClientTotal)}</p>
                </div>
              </div>

              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedClientTrend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={compactMoney} tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(value) => [tooltipMoney(value), "Compras"]}
                      labelStyle={{ color: "#0f172a", fontWeight: 900 }}
                      contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }}
                    />
                    <Line type="monotone" dataKey="Total" stroke="#020617" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Pedido</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Canal</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedClientOrders.slice(0, 8).map((order) => (
                      <tr key={order.id}>
                        <td className="px-4 py-3 font-black text-slate-950">{order.folio || `#${order.id.slice(-6).toUpperCase()}`}</td>
                        <td className="px-4 py-3 font-semibold text-slate-500">{new Date(order.createdAt).toLocaleDateString("es-MX")}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                            {order.channel === "POS" ? "POS" : "Web"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-950">{money(order.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex min-h-[28rem] items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center text-sm font-semibold text-slate-400">
              Busca o selecciona un cliente para ver su histórico.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
