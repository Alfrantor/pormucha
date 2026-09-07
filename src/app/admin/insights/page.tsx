import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CreditCard, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { db } from "@/lib/db";
import { ensureSubscriptionScheduleSchema } from "@/lib/subscriptions";
import { InsightsDashboard } from "@/components/admin/InsightsDashboard";

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function money(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function recentMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return {
      key: monthKey(date),
      label: `${MONTH_LABELS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`,
    };
  });
}

export default async function InsightsPage() {
  await ensureSubscriptionScheduleSchema();

  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;

  if (role !== "admin") {
    redirect("/perfil");
  }

  const months = recentMonths(6);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [orders, clients, subscriptions] = await Promise.all([
    db.order.findMany({
      where: { status: { not: "CANCELLED" } },
      select: {
        id: true,
        folio: true,
        createdAt: true,
        channel: true,
        total: true,
        clientId: true,
        fullName: true,
        subscriptionId: true,
        orderItems: {
          select: {
            quantity: true,
            flavorId: true,
            productName: true,
            flavor: { select: { id: true, name: true } },
            composition: {
              select: {
                quantity: true,
                flavor: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.client.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        classification: true,
        type: true,
        status: true,
        creditLimit: true,
        creditUsed: true,
        createdAt: true,
      },
    }),
    db.subscription.findMany({
      select: {
        id: true,
        status: true,
        createdAt: true,
        canceledAt: true,
      },
    }),
  ]);

  const clientById = new Map(clients.map((client) => [client.id, client]));
  const validOrders = orders.filter((order) => Number(order.total || 0) > 0);
  const totalRevenue = validOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const posOrders = validOrders.filter((order) => order.channel === "POS");
  const webOrders = validOrders.filter((order) => order.channel !== "POS");
  const subscriptionOrders = validOrders.filter((order) => order.subscriptionId);
  const averageTicket = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;
  const creditExposure = clients.reduce((sum, client) => sum + Number(client.creditUsed || 0), 0);
  const activeClients = clients.filter((client) => client.status === "ACTIVO").length;
  const clientsThisMonth = clients.filter((client) => client.createdAt >= monthStart).length;
  const flavorSalesMap = new Map<string, { id: string; name: string; units: number; orders: Set<string> }>();

  for (const order of validOrders) {
    for (const item of order.orderItems) {
      if (item.composition.length > 0) {
        for (const component of item.composition) {
          const flavor = component.flavor;
          const current = flavorSalesMap.get(flavor.id) || { id: flavor.id, name: flavor.name, units: 0, orders: new Set<string>() };
          current.units += Number(item.quantity || 0) * Number(component.quantity || 0);
          current.orders.add(order.id);
          flavorSalesMap.set(flavor.id, current);
        }
        continue;
      }

      if (item.flavorId && item.flavor) {
        const current = flavorSalesMap.get(item.flavorId) || { id: item.flavorId, name: item.flavor.name, units: 0, orders: new Set<string>() };
        current.units += Number(item.quantity || 0);
        current.orders.add(order.id);
        flavorSalesMap.set(item.flavorId, current);
      }
    }
  }

  const flavorSales = Array.from(flavorSalesMap.values())
    .map((entry) => ({ ...entry, ordersCount: entry.orders.size }))
    .sort((a, b) => b.units - a.units);
  const mostSoldFlavor = flavorSales[0] || null;
  const leastSoldFlavor = flavorSales.length > 0 ? flavorSales[flavorSales.length - 1] : null;

  const topCustomersMap = new Map<string, { id: string; name: string; classification: string; orders: number; total: number }>();
  for (const order of validOrders) {
    if (!order.clientId) continue;
    const client = clientById.get(order.clientId);
    const current = topCustomersMap.get(order.clientId) || {
      id: order.clientId,
      name: client?.fullName || "Cliente sin nombre",
      classification: client?.classification || "-",
      orders: 0,
      total: 0,
    };
    current.orders += 1;
    current.total += Number(order.total || 0);
    topCustomersMap.set(order.clientId, current);
  }
  const topCustomers = Array.from(topCustomersMap.values()).sort((a, b) => b.total - a.total).slice(0, 8);

  const monthlyData = months.map((month) => {
    const monthOrders = validOrders.filter((order) => monthKey(order.createdAt) === month.key);
    const pos = monthOrders.filter((order) => order.channel === "POS").reduce((sum, order) => sum + Number(order.total || 0), 0);
    const web = monthOrders.filter((order) => order.channel !== "POS").reduce((sum, order) => sum + Number(order.total || 0), 0);
    return {
      ...month,
      POS: pos,
      Web: web,
      Total: pos + web,
      pedidos: monthOrders.length,
    };
  });
  const maxTopCustomerTotal = Math.max(...topCustomers.map((item) => item.total), 1);

  const clientSegments = [
    { label: "Público general", value: clients.filter((client) => client.type === "PUBLICO_GENERAL").length, tone: "bg-slate-950" },
    { label: "Minoristas", value: clients.filter((client) => client.classification === "MINORISTA").length, tone: "bg-blue-500" },
    { label: "Mayoristas", value: clients.filter((client) => client.classification === "MAYORISTA").length, tone: "bg-violet-500" },
    { label: "Distribuidores", value: clients.filter((client) => client.classification === "DISTRIBUIDOR").length, tone: "bg-amber-500" },
  ];

  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === "ACTIVE").length;
  const canceledSubscriptions = subscriptions.filter((subscription) => subscription.status === "CANCELED" || subscription.canceledAt).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Insights</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Insights</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Métricas vivas de ventas, canales, clientes y suscripciones. Se recalculan al cargar la página con datos actuales de la base.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Órdenes analizadas</p>
            <p className="text-2xl font-black">{validOrders.length.toLocaleString("es-MX")}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ventas totales" value={money(totalRevenue)} helper="Pedidos no cancelados" icon={<TrendingUp size={16} />} />
        <MetricCard label="Ticket promedio" value={money(averageTicket)} helper="Promedio por orden" icon={<ShoppingCart size={16} />} />
        <MetricCard label="Clientes activos" value={activeClients.toLocaleString("es-MX")} helper={`${clientsThisMonth} altas este mes`} icon={<Users size={16} />} />
        <MetricCard label="Crédito usado" value={money(creditExposure)} helper="Exposición vigente" icon={<CreditCard size={16} />} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <FlavorInsightCard
          label="Sabor más vendido"
          flavor={mostSoldFlavor}
          emptyMessage="Aún no hay sabores vendidos."
          tone="from-emerald-500 to-teal-600"
        />
        <FlavorInsightCard
          label="Sabor menos vendido"
          flavor={leastSoldFlavor}
          emptyMessage="Aún no hay suficientes ventas por sabor."
          tone="from-amber-500 to-orange-600"
        />
      </section>

      <InsightsDashboard
        salesTrend={monthlyData}
        clients={clients.map((client) => ({
          id: client.id,
          fullName: client.fullName,
          email: client.email,
          phone: client.phone,
          classification: client.classification,
        }))}
        orders={validOrders.map((order) => ({
          id: order.id,
          folio: order.folio,
          clientId: order.clientId,
          fullName: order.fullName,
          channel: order.channel,
          total: Number(order.total || 0),
          createdAt: order.createdAt.toISOString(),
        }))}
      />

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Canales</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">Composición de ventas</h2>
          <div className="mt-6 space-y-4">
            <ChannelRow label="Web" value={webOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)} total={totalRevenue} tone="bg-slate-950" />
            <ChannelRow label="POS" value={posOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)} total={totalRevenue} tone="bg-violet-500" />
            <ChannelRow label="Suscripción" value={subscriptionOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)} total={totalRevenue} tone="bg-emerald-500" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <MiniStat label="Suscripciones activas" value={activeSubscriptions} />
            <MiniStat label="Canceladas" value={canceledSubscriptions} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Clientes</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">Top clientes por facturación</h2>
          <div className="mt-6 space-y-4">
            {topCustomers.length > 0 ? (
              topCustomers.map((customer, index) => (
                <div key={customer.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-950">{index + 1}. {customer.name}</p>
                      <p className="text-xs font-semibold text-slate-400">{customer.classification} · {customer.orders} órdenes</p>
                    </div>
                    <p className="shrink-0 font-black text-slate-950">{money(customer.total)}</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-slate-950" style={{ width: `${Math.max(4, (customer.total / maxTopCustomerTotal) * 100)}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-400">
                Aún no hay ventas vinculadas a clientes.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Cartera</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">Segmentación de clientes</h2>
          <div className="mt-6 space-y-4">
            {clientSegments.map((segment) => (
              <SegmentRow key={segment.label} label={segment.label} value={segment.value} total={clients.length} tone={segment.tone} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
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
    <div className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{label}</p>
        <span className="rounded-2xl bg-slate-950 p-2 text-white">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function FlavorInsightCard({
  label,
  flavor,
  emptyMessage,
  tone,
}: {
  label: string;
  flavor: { name: string; units: number; ordersCount: number } | null;
  emptyMessage: string;
  tone: string;
}) {
  return (
    <div className={`overflow-hidden rounded-[1.4rem] bg-gradient-to-br ${tone} p-5 text-white shadow-sm`}>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">{label}</p>
      {flavor ? (
        <>
          <p className="mt-4 text-3xl font-black tracking-tight">{flavor.name}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/15 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">Botellas</p>
              <p className="mt-1 text-2xl font-black">{flavor.units.toLocaleString("es-MX")}</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">Pedidos</p>
              <p className="mt-1 text-2xl font-black">{flavor.ordersCount.toLocaleString("es-MX")}</p>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm font-semibold text-white/80">{emptyMessage}</p>
      )}
    </div>
  );
}

function ChannelRow({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const share = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-black text-slate-950">{money(value)} · {percent(share)}</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(share, 100)}%` }} />
      </div>
    </div>
  );
}

function SegmentRow({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const share = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-black text-slate-950">{value} · {percent(share)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(share, 100)}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value.toLocaleString("es-MX")}</p>
    </div>
  );
}
