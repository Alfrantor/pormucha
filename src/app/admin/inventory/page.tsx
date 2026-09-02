import Link from "next/link";
import { db } from "@/lib/db";
import { Boxes, FlaskConical, Package2, Truck, ArrowRight } from "lucide-react";

const SECTIONS = [
  { href: "/admin/inventory/products", title: "Inventario de productos", desc: "Botellas etiquetadas y packs", icon: <Package2 size={18} /> },
  { href: "/admin/inventory/base-beverage", title: "Lotes de bebida base", desc: "Litros terminados por lote y resguardo", icon: <FlaskConical size={18} /> },
  { href: "/admin/inventory/raw-materials", title: "Materia prima", desc: "Stock por almacén", icon: <Boxes size={18} /> },
  { href: "/admin/production", title: "Producción", desc: "Cubetas, lotes y parámetros", icon: <FlaskConical size={18} /> },
  { href: "/admin/inventory/transfers", title: "Traspasos", desc: "Entre ubicaciones y almacenes", icon: <Truck size={18} /> },
];

export default async function InventoryPage() {
  const [locations, flavors, rawMaterials, openTransfers, activeProductions] = await Promise.all([
    db.location.count({ where: { isArchived: false } }),
    db.flavor.count(),
    db.rawMaterial.count(),
    db.transfer.count({ where: { status: "PENDING" } }),
    db.production.count({ where: { status: "IN_PROGRESS" } }),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Operación</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Inventarios</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Aquí vive todo lo que mueve stock: botellas, materia prima, lotes de bebida base y traspasos.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Ubicaciones", value: locations },
          { label: "Sabores", value: flavors },
          { label: "Materia prima", value: rawMaterials },
          { label: "Traspasos abiertos", value: openTransfers },
          { label: "En producción", value: activeProductions },
        ].map((item) => (
          <div key={item.label} className="rounded-[1.4rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-lg">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/65">{item.label}</p>
            <p className="mt-3 text-3xl font-black">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
