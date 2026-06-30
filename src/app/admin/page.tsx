import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import {
  ArrowRight,
  Boxes,
  BriefcaseBusiness,
  CreditCard,
  FlaskConical,
  RefreshCcw,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Truck,
  Users,
} from "lucide-react";

const MODULES = [
  { href: "/admin/orders", title: "Pedidos", desc: "Ventas web, POS, pagos y cancelaciones", icon: <ShoppingCart size={18} /> },
  { href: "/admin/inventory", title: "Inventarios", desc: "Productos, materia prima, en proceso y traspasos", icon: <Boxes size={18} /> },
  { href: "/admin/catalog", title: "Catálogo", desc: "Productos, suscripciones y catálogo comercial", icon: <Tags size={18} /> },
  { href: "/admin/clients", title: "Clientes", desc: "CRM, crédito, direcciones e historial", icon: <BriefcaseBusiness size={18} /> },
  { href: "/admin/production", title: "Producción", desc: "Tanques, lotes y parámetros", icon: <FlaskConical size={18} /> },
  { href: "/admin/users", title: "Usuarios", desc: "Equipo interno y roles", icon: <ShieldCheck size={18} /> },
];

export default async function AdminHomePage() {
  const user = await currentUser();

  const [
    ordersCount,
    clientsCount,
    flavorsCount,
    productsCount,
    rawMaterialsCount,
    locationsCount,
    openTransfersCount,
    activeProductionsCount,
    recentOrders,
  ] = await Promise.all([
    db.order.count(),
    db.client.count(),
    db.flavor.count(),
    db.product.count(),
    db.rawMaterial.count(),
    db.location.count({ where: { isArchived: false } }),
    db.transfer.count({ where: { status: "PENDING" } }),
    db.production.count({ where: { status: "IN_PROGRESS" } }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        folio: true,
        status: true,
        channel: true,
        total: true,
        createdAt: true,
        fullName: true,
      },
    }),
  ]);

  const revenueAgg = await db.order.aggregate({
    _sum: { total: true },
  });
  const revenue = Number(revenueAgg._sum.total || 0);

  const kpis = [
    { label: "Ingresos", value: revenue.toLocaleString("es-MX", { style: "currency", currency: "MXN" }), icon: <CreditCard size={16} />, tone: "from-slate-950 to-slate-700" },
    { label: "Pedidos", value: ordersCount.toLocaleString("es-MX"), icon: <ShoppingCart size={16} />, tone: "from-blue-700 to-cyan-500" },
    { label: "Clientes", value: clientsCount.toLocaleString("es-MX"), icon: <Users size={16} />, tone: "from-violet-700 to-fuchsia-500" },
    { label: "Ubicaciones", value: locationsCount.toLocaleString("es-MX"), icon: <Truck size={16} />, tone: "from-emerald-700 to-teal-500" },
  ];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,_#0f172a_0%,_#111827_35%,_#1d4ed8_100%)] p-6 text-white sm:p-8">
            <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22)_0,transparent_26%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.22)_0,transparent_24%),radial-gradient(circle_at_100%_100%,rgba(168,85,247,0.18)_0,transparent_25%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-100">
                <RefreshCcw size={12} />
                Admin modular
              </div>
              <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">
                Un centro de control más limpio para ventas, inventarios, producción y CRM.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
                Estamos dividiendo el admin en rutas específicas para que cada equipo trabaje más rápido, vea menos ruido y llegue directo a la tarea correcta.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/admin/orders" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950 transition hover:scale-[1.01]">
                  Abrir pedidos
                  <ArrowRight size={14} />
                </Link>
                <Link href="/admin/inventory" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15">
                  Ver inventarios
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {kpis.map((kpi) => (
              <div key={kpi.label} className={`rounded-[1.6rem] bg-gradient-to-br ${kpi.tone} p-5 text-white shadow-lg`}>
                <div className="flex items-center justify-between text-white/80">
                  <span className="text-xs font-black uppercase tracking-[0.28em]">{kpi.label}</span>
                  <span className="rounded-full bg-white/15 p-2">{kpi.icon}</span>
                </div>
                <p className="mt-4 text-2xl font-black tracking-tight">{kpi.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className="group rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-2xl bg-slate-950 p-3 text-white shadow-lg shadow-slate-950/10">
                {mod.icon}
              </div>
              <ArrowRight className="mt-2 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-700" size={16} />
            </div>
            <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">{mod.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{mod.desc}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Pedidos recientes</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">Actividad más reciente</h3>
            </div>
            <Link href="/admin/orders" className="text-sm font-bold text-blue-700 hover:text-blue-900">
              Ver todo
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                <div>
                  <p className="font-bold text-slate-950">
                    {order.folio || `#${order.id.slice(-6).toUpperCase()}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {order.channel} · {order.fullName || "Sin cliente"} · {new Date(order.createdAt).toLocaleDateString("es-MX")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-950">
                    {Number(order.total || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                  </p>
                  <span className={`text-[10px] font-black uppercase tracking-[0.25em] ${order.status === "PAID" ? "text-emerald-600" : order.status === "CANCELLED" ? "text-rose-600" : "text-amber-600"}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Resumen operativo</p>
          <div className="mt-4 space-y-3">
            {[
              { label: "Sabores", value: flavorsCount },
              { label: "Productos", value: productsCount },
              { label: "Materia prima", value: rawMaterialsCount },
              { label: "Traspasos abiertos", value: openTransfersCount },
              { label: "Producciones activas", value: activeProductionsCount },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-600">{item.label}</span>
                <span className="text-lg font-black text-slate-950">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Usuario actual</p>
            <p className="mt-1 text-lg font-black text-slate-950">
              {user?.firstName || "Admin"} {user?.lastName || ""}
            </p>
            <p className="text-xs text-slate-500">{user?.emailAddresses[0]?.emailAddress || "Sin correo"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
