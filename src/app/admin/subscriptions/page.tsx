import Link from "next/link";
import type { ReactNode } from "react";
import { CircleAlert, CreditCard, MapPin, Repeat, Search, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { ensureSubscriptionScheduleSchema, getSubscriptionStatusSummary } from "@/lib/subscriptions";
import { SubscriptionShipmentActions } from "@/components/admin/SubscriptionShipmentActions";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    shipment?: string;
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

function normalizeFlavorSelection(rawSelection: unknown, flavors: { id: string; name: string }[]): FlavorSelectionItem[] {
  if (!rawSelection || typeof rawSelection !== "object" || Array.isArray(rawSelection)) {
    return [];
  }

  const flavorNameById = new Map(flavors.map((flavor) => [flavor.id, flavor.name]));

  return Object.entries(rawSelection as Record<string, unknown>)
    .map(([key, quantity]) => ({
      name: flavorNameById.get(key) || key,
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

function hasShippingLabel(order: { trackingNumber?: string | null; trackingUrl?: string | null; shippingId?: string | null } | null) {
  return Boolean(order?.trackingNumber || order?.trackingUrl || order?.shippingId);
}

function isOrderShipped(order: { status?: string | null } | null) {
  return ["SHIPPED", "COMPLETED", "DELIVERED"].includes(String(order?.status || "").toUpperCase());
}

function getShipmentStatus(order: { status?: string | null; trackingNumber?: string | null; trackingUrl?: string | null; shippingId?: string | null } | null) {
  if (!order) return "NO_ORDER";
  if (isOrderShipped(order)) return "SHIPPED";
  if (hasShippingLabel(order)) return "READY_TO_SHIP";
  return "NO_LABEL";
}

function getShipmentLabel(order: { status?: string | null; trackingNumber?: string | null; trackingUrl?: string | null; shippingId?: string | null } | null) {
  const status = getShipmentStatus(order);
  if (status === "SHIPPED") return "Enviado";
  if (status === "READY_TO_SHIP") return "Con guía";
  if (status === "NO_LABEL") return "Pendiente sin guía";
  return "Sin surtido";
}

function getShipmentTone(order: { status?: string | null; trackingNumber?: string | null; trackingUrl?: string | null; shippingId?: string | null } | null) {
  const status = getShipmentStatus(order);
  if (status === "SHIPPED") return "bg-blue-50 text-blue-700 border-blue-100";
  if (status === "READY_TO_SHIP") return "bg-cyan-50 text-cyan-700 border-cyan-100";
  if (status === "NO_LABEL") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-slate-50 text-slate-500 border-slate-100";
}

function getCycleType(order: { payments?: { note: string | null }[]; notes?: string | null } | null) {
  const notes = [
    order?.notes || "",
    ...(order?.payments || []).map((payment) => payment.note || ""),
  ].join(" ");

  if (notes.includes("Cobro recurrente")) return "Renovación";
  if (notes.includes("Alta inicial")) return "Nueva";
  return "Surtido";
}

export default async function AdminSubscriptionsPage({ searchParams }: PageProps) {
  await ensureSubscriptionScheduleSchema();

  const resolvedSearchParams = (await searchParams) ?? {};
  const query = resolvedSearchParams.q?.trim() ?? "";
  const status = (resolvedSearchParams.status?.trim() || "active").toLowerCase();
  const shipment = (resolvedSearchParams.shipment?.trim() || "all").toLowerCase();
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

  const [
    subscriptions,
    totalSubscriptions,
    activeSubscriptions,
    newSubscriptionsThisMonth,
    canceledSubscriptions,
    monthlyRecurringOrders,
    flavors,
  ] = await Promise.all([
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
          take: 8,
          include: {
            payments: {
              select: {
                note: true,
              },
            },
          },
        },
      },
      orderBy: [{ nextShipmentDate: "asc" }, { createdAt: "desc" }],
    }),
    db.subscription.count(),
    db.subscription.count({ where: { status: "active" } }),
    db.subscription.count({ where: { createdAt: { gte: monthStart } } }),
    db.subscription.count({ where: { status: "canceled" } }),
    db.order.count({
      where: {
        subscriptionId: { not: null },
        createdAt: { gte: monthStart },
        payments: {
          some: {
            note: { contains: "Cobro recurrente" },
          },
        },
      },
    }),
    db.flavor.findMany({
      where: { isArchived: false },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const enrichedSubscriptions = subscriptions.map((subscription) => {
    const summary = getSubscriptionStatusSummary(subscription, now);
    const shippingAddress = subscription.client.addresses[0] ?? null;
    const selectedFlavors = normalizeFlavorSelection(subscription.selectedFlavors, flavors);

    return {
      ...subscription,
      summary,
      shippingAddress,
      selectedFlavors,
      latestOrder: subscription.orders[0] ?? null,
    };
  });

  const visibleSubscriptions = enrichedSubscriptions.filter((subscription) => {
    if (shipment === "all") return true;
    return getShipmentStatus(subscription.latestOrder).toLowerCase() === shipment;
  });

  const shipmentCounts = {
    all: enrichedSubscriptions.length,
    no_label: enrichedSubscriptions.filter((subscription) => getShipmentStatus(subscription.latestOrder) === "NO_LABEL").length,
    ready_to_ship: enrichedSubscriptions.filter((subscription) => getShipmentStatus(subscription.latestOrder) === "READY_TO_SHIP").length,
    shipped: enrichedSubscriptions.filter((subscription) => getShipmentStatus(subscription.latestOrder) === "SHIPPED").length,
  };

  const filterParams = new URLSearchParams();
  if (query) filterParams.set("q", query);
  if (status) filterParams.set("status", status);

  const buildShipmentHref = (nextShipment: string) => {
    const params = new URLSearchParams(filterParams);
    if (nextShipment !== "all") {
      params.set("shipment", nextShipment);
    } else {
      params.delete("shipment");
    }
    const queryString = params.toString();
    return queryString ? `/admin/subscriptions?${queryString}` : "/admin/subscriptions";
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Club Pormucha</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Suscriptores</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Aqui ves quien esta suscrito, cuando toca surtir, que guia tiene cada envio y el historial completo de surtidos por cliente.
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
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Suscripciones totales" value={totalSubscriptions} icon={<Repeat size={16} />} tone="bg-slate-950 text-white" />
        <MetricCard label="Activas" value={activeSubscriptions} icon={<Sparkles size={16} />} tone="bg-emerald-600 text-white" />
        <MetricCard label="Nuevas del mes" value={newSubscriptionsThisMonth} icon={<Sparkles size={16} />} tone="bg-lime-600 text-white" />
        <MetricCard label="Renovaciones" value={monthlyRecurringOrders} icon={<CreditCard size={16} />} tone="bg-sky-600 text-white" />
        <MetricCard label="Canceladas" value={canceledSubscriptions} icon={<CircleAlert size={16} />} tone="bg-rose-500 text-white" />
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

      <section className="flex flex-wrap gap-2 rounded-[1.8rem] border border-slate-200 bg-white p-3 shadow-sm">
        {[
          { id: "all", label: "Todos", count: shipmentCounts.all },
          { id: "no_label", label: "Pendientes sin guia", count: shipmentCounts.no_label },
          { id: "ready_to_ship", label: "Con guia", count: shipmentCounts.ready_to_ship },
          { id: "shipped", label: "Enviados", count: shipmentCounts.shipped },
        ].map((item) => (
          <Link
            key={item.id}
            href={buildShipmentHref(item.id)}
            className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${
              shipment === item.id
                ? "bg-slate-950 text-white shadow-sm"
                : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {item.label} ({item.count})
          </Link>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {visibleSubscriptions.map((subscription) => {
          const statusTone = getStatusTone(subscription.status, subscription.summary.daysUntilShipment, subscription.summary.editable);
          const latestOrder = subscription.latestOrder;
          const latestShipmentTone = getShipmentTone(latestOrder);
          const latestCycleType = getCycleType(latestOrder);

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
                <p className="mt-2 text-xs font-bold opacity-75">
                  {subscription.status === "canceled"
                    ? `Cancelada ${subscription.canceledAt ? `el ${formatDate(subscription.canceledAt)}` : "sin fecha formal"}`
                    : subscription.createdAt >= monthStart
                      ? "Suscripcion nueva del mes"
                      : "Suscripcion recurrente"}
                </p>
              </div>

              <div className="space-y-5 p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoBlock label="Plan" value={subscription.plan.name} />
                  <InfoBlock label="Unidades" value={`${subscription.plan.unitCount} bebidas`} />
                  <InfoBlock label="Proximo envio" value={formatDate(subscription.summary.shipmentDate)} />
                  <InfoBlock label="Corte sabores" value={formatDate(subscription.summary.lockDate)} />
                  <InfoBlock label="Proximo cobro" value={formatDate(subscription.currentPeriodEnd)} />
                  <InfoBlock label="Ultimo surtido" value={latestCycleType} />
                  <InfoBlock
                    label="Estado del ciclo"
                    value={
                      subscription.summary.daysUntilShipment < 0
                        ? `${Math.abs(subscription.summary.daysUntilShipment)} dia(s) vencido`
                        : `${subscription.summary.daysUntilShipment} dia(s) restantes`
                    }
                  />
                </div>

                {subscription.status === "canceled" ? (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">Cancelacion</p>
                    <p className="mt-2 text-sm font-black text-rose-950">
                      {subscription.canceledAt ? formatDate(subscription.canceledAt) : "Sin fecha formal"}
                    </p>
                    <p className="mt-1 text-sm text-rose-700">
                      {subscription.cancellationReason || "Sin motivo registrado."}
                    </p>
                  </div>
                ) : null}

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
                    {latestOrder ? (
                      <>
                        <p className="mt-2 text-sm font-black text-slate-950">
                          {latestOrder.folio || `#${latestOrder.id.slice(-6).toUpperCase()}`}
                        </p>
                        <p className="text-sm text-slate-600">{formatDate(latestOrder.createdAt)}</p>
                        <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${latestShipmentTone}`}>
                          {getShipmentLabel(latestOrder)}
                        </span>
                        {latestOrder.trackingNumber ? (
                          <p className="mt-2 text-xs font-bold text-slate-600">Rastreo: {latestOrder.trackingNumber}</p>
                        ) : null}
                        {latestOrder.trackingUrl ? (
                          <a
                            href={latestOrder.trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-xs font-black text-blue-700 underline"
                          >
                            Abrir guia/rastreo
                          </a>
                        ) : null}
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

                {latestOrder ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Acciones del ultimo surtido</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Genera guia o marca como enviado sin salir de suscriptores.
                        </p>
                      </div>
                      <SubscriptionShipmentActions
                        orderId={latestOrder.id}
                        trackingUrl={latestOrder.trackingUrl}
                        hasLabel={hasShippingLabel(latestOrder)}
                        isShipped={isOrderShipped(latestOrder)}
                      />
                    </div>
                  </div>
                ) : null}

                <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                    Historial de surtidos ({subscription.orders.length})
                  </summary>
                  <div className="mt-4 space-y-2">
                    {subscription.orders.length > 0 ? (
                      subscription.orders.map((order) => (
                        <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-black text-slate-950">
                                {order.folio || `#${order.id.slice(-6).toUpperCase()}`}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatDate(order.createdAt)} · {getCycleType(order)}
                              </p>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${getShipmentTone(order)}`}>
                              {getShipmentLabel(order)}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs text-slate-500">
                              {order.trackingNumber ? <p>Rastreo: {order.trackingNumber}</p> : <p>Sin rastreo registrado</p>}
                              {order.trackingUrl ? (
                                <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="font-black text-blue-700 underline">
                                  Abrir guia/rastreo
                                </a>
                              ) : null}
                            </div>
                            <SubscriptionShipmentActions
                              orderId={order.id}
                              trackingUrl={order.trackingUrl}
                              hasLabel={hasShippingLabel(order)}
                              isShipped={isOrderShipped(order)}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Todavia no hay surtidos generados para esta suscripcion.</p>
                    )}
                  </div>
                </details>
              </div>
            </article>
          );
        })}
      </section>

      {visibleSubscriptions.length === 0 ? (
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
