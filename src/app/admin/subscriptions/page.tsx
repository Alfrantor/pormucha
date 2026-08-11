import Link from "next/link";
import type { ReactNode } from "react";
import { Box, CalendarClock, CircleAlert, CreditCard, MapPin, Repeat, Search, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { ensureSubscriptionScheduleSchema, getSubscriptionStatusSummary } from "@/lib/subscriptions";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
};

type FlavorSelectionItem = {
  name: string;
  quantity: number;
};

function getNow() {
  return new Date();
}

function formatDate(value: Date) {
  return value.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizeFlavorSelection(rawSelection: unknown): FlavorSelectionItem[] {
  if (!rawSelection || typeof rawSelection !== "object" || Array.isArray(rawSelection)) {
    return [];
  }

  return Object.entries(rawSelection as Record<string, unknown>)
    .map(([name, quantity]) => ({
      name,
      quantity: Number(quantity),
    }))
    .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);
}

function getStatusLabel(status: string) {
  if (status === "active") return "Activa";
  if (status === "canceled") return "Cancelada";
  if (status === "past_due") return "Past due";
  if (status === "incomplete") return "Incompleta";
  return status;
}

function getStatusTone(status: string, daysUntilShipment: number, editable: boolean) {
  if (status !== "active") {
    return {
      headerClass: "bg-slate-100 text-slate-800",
      badgeClass: "bg-slate-200 text-slate-700",
    };
  }

  if (daysUntilShipment < 0) {
    return {
      headerClass: "bg-rose-50 text-rose-900",
      badgeClass: "bg-rose-100 text-rose-700",
    };
  }

  if (!editable) {
    return {
      headerClass: "bg-amber-50 text-amber-900",
      badgeClass: "bg-amber-100 text-amber-700",
    };
  }

  return {
    headerClass: "bg-emerald-50 text-emerald-900",
    badgeClass: "bg-emerald-100 text-emerald-700",
  };
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className={`rounded-[1.4rem] p-5 shadow-lg ${tone}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-75">{label}</p>
        <span className="rounded-full bg-white/15 p-2">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

export default async function AdminSubscriptionsPage({ searchParams }: PageProps) {
  await ensureSubscriptionScheduleSchema();

  const resolvedSearchParams = (await searchParams) ?? {};
  const query = resolvedSearchParams.q?.trim() ?? "";
  const status = (resolvedSearchParams.status?.trim() || "active").toLowerCase();
  const now = getNow();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const where = {
    ...(status === "all" ? {} : { status }),
    ...(query
      ? {
          OR: [
            { client: { fullName: { contains: query, mode: "insensitive" as const } } },
            { client: { email: { contains: query, mode: "insensitive" as const } } },
            { plan: { name: { contains: query, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [subscriptions, totalSubscriptions, activeSubscriptions, monthlyRecurringOrders] = await Promise.all([
    db.subscription.findMany({
      where,
      include: {
        client: {
          include: {
            addresses: {
              where: { type: "ENVIO" },
              orderBy: { isDefault: "desc" },
              take: 1,
            },
          },
        },
        plan: true,
        orders: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ nextShipmentDate: "asc" }, { createdAt: "desc" }],
    }),
    db.subscription.count(),
    db.subscription.count({ where: { status: "active" } }),
    db.order.count({
      where: {
        subscriptionId: { not: null },
        createdAt: { gte: monthStart },
      },
    }),
  ]);

  const enrichedSubscriptions = subscriptions.map((subscription) => {
    const summary = getSubscriptionStatusSummary(subscription, now);
    const shippingAddress = subscription.client.addresses[0] ?? null;
    const selectedFlavors = normalizeFlavorSelection(subscription.selectedFlavors);

    return {
      ...subscription,
      summary,
      shippingAddress,
      selectedFlavors,
      latestOrder: subscription.orders[0] ?? null,
    };
  });

  const nextSevenDaysCount = enrichedSubscriptions.filter(
    (subscription) =>
      subscription.status === "active" &&
      subscription.summary.daysUntilShipment >= 0 &&
      subscription.summary.daysUntilShipment <= 7,
  ).length;

  const lockedCount = enrichedSubscriptions.filter(
    (subscription) => subscription.status === "active" && !subscription.summary.editable,
  ).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Club Pormucha</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Suscriptores</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Aqui ves quien esta suscrito, cuando toca surtir, cuando se cierra la edicion de sabores y que plan tiene cada miembro.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/catalog/subscriptions"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
            >
              <Repeat size={16} />
              Ver planes
            </Link>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Box size={16} />
              Ver surtidos
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Suscripciones totales" value={totalSubscriptions} icon={<Repeat size={16} />} tone="bg-slate-950 text-white" />
        <MetricCard label="Activas" value={activeSubscriptions} icon={<Sparkles size={16} />} tone="bg-emerald-600 text-white" />
        <MetricCard label="Salen en 7 dias" value={nextSevenDaysCount} icon={<CalendarClock size={16} />} tone="bg-amber-500 text-white" />
        <MetricCard label="Edicion cerrada" value={lockedCount} icon={<CircleAlert size={16} />} tone="bg-rose-500 text-white" />
        <MetricCard label="Surtidos del mes" value={monthlyRecurringOrders} icon={<CreditCard size={16} />} tone="bg-sky-600 text-white" />
      </section>

      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
        <form method="get" className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Search size={16} className="text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Buscar por cliente, correo o plan"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>

          <select
            name="status"
            defaultValue={status}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="active">Activas</option>
            <option value="canceled">Canceladas</option>
            <option value="past_due">Past due</option>
            <option value="all">Todas</option>
          </select>

          <button
            type="submit"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Filtrar
          </button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {enrichedSubscriptions.map((subscription) => {
          const statusTone = getStatusTone(subscription.status, subscription.summary.daysUntilShipment, subscription.summary.editable);

          return (
            <article key={subscription.id} className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
              <div className={`border-b px-6 py-4 ${statusTone.headerClass}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] opacity-80">Suscriptor</p>
                    <h2 className="mt-2 text-xl font-black tracking-tight">{subscription.client.fullName}</h2>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] ${statusTone.badgeClass}`}>
                    {getStatusLabel(subscription.status)}
                  </span>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoBlock label="Plan" value={subscription.plan.name} />
                  <InfoBlock label="Unidades" value={`${subscription.plan.unitCount} bebidas`} />
                  <InfoBlock label="Proximo envio" value={formatDate(subscription.summary.shipmentDate)} />
                  <InfoBlock label="Corte sabores" value={formatDate(subscription.summary.lockDate)} />
                  <InfoBlock label="Proximo cobro" value={formatDate(subscription.currentPeriodEnd)} />
                  <InfoBlock
                    label="Estado del ciclo"
                    value={
                      subscription.summary.daysUntilShipment < 0
                        ? `${Math.abs(subscription.summary.daysUntilShipment)} dia(s) vencido`
                        : `${subscription.summary.daysUntilShipment} dia(s) restantes`
                    }
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Sabores configurados</p>
                  {subscription.selectedFlavors.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {subscription.selectedFlavors.map((flavor) => (
                        <span key={`${subscription.id}-${flavor.name}`} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                          {flavor.name}: {flavor.quantity}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">Todavia no hay mezcla de sabores guardada.</p>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Contacto</p>
                    <p className="mt-2 text-sm font-bold text-slate-950">{subscription.client.email || "Sin correo"}</p>
                    <p className="text-sm text-slate-600">{subscription.client.phone || "Sin telefono"}</p>
                  </div>

                  <div>
                    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                      <MapPin size={12} />
                      Envio
                    </p>
                    {subscription.shippingAddress ? (
                      <div className="mt-2 text-sm text-slate-600">
                        <p>{subscription.shippingAddress.street} {subscription.shippingAddress.number}</p>
                        <p>{subscription.shippingAddress.city}, {subscription.shippingAddress.state}</p>
                        <p>C.P. {subscription.shippingAddress.zipCode}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-amber-700">Sin direccion de envio registrada.</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Ultimo surtido</p>
                    {subscription.latestOrder ? (
                      <>
                        <p className="mt-2 text-sm font-black text-slate-950">
                          {subscription.latestOrder.folio || `#${subscription.latestOrder.id.slice(-6).toUpperCase()}`}
                        </p>
                        <p className="text-sm text-slate-600">{formatDate(subscription.latestOrder.createdAt)}</p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">Aun no tiene surtidos registrados.</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Edicion de sabores</p>
                    <p className={`mt-2 text-sm font-bold ${subscription.summary.editable ? "text-emerald-700" : "text-amber-700"}`}>
                      {subscription.summary.editable ? "Abierta" : "Cerrada para el proximo envio"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {subscription.summary.editable
                        ? "El cliente aun puede ajustar su mezcla desde su panel."
                        : "Ya no deberia poder cambiar sabores para este ciclo."}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {enrichedSubscriptions.length === 0 ? (
        <section className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center shadow-sm">
          <p className="text-lg font-black text-slate-950">No encontramos suscripciones con ese filtro.</p>
          <p className="mt-2 text-sm text-slate-500">
            Prueba con otro nombre, otro correo o cambia el estado para ver mas resultados.
          </p>
        </section>
      ) : null}
    </div>
  );
}
