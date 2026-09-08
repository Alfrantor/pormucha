import Link from "next/link";
import { Boxes, FlaskConical, Package2, Truck, ArrowRight } from "lucide-react";

const SECTIONS = [
  {
    href: "/admin/inventory/products",
    title: "Producto terminado",
    desc: "Botellas etiquetadas, packs y existencias por almacén",
    icon: <Package2 size={20} />,
    accent: "bg-blue-50 text-blue-700",
  },
  {
    href: "/admin/inventory/base-beverage",
    title: "Bebida base",
    desc: "Lotes fermentados, cubetas y tanques de resguardo",
    icon: <FlaskConical size={20} />,
    accent: "bg-lime-50 text-lime-700",
  },
  {
    href: "/admin/inventory/raw-materials",
    title: "Materia prima",
    desc: "Insumos disponibles, entradas, salidas y mínimos",
    icon: <Boxes size={20} />,
    accent: "bg-amber-50 text-amber-700",
  },
  {
    href: "/admin/inventory/transfers",
    title: "Traspasos",
    desc: "Movimientos entre almacenes y recepciones pendientes",
    icon: <Truck size={20} />,
    accent: "bg-sky-50 text-sky-700",
  },
];

export default async function InventoryPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Operación</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Inventarios</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Entra al tipo de existencia que quieres revisar o mover: producto terminado, bebida base, materia prima o traspasos.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SECTIONS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className={`rounded-2xl p-3 shadow-sm ${item.accent}`}>
                {item.icon}
              </div>
              <ArrowRight className="mt-2 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700" size={18} />
            </div>
            <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{item.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
