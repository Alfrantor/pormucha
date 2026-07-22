import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Box, CreditCard, MapPin, Package, ShoppingBag } from "lucide-react";
import ManageSubscriptionButton from "@/components/ManageSubscriptionButton";
import { DireccionForm } from "@/components/Perfil/DireccionForm";
import FlavorSelector from "@/components/Perfil/FlavorSelector";
import { db } from "@/lib/db";
import { ensureSubscriptionScheduleSchema, getSubscriptionStatusSummary } from "@/lib/subscriptions";

export const revalidate = 0;

export default async function PerfilPage() {
  const user = await currentUser();
  const { userId } = await auth();

  if (!userId || !user) redirect("/sign-in");

  await ensureSubscriptionScheduleSchema();

  const cliente = await db.client.findUnique({
    where: { clerkUserId: userId },
    include: { addresses: true },
  });

  const subscriptions = cliente
    ? await db.subscription.findMany({
        where: {
          clientId: cliente.id,
          status: "active",
        },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const rawFlavors = await db.flavor.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
  });

  const allFlavors = rawFlavors.map((flavor) => ({
    id: flavor.id,
    name: flavor.name,
    price: flavor.price ? Number(flavor.price) : 0,
  }));

  const recentSubscriptionOrders = cliente
    ? await db.order.findMany({
        where: {
          clientId: cliente.id,
          subscriptionId: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      })
    : [];

  const shippingAddress = cliente?.addresses?.find((addr) => addr.type === "ENVIO");
  const hasAddress = Boolean(shippingAddress);

  return (
    <div className="max-w-7xl mx-auto p-6 pt-24 min-h-screen bg-[#FDFCF9]">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
        <div>
          <p className="text-[#8B3A28] font-bold uppercase tracking-widest text-sm mb-2">Panel de miembro</p>
          <h1 className="text-4xl font-serif text-gray-900">
            Hola, <span className="italic">{user.firstName || "miembro"}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-gray-500">
            Aquí puedes administrar tu suscripción, tu mezcla de sabores, tu dirección de envío y revisar tus últimos surtidos.
          </p>
        </div>
        <Link
          href="/tienda"
          className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full font-bold hover:bg-gray-800 transition shadow-lg"
        >
          <ShoppingBag size={18} />
          Ir a la tienda
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {subscriptions.length > 0 ? (
            subscriptions.map((sub, index) => {
              const summary = getSubscriptionStatusSummary(sub);

              return (
                <div key={sub.id} className="bg-white rounded-3xl p-8 border border-green-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Box size={120} className="text-green-800" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                      <span className="bg-green-100 text-green-700 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-tighter">
                        Suscripción #{index + 1}
                      </span>
                      <span className={`text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-tighter ${summary.editable ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>
                        {summary.editable ? "Sabores editables" : "Próximo envío cerrado"}
                      </span>
                    </div>

                    <h2 className="text-3xl font-serif text-gray-800 mb-2">{sub.plan.name}</h2>
                    <p className="text-gray-500 mb-8 max-w-xl">
                      Tus cargos siguen su ciclo normal y el envío se administra por separado para que podamos congelar cambios 5 días antes del surtido.
                    </p>

                    <div className="grid gap-4 md:grid-cols-4 mb-8">
                      <InfoMetric label="Plan" value={`${sub.plan.unitCount} bebidas`} />
                      <InfoMetric label="Próximo envío" value={summary.shipmentDate.toLocaleDateString("es-MX")} />
                      <InfoMetric label="Corte de cambios" value={summary.lockDate.toLocaleDateString("es-MX")} />
                      <InfoMetric label="Próximo cobro" value={sub.currentPeriodEnd.toLocaleDateString("es-MX")} />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-8">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Estado del ciclo</p>
                      <p className="mt-2 text-sm text-slate-700">
                        {summary.daysUntilShipment >= 0
                          ? `Faltan ${summary.daysUntilShipment} día(s) para el siguiente envío.`
                          : "Este envío ya está vencido o pendiente de surtirse manualmente."}
                      </p>
                    </div>

                    <div className="mb-8 border-t border-gray-100 pt-8">
                      <FlavorSelector
                        subscriptionId={sub.id}
                        unitCount={sub.plan.unitCount}
                        flavors={allFlavors}
                        currentSelection={sub.selectedFlavors}
                        canEdit={summary.editable}
                        lockDateLabel={summary.lockDate.toLocaleDateString("es-MX")}
                        shipmentDateLabel={summary.shipmentDate.toLocaleDateString("es-MX")}
                      />
                    </div>

                    <div className="flex flex-col gap-4 pt-6 border-t border-gray-100">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-slate-900 font-bold">
                          <CreditCard size={18} />
                          Facturación y cancelación
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          Desde aquí puedes actualizar tu método de pago o cancelar la suscripción directamente en Stripe.
                        </p>
                      </div>
                      <ManageSubscriptionButton subscriptionId={sub.id} />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-[#F4EFEA] rounded-3xl p-10 text-center border-2 border-dashed border-[#D1C7BD]">
              <h2 className="text-2xl font-serif text-[#8B3A28] mb-4">Aún no eres parte del club</h2>
              <p className="text-gray-600 mb-8">Suscríbete para recibir precios exclusivos y envíos recurrentes.</p>
              <Link href="/suscripciones" className="bg-[#8B3A28] text-white px-8 py-4 rounded-full font-bold hover:scale-105 transition block md:inline-block">
                Ver planes del club
              </Link>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <DireccionForm cliente={cliente} shippingAddress={shippingAddress} />
          </div>

          <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Package size={20} className="text-[#8B3A28]" />
              <div>
                <h3 className="text-xl font-bold text-gray-900">Últimos surtidos de suscripción</h3>
                <p className="text-sm text-gray-500">Tus pedidos recurrentes más recientes.</p>
              </div>
            </div>

            {recentSubscriptionOrders.length > 0 ? (
              <div className="space-y-3">
                {recentSubscriptionOrders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">Pedido #{order.id.slice(-6).toUpperCase()}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString("es-MX")} · {String(order.channel || "SUBSCRIPTION")}
                      </p>
                    </div>
                    <div className="text-sm text-slate-600">
                      <p>Estatus: <b>{order.status}</b></p>
                      <p>Total: <b>{Number(order.total || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</b></p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                Todavía no hay surtidos recurrentes registrados para esta cuenta.
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Estado del perfil
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>{subscriptions.length > 0 ? "Ya puedes administrar tu suscripción desde este panel." : "Aún no tienes una suscripción activa."}</p>
              <p>{hasAddress ? "Tu dirección de envío está registrada." : "Falta completar tu dirección de envío."}</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-[#8B3A28]" />
              Dirección de envío
            </h3>
            {hasAddress ? (
              <div className="text-sm text-gray-700 space-y-2 bg-[#FDFCF9] p-5 rounded-2xl border border-gray-100">
                <p className="font-bold text-gray-900 text-base">
                  {user.firstName} {user.lastName}
                </p>
                <p>
                  {shippingAddress?.street} {shippingAddress?.number}
                </p>
                {shippingAddress?.neighborhood ? <p>{shippingAddress.neighborhood}</p> : null}
                <p>
                  {shippingAddress?.city}, {shippingAddress?.state}
                </p>
                <p>C.P. {shippingAddress?.zipCode}</p>
                {shippingAddress?.reference ? <p className="text-gray-500 italic mt-2">Ref: {shippingAddress.reference}</p> : null}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="font-medium bg-gray-100 inline-block px-3 py-1.5 rounded-lg text-xs tracking-widest uppercase">
                    Tel. {cliente?.phone || "Sin teléfono"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-orange-50 text-orange-700 p-5 rounded-2xl text-sm border border-orange-100">
                <strong>Aviso importante:</strong>
                <br />
                Aún no has registrado una dirección de envío completa. Llena el formulario para que podamos surtir tu suscripción.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}
