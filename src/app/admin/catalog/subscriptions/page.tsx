import { db } from "@/lib/db";
import { Repeat } from "lucide-react";

export default async function CatalogSubscriptionsPage() {
  const [plans, subscriptions] = await Promise.all([
    db.plan.findMany({
      include: { product: true },
      orderBy: { createdAt: "desc" },
    }),
    db.subscription.count(),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Catálogo</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Suscripciones</h1>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Planes" value={plans.length} />
        <Metric label="Suscripciones" value={subscriptions} />
        <Metric label="Activas" value={plans.filter((plan: any) => plan.isActive).length} />
      </section>

      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Repeat size={18} className="text-slate-500" />
          <h2 className="text-xl font-black text-slate-950">Planes</h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan: any) => (
            <div key={plan.id} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
              <p className="font-black text-slate-950">{plan.name}</p>
              <p className="mt-1 text-sm text-slate-500">{plan.description || "Sin descripción"}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${plan.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                  {plan.isActive ? "Activo" : "Inactivo"}
                </span>
                <span className="font-black text-slate-950">
                  {Number(plan.price || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-lg">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/65">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}
