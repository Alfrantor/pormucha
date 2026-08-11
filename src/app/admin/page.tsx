import type React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import {
  ArrowRight,
  Boxes,
  BriefcaseBusiness,
  CreditCard,
  FlaskConical,
  PenTool,
  Repeat,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Truck,
  Users,
} from "lucide-react";

type Locale = "es" | "en";

type ModuleCard = {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
};

type SectionGroup = {
  title: string;
  items: ModuleCard[];
};

const COPY: Record<Locale, {
  sections: SectionGroup[];
  kpis: { revenue: string; orders: string; clients: string; locations: string };
  operations: {
    eyebrow: string;
    title: string;
    recentOrders: string;
    latestActivity: string;
    viewAll: string;
    summary: string;
    flavors: string;
    products: string;
    rawMaterials: string;
    openTransfers: string;
    activeProductions: string;
    currentUser: string;
    noClient: string;
    noEmail: string;
  };
}> = {
  es: {
    sections: [
      {
        title: "Web",
        items: [
          { href: "/admin/orders", title: "Pedidos", desc: "Sólo web", icon: <ShoppingCart size={18} /> },
          { href: "/admin/subscriptions", title: "Suscriptores", desc: "Club, ciclos y envíos", icon: <Repeat size={18} /> },
          { href: "/admin/leads", title: "Leads", desc: "Captación y prospectos", icon: <Users size={18} /> },
          { href: "/admin/web-design", title: "Diseño web", desc: "CMS, bloques y contenido", icon: <PenTool size={18} /> },
        ],
      },
      {
        title: "POS",
        items: [
          { href: "/pos", title: "POS", desc: "Ir a caja", icon: <ArrowRight size={18} /> },
          { href: "/admin/orders?channel=POS", title: "Pedidos", desc: "Pedidos creados desde POS", icon: <ShoppingCart size={18} /> },
          { href: "/admin/catalog", title: "Catálogos", desc: "Productos, materia prima y más", icon: <Tags size={18} /> },
          { href: "/admin/clients", title: "Clientes", desc: "CRM y crédito", icon: <BriefcaseBusiness size={18} /> },
          { href: "/admin/inventory", title: "Inventarios", desc: "Stock, materia prima y traspasos", icon: <Boxes size={18} /> },
          { href: "/admin/inventory/transfers", title: "Traspasos", desc: "Movimientos entre almacenes", icon: <Truck size={18} /> },
        ],
      },
      {
        title: "Producción",
        items: [{ href: "/admin/production", title: "Producción", desc: "Cubetas, lotes y parámetros", icon: <FlaskConical size={18} /> }],
      },
      {
        title: "Usuarios",
        items: [{ href: "/admin/users", title: "Usuarios", desc: "Equipo interno y roles", icon: <ShieldCheck size={18} /> }],
      },
    ],
    kpis: { revenue: "Ingresos", orders: "Pedidos", clients: "Clientes", locations: "Ubicaciones" },
    operations: {
      eyebrow: "Operación del día",
      title: "Operación del día",
      recentOrders: "Pedidos recientes",
      latestActivity: "Actividad más reciente",
      viewAll: "Ver todo",
      summary: "Resumen operativo",
      flavors: "Sabores",
      products: "Productos",
      rawMaterials: "Materia prima",
      openTransfers: "Traspasos abiertos",
      activeProductions: "Producciones activas",
      currentUser: "Usuario actual",
      noClient: "Sin cliente",
      noEmail: "Sin correo",
    },
  },
  en: {
    sections: [
      {
        title: "Web",
        items: [
          { href: "/admin/orders", title: "Orders", desc: "Web only", icon: <ShoppingCart size={18} /> },
          { href: "/admin/subscriptions", title: "Subscribers", desc: "Club, cycles, and shipments", icon: <Repeat size={18} /> },
          { href: "/admin/leads", title: "Leads", desc: "Prospects and capture", icon: <Users size={18} /> },
        ],
      },
      {
        title: "POS",
        items: [
          { href: "/pos", title: "Orders", desc: "Open checkout", icon: <ArrowRight size={18} /> },
          { href: "/admin/catalog/products", title: "Products", desc: "Products for checkout", icon: <ShoppingCart size={18} /> },
          { href: "/admin/catalog", title: "Catalogs", desc: "Products, raw materials, and more", icon: <Tags size={18} /> },
          { href: "/admin/clients", title: "Clients", desc: "CRM and credit", icon: <BriefcaseBusiness size={18} /> },
          { href: "/admin/inventory", title: "Inventory", desc: "Stock, raw materials, and transfers", icon: <Boxes size={18} /> },
          { href: "/admin/inventory/transfers", title: "Transfers", desc: "Warehouse movements", icon: <Truck size={18} /> },
        ],
      },
      {
        title: "Production",
        items: [{ href: "/admin/production", title: "Production", desc: "Buckets, lots, and parameters", icon: <FlaskConical size={18} /> }],
      },
      {
        title: "Users",
        items: [{ href: "/admin/users", title: "Users", desc: "Internal team and roles", icon: <ShieldCheck size={18} /> }],
      },
    ],
    kpis: { revenue: "Revenue", orders: "Orders", clients: "Clients", locations: "Locations" },
    operations: {
      eyebrow: "Daily operations",
      title: "Daily operations",
      recentOrders: "Recent orders",
      latestActivity: "Latest activity",
      viewAll: "View all",
      summary: "Operational summary",
      flavors: "Flavors",
      products: "Products",
      rawMaterials: "Raw materials",
      openTransfers: "Open transfers",
      activeProductions: "Active productions",
      currentUser: "Current user",
      noClient: "No client",
      noEmail: "No email",
    },
  },
};

