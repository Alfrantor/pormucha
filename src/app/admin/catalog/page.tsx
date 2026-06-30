import Link from "next/link";
import { ArrowRight, Package2, Repeat, Tags } from "lucide-react";
import { db } from "@/lib/db";
import { loadProductionFormulas } from "@/lib/production-formulas";

const SECTIONS = [
  { href: "/admin/catalog/products", title: "Productos", desc: "Packs y configuracion comercial", icon: <Package2 size={18} /> },
  { href: "/admin/catalog/subscriptions", title: "Suscripciones", desc: "Planes y membresias activas", icon: <Repeat size={18} /> },
  { href: "/admin/catalog/formulas", title: "Formulas", desc: "Recetas operativas para produccion A, B y C", icon: <Tags size={18} /> },
  { href: "/admin/pricing", title: "Precios", desc: "Escalas, mayoreo y descuentos", icon: <Tags size={18} /> },
];

export default async function CatalogPage() {
  const [products, plans, formulas] = await Promise.all([
    db.product.count({ where: { isArchived: false } }),
    db.plan.count({ where: { isActive: true } }),
    loadProductionFormulas().catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Catalogo</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Centro de catalogo</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Todo lo que define que vendes, como produces y como se comercializa.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Metric label="Productos activos" value={products} />
        <Metric label="Planes activos" value={plans} />
        <Metric label="Formulas de produccion" value={formulas.length} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((item) => (
          <Link key={item.href} href={item.href} className="group rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-2xl bg-slate-950 p-3 text-white shadow-lg shadow-slate-950/10">
                {item.icon}
              </div>
              <ArrowRight size={16} className="mt-2 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
            </div>
            <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{item.desc}</p>
          </Link>
        ))}
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
