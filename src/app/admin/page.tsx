import type React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  FlaskConical,
  LayoutGrid,
  Mail,
  PenTool,
  Repeat,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Tags,
  Truck,
  Users,
} from "lucide-react";

type ModuleCard = {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  accent: string;
};

type SectionGroup = {
  title: string;
  description: string;
  items: ModuleCard[];
};

const sections: SectionGroup[] = [
  {
    title: "Website",
    description: "Todo lo que afecta la venta web, contenido público y captación.",
    items: [
      { href: "/admin/orders", title: "Pedidos", desc: "Sólo web", icon: <ShoppingCart size={20} />, accent: "bg-blue-50 text-blue-700" },
      { href: "/admin/catalog/products?scope=web", title: "Packs y planes", desc: "Catálogo comercial web", icon: <Tags size={20} />, accent: "bg-cyan-50 text-cyan-700" },
      { href: "/admin/subscriptions", title: "Suscriptores", desc: "Club, ciclos y envíos", icon: <Repeat size={20} />, accent: "bg-emerald-50 text-emerald-700" },
      { href: "/admin/web-insights", title: "Insights Web", desc: "Estados, suscripciones y ventas online", icon: <BarChart3 size={20} />, accent: "bg-sky-50 text-sky-700" },
      { href: "/admin/email", title: "Correo", desc: "Promociones para leads y clientes", icon: <Mail size={20} />, accent: "bg-orange-50 text-orange-700" },
      { href: "/admin/leads", title: "Leads", desc: "Captación y prospectos", icon: <Users size={20} />, accent: "bg-amber-50 text-amber-700" },
      { href: "/admin/web-design", title: "Diseño web", desc: "CMS y contenido editable", icon: <PenTool size={20} />, accent: "bg-rose-50 text-rose-700" },
    ],
  },
  {
    title: "POS",
    description: "Caja, pedidos presenciales y relación con clientes.",
    items: [
      { href: "/pos", title: "POS", desc: "Ir a caja", icon: <ArrowRight size={20} />, accent: "bg-slate-950 text-white" },
      { href: "/admin/orders?channel=POS", title: "Pedidos POS", desc: "Pedidos creados desde POS", icon: <ShoppingCart size={20} />, accent: "bg-indigo-50 text-indigo-700" },
      { href: "/admin/clients", title: "Clientes", desc: "CRM y crédito", icon: <BriefcaseBusiness size={20} />, accent: "bg-violet-50 text-violet-700" },
      { href: "/admin/insights", title: "Insights", desc: "Métricas, ventas y clientes", icon: <BarChart3 size={20} />, accent: "bg-fuchsia-50 text-fuchsia-700" },
    ],
  },
  {
    title: "Operaciones",
    description: "Producción, resguardo, inventario y movimientos físicos.",
    items: [
      { href: "/admin/production", title: "Producción", desc: "Fermentados, lotes y parámetros", icon: <FlaskConical size={20} />, accent: "bg-lime-50 text-lime-700" },
      { href: "/admin/production?tab=etiquetado", title: "Etiquetado", desc: "Botellas, etiquetas y salida", icon: <Tag size={20} />, accent: "bg-orange-50 text-orange-700" },
      { href: "/admin/catalog/formulas", title: "Recetas", desc: "Fórmulas y preparación", icon: <FlaskConical size={20} />, accent: "bg-teal-50 text-teal-700" },
      { href: "/admin/inventory/transfers", title: "Traspasos", desc: "Movimientos entre almacenes", icon: <Truck size={20} />, accent: "bg-sky-50 text-sky-700" },
      { href: "/admin/inventory", title: "Inventarios", desc: "Stock, materia prima y resguardos", icon: <Boxes size={20} />, accent: "bg-purple-50 text-purple-700" },
    ],
  },
  {
    title: "Configuración",
    description: "Registros maestros, permisos y reglas base del sistema.",
    items: [
      { href: "/admin/catalog", title: "Catálogos", desc: "Productos, fórmulas, tanques y plantas", icon: <LayoutGrid size={20} />, accent: "bg-slate-100 text-slate-800" },
      { href: "/admin/users", title: "Usuarios", desc: "Equipo interno, roles y PIN NFC", icon: <ShieldCheck size={20} />, accent: "bg-stone-100 text-stone-800" },
    ],
  },
];

export default async function AdminHomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="rounded-[2rem] border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">{section.title}</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{section.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{section.description}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                {section.items.length} accesos
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={`rounded-2xl p-3 shadow-sm ${item.accent}`}>{item.icon}</div>
                    <ArrowRight className="mt-2 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700" size={18} />
                  </div>
                  <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