export default async function AdminHomePage() {
  const user = await currentUser();
  const locale: Locale = "es";
  const copy = COPY[locale];

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
    { label: copy.kpis.revenue, value: revenue.toLocaleString("es-MX", { style: "currency", currency: "MXN" }), icon: <CreditCard size={16} />, tone: "from-slate-950 to-slate-700" },
    { label: copy.kpis.orders, value: ordersCount.toLocaleString("es-MX"), icon: <ShoppingCart size={16} />, tone: "from-blue-700 to-cyan-500" },
    { label: copy.kpis.clients, value: clientsCount.toLocaleString("es-MX"), icon: <Users size={16} />, tone: "from-violet-700 to-fuchsia-500" },
    { label: copy.kpis.locations, value: locationsCount.toLocaleString("es-MX"), icon: <Truck size={16} />, tone: "from-emerald-700 to-teal-500" },
  ];

  const operationItems = [
    { label: copy.operations.flavors, value: flavorsCount },
    { label: copy.operations.products, value: productsCount },
    { label: copy.operations.rawMaterials, value: rawMaterialsCount },
    { label: copy.operations.openTransfers, value: openTransfersCount },
    { label: copy.operations.activeProductions, value: activeProductionsCount },
  ];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
      </section>

      <section className="space-y-5">
        {copy.sections.map((section) => (
          <div key={section.title} className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{section.title}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {section.items.map((mod) => (
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
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{copy.operations.eyebrow}</p>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">{copy.operations.title}</h2>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{copy.operations.recentOrders}</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">{copy.operations.latestActivity}</h3>
            </div>
            <Link href="/admin/orders" className="text-sm font-bold text-blue-700 hover:text-blue-900">
              {copy.operations.viewAll}
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                <div>
                  <p className="font-bold text-slate-950">{order.folio || `#${order.id.slice(-6).toUpperCase()}`}</p>
                  <p className="text-xs text-slate-500">
                    {order.channel} · {order.fullName || copy.operations.noClient} · {new Date(order.createdAt).toLocaleDateString("es-MX")}
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

        <div className="space-y-6">
          <div className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{copy.operations.summary}</p>
            <div className="mt-4 space-y-3">
              {operationItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-600">{item.label}</span>
                  <span className="text-lg font-black text-slate-950">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-700">{copy.operations.currentUser}</p>
            <p className="mt-1 text-lg font-black text-slate-950">
              {user?.firstName || "Admin"} {user?.lastName || ""}
            </p>
            <p className="text-xs text-slate-500">{user?.emailAddresses[0]?.emailAddress || copy.operations.noEmail}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
