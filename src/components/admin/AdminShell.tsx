"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { ArrowRight, Home } from "lucide-react";

const ClientUserButton = dynamic(() => import("@clerk/nextjs").then((mod) => mod.UserButton), {
  ssr: false,
  loading: () => <div className="h-8 w-8 rounded-full bg-slate-100" />,
});

function humanizeAdminPath(pathname: string) {
  const labels: Record<string, string> = {
    production: "Producción",
    formulas: "Fórmulas",
    inventory: "Inventarios",
    catalog: "Catálogos",
    clients: "Clientes",
    users: "Usuarios",
    orders: "Pedidos",
    subscriptions: "Suscriptores",
    insights: "Insights",
    "web-insights": "Insights Web",
    "web-design": "Diseño web",
    leads: "Leads",
    crm: "CRM",
    pricing: "Precios",
  };

  return (
    pathname
      .split("/")
      .filter(Boolean)
      .slice(1)
      .map((part) => labels[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
      .join(" / ") || "Admin"
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_rgba(241,245,249,0.62)_34%,_#e8edf4_76%,_#dce4ef_100%)] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-8">
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 font-black text-white shadow-lg shadow-slate-950/10">
              P
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black tracking-tight text-slate-950">Pormucha ERP</p>
              <p className="truncate text-xs font-semibold text-slate-500">
                {pathname === "/admin" ? "Dashboard de control" : humanizeAdminPath(pathname)}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {pathname !== "/admin" ? (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
              >
                <Home size={14} />
                Inicio
              </Link>
            ) : null}
            <Link
              href="/pos"
              className="hidden items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 sm:inline-flex"
            >
              Abrir POS
              <ArrowRight size={14} />
            </Link>
            <div className="rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm">
              <ClientUserButton />
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
