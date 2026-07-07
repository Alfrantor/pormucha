import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowLeft, MapPin, CreditCard, MessageSquare } from "lucide-react";
import Link from "next/link";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;

  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;

  if (role !== "admin") {
    redirect("/perfil");
  }

  const client = await db.client.findUnique({
    where: { id },
    include: {
      addresses: true,
      orders: { orderBy: { createdAt: "desc" }, take: 10 },
      credits: { orderBy: { createdAt: "desc" }, take: 10 },
      interactions: { orderBy: { createdAt: "desc" }, take: 20 },
      flavorDiscounts: true,
    },
  });

  if (!client) {
    return (
      <div className="rounded-[1.8rem] border border-rose-200 bg-white p-8 shadow-sm">
        <div className="rounded-2xl bg-rose-50 p-4 text-rose-700">Cliente no encontrado</div>
      </div>
    );
  }

  const clientTypeLabel =
    client.type === "FISICA"
      ? "Persona física"
      : client.type === "JURIDICA"
        ? "Persona moral"
        : "Público en general";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/clients" className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
          <ArrowLeft size={18} className="text-slate-600" />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Detalle del cliente</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{client.fullName}</h1>
          {client.businessName && <p className="text-slate-500">{client.businessName}</p>}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Información general</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="Tipo" value={clientTypeLabel} />
              <Field label="Clasificación" value={client.classification} />
              <Field label="Correo" value={client.email || "-"} />
              <Field label="Teléfono" value={client.phone || "-"} />
              <Field label="RFC" value={client.rfc || "-"} mono />
              <Field label="Estado" value={client.status} />
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Información comercial</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="Límite de crédito" value={Number(client.creditLimit).toLocaleString("es-MX", { style: "currency", currency: "MXN" })} />
              <Field label="Crédito usado" value={Number(client.creditUsed).toLocaleString("es-MX", { style: "currency", currency: "MXN" })} />
              <Field label="Plazo de pago" value={client.paymentTerms ? `${client.paymentTerms} días` : "-"} />
              <Field label="Descuento global" value={client.globalDiscount ? `${client.globalDiscount}%` : "-"} />
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-slate-500" />
              <h2 className="text-xl font-black text-slate-950">Direcciones</h2>
            </div>
            <div className="mt-5 space-y-3">
              {client.addresses.length > 0 ? (
                client.addresses.map((addr: any) => (
                  <div key={addr.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">{addr.type}</span>
                      {addr.isDefault && <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-blue-700">Predeterminada</span>}
                    </div>
                    <p className="mt-2 font-semibold text-slate-950">
                      {addr.street} {addr.number}
                    </p>
                    <p className="text-sm text-slate-500">
                      {addr.city}, {addr.state} {addr.zipCode}
                    </p>
                    {addr.reference && <p className="mt-1 text-sm italic text-slate-400">{addr.reference}</p>}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Sin direcciones registradas</p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-slate-500" />
              <h3 className="text-lg font-black text-slate-950">Créditos pendientes</h3>
            </div>
            <div className="mt-4 space-y-3">
              {client.credits.filter((c) => c.status === "PENDING").length > 0 ? (
                client.credits
                  .filter((c) => c.status === "PENDING")
                  .map((credit: any) => (
                    <div key={credit.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                      <p className="font-black text-rose-900">{Number(credit.amount).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</p>
                      <p className="text-xs text-rose-700">Vence: {new Date(credit.dueDate).toLocaleDateString("es-MX")}</p>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-slate-400">Sin créditos pendientes</p>
              )}
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-slate-500" />
              <h3 className="text-lg font-black text-slate-950">Notas recientes</h3>
            </div>
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
              {client.interactions.length > 0 ? (
                client.interactions.slice(0, 5).map((interaction: any) => (
                  <div key={interaction.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">{interaction.type}</p>
                    <p className="mt-1 text-sm text-slate-700">{interaction.note}</p>
                    <p className="mt-2 text-xs text-slate-400">{new Date(interaction.createdAt).toLocaleDateString("es-MX")}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Sin notas</p>
              )}
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Pedidos recientes</h3>
            <div className="mt-4 space-y-3">
              {client.orders.length > 0 ? (
                client.orders.slice(0, 5).map((order: any) => (
                  <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-black text-slate-950">{Number(order.total).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</p>
                    <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString("es-MX")}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Sin órdenes</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className={`mt-2 text-sm font-semibold text-slate-950 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
