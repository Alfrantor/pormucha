"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  ShoppingCart,
  Boxes,
  Truck,
  FlaskConical,
  Tags,
  DollarSign,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import React from "react";

type NavLink = {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
};

const PRIMARY_LINKS: NavLink[] = [
  { href: "/admin", label: "Inicio", description: "Resumen operativo", icon: <LayoutDashboard size={16} /> },
  { href: "/admin/orders", label: "Pedidos", description: "Ventas y pagos", icon: <ShoppingCart size={16} /> },
  { href: "/admin/inventory", label: "Inventarios", description: "Stock, materia prima y traspasos", icon: <Boxes size={16} /> },
  { href: "/admin/catalog", label: "Catálogo", description: "Productos y suscripciones", icon: <Tags size={16} /> },
  { href: "/admin/clients", label: "Clientes", description: "CRM y crédito", icon: <Users size={16} /> },
  { href: "/admin/users", label: "Usuarios", description: "Equipo interno", icon: <ShieldCheck size={16} /> },
];

const SECONDARY_LINKS: NavLink[] = [
  { href: "/admin/production", label: "Producción", description: "Tanques y lotes", icon: <FlaskConical size={16} /> },
  { href: "/admin/pricing", label: "Precios", description: "Precios e historial", icon: <DollarSign size={16} /> },
  { href: "/pos", label: "Abrir POS", description: "Ir a caja", icon: <ArrowRight size={16} /> },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname.startsWith(href);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.75),_rgba(248,250,252,0.2)_38%,_#edf1f7_72%,_#e8edf4_100%)] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden xl:flex w-80 flex-col border-r border-slate-200/80 bg-slate-950 text-white shadow-2xl shadow-slate-950/10">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950 font-black">
                P
              </div>
              <div>
                <p className="text-lg font-black tracking-tight">Pormucha ERP</p>
                <p className="text-xs text-slate-400">Centro de control</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-8">
            <section>
              <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">
                Principal
              </p>
              <div className="space-y-1">
                {PRIMARY_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "group flex items-start gap-3 rounded-2xl px-4 py-3 transition-all",
                      isActive(pathname, item.href)
                        ? "bg-white text-slate-950 shadow-lg shadow-black/10"
                        : "text-slate-300 hover:bg-white/10 hover:text-white",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "mt-0.5 rounded-xl p-2 transition-all",
                        isActive(pathname, item.href)
                          ? "bg-slate-950 text-white"
                          : "bg-white/10 text-slate-200 group-hover:bg-white/15",
                      ].join(" ")}
                    >
                      {item.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="block text-[11px] leading-tight text-slate-500">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">
                Operaciones
              </p>
              <div className="space-y-1">
                {SECONDARY_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "group flex items-start gap-3 rounded-2xl px-4 py-3 transition-all",
                      isActive(pathname, item.href)
                        ? "bg-white text-slate-950 shadow-lg shadow-black/10"
                        : "text-slate-300 hover:bg-white/10 hover:text-white",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "mt-0.5 rounded-xl p-2 transition-all",
                        isActive(pathname, item.href)
                          ? "bg-slate-950 text-white"
                          : "bg-white/10 text-slate-200 group-hover:bg-white/15",
                      ].join(" ")}
                    >
                      {item.icon}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="block text-[11px] leading-tight text-slate-500">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <div className="border-t border-white/10 p-5">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-emerald-300">
                <Sparkles size={14} />
                Nuevo panel
              </div>
              <p className="mt-2 text-sm text-slate-300">
                Rutas modulares, navegación más limpia y un flujo más enfocado para las operaciones del ERP.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
                  Espacio admin
                </p>
                <h1 className="mt-1 text-lg font-black tracking-tight text-slate-950 sm:text-2xl">
                  {pathname === "/admin"
                    ? "Inicio"
                    : pathname
                        .split("/")
                        .filter(Boolean)
                        .slice(1)
                        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                        .join(" / ") || "Admin"}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/pos"
                  className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex"
                >
                  Abrir POS
                </Link>
                <div className="rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm">
                  <UserButton />
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
