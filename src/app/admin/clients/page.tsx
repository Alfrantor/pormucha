import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ClientsTable } from "@/components/admin/ClientsTable";
import { ensureSubscriptionScheduleSchema } from "@/lib/subscriptions";

interface ClientsPageProps {
  searchParams: Promise<{
    search?: string;
    classification?: string;
  }>;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  await ensureSubscriptionScheduleSchema();

  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;

  if (role !== "admin") {
    redirect("/perfil");
  }

  const resolvedParams = await searchParams;
  const search = resolvedParams?.search;
  const classification = resolvedParams?.classification;

  const where: any = {};

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { rfc: { contains: search, mode: "insensitive" } },
      { businessName: { contains: search, mode: "insensitive" } },
    ];
  }

  if (classification && classification !== "TODOS") {
    where.classification = classification;
  }

  const monthStart = new Date("2026-07-01T00:00:00.000Z");

  const [clients, total, giros, allClients, topCustomersRaw, ordersSummary] = await Promise.all([
    db.client.findMany({
      where,
      include: {
        addresses: { where: { isDefault: true }, take: 1 },
        orders: { select: { id: true }, take: 1 },
        credits: { where: { status: "PENDING" }, select: { id: true } },
        giro: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.client.count({ where }),
    db.giro.findMany({ orderBy: { name: "asc" } }),
    db.client.findMany({
      include: {
        orders: {
          select: {
            id: true,
            total: true,
            createdAt: true,
          },
        },
      },
    }),
    db.order.groupBy({
      by: ["clientId"],
      where: {
        clientId: { not: null },
        status: { not: "CANCELLED" },
      },
      _sum: { total: true },
      _count: { _all: true },
      orderBy: {
        _sum: {
          total: "desc",
        },
      },
      take: 8,
    }),
    db.order.aggregate({
      where: {
        clientId: { not: null },
        status: { not: "CANCELLED" },
      },
      _sum: { total: true },
      _count: { _all: true },
    }),
  ]);

  const serializedClients = clients.map((c) => ({
    ...c,
    creditLimit: Number(c.creditLimit),
    creditUsed: Number(c.creditUsed),
    globalDiscount: Number(c.globalDiscount),
  }));

  const activeClients = allClients.filter((client) => client.status === "ACTIVO").length;
  const clientsWithOrders = allClients.filter((client) => client.orders.length > 0).length;
  const clientsThisMonth = allClients.filter((client) => client.createdAt >= monthStart).length;
  const publicClients = allClients.filter((client) => client.type === "PUBLICO_GENERAL").length;
  const wholesaleClients = allClients.filter((client) => client.classification === "MAYORISTA").length;
  const distributorClients = allClients.filter((client) => client.classification === "DISTRIBUIDOR").length;
  const creditExposure = allClients.reduce((sum, client) => sum + Number(client.creditUsed || 0), 0);
  const totalRevenue = Number(ordersSummary._sum.total || 0);
  const averageRevenuePerClient = clientsWithOrders > 0 ? totalRevenue / clientsWithOrders : 0;

  const topCustomerIds = topCustomersRaw.map((row) => row.clientId).filter(Boolean) as string[];
  const topCustomersMap = new Map(
    allClients.filter((client) => topCustomerIds.includes(client.id)).map((client) => [client.id, client]),
  );
  const topCustomers = topCustomersRaw
    .map((row) => {
      const client = topCustomersMap.get(row.clientId || "");
      if (!client) return null;
      return {
        id: client.id,
        fullName: client.fullName,
        classification: client.classification,
        total: Number(row._sum.total || 0),
        orders: row._count._all,
      };
    })
    .filter(Boolean) as Array<{ id: string; fullName: string; classification: string; total: number; orders: number }>;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">CRM</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Clientes</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Vista ERP de cartera: comportamiento comercial, crédito, altas recientes y clientes con mayor facturación.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Coincidencias</p>
            <p className="text-2xl font-black">{total}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Clientes activos" value={activeClients} helper={`${clientsThisMonth} altas desde julio 2026`} />
        <MetricCard label="Clientes con compras" value={clientsWithOrders} helper={`${ordersSummary._count._all} órdenes vinculadas`} />
        <MetricCard label="Exposición de crédito" value={creditExposure} currency helper="Saldo usado acumulado" />
        <MetricCard label="Ingreso por cliente" value={averageRevenuePerClient} currency helper="Promedio sobre clientes con compra" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Inteligencia comercial</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">Top clientes por facturación</h2>
            </div>
            <p className="text-sm font-semibold text-slate-400">{topCustomers.length} visibles</p>
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Clasificación</th>
                  <th className="px-4 py-3">Órdenes</th>
                  <th className="px-4 py-3 text-right">Facturación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topCustomers.length > 0 ? (
                  topCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-4 py-3 font-semibold text-slate-950">{customer.fullName}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{customer.classification}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{customer.orders}</td>
                      <td className="px-4 py-3 text-right text-sm font-black text-slate-950">
                        {customer.total.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                      Aún no hay clientes con venta acumulada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Segmentación</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">Cartera actual</h2>
            <div className="mt-5 space-y-4">
              <MixRow label="Público general" value={publicClients} total={allClients.length} tone="bg-slate-900" />
              <MixRow label="Minoristas" value={allClients.filter((client) => client.classification === "MINORISTA").length} total={allClients.length} tone="bg-blue-500" />
              <MixRow label="Mayoristas" value={wholesaleClients} total={allClients.length} tone="bg-violet-500" />
              <MixRow label="Distribuidores" value={distributorClients} total={allClients.length} tone="bg-amber-500" />
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Crecimiento</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">Altas recientes</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <StatPill label="Julio 2026" value={clientsThisMonth} />
              <StatPill label="Total histórico" value={allClients.length} />
              <StatPill label="Con crédito" value={allClients.filter((client) => Number(client.creditLimit || 0) > 0).length} />
              <StatPill label="Con giro" value={allClients.filter((client) => client.giroId).length} />
            </div>
          </div>
        </div>
      </section>

      <ClientsTable clients={serializedClients} total={total} giros={giros} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  currency = false,
}: {
  label: string;
  value: number;
  helper: string;
  currency?: boolean;
}) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-slate-950">
        {currency ? value.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) : value.toLocaleString("es-MX")}
      </p>
      <p className="mt-2 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function MixRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-black text-slate-950">{value} · {percent}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value.toLocaleString("es-MX")}</p>
    </div>
  );
}
