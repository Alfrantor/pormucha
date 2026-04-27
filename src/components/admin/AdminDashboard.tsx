"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3, Package, Repeat, Users, ShoppingBag, Truck, Contact2, DollarSign,
  ShoppingCart, ChevronRight, LayoutDashboard, Package2, UserCog, Menu, MonitorCheck,
  Building2, Pencil, Trash2, Plus, X,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { TogglePlanBtn } from "@/components/admin/toggle-plan-btn";
import { DateRangeFilter } from "@/components/admin/date-range-filter";
import { TabEnvios } from "@/components/admin/TabEnvios";
import UserManagement from "@/components/admin/UserManagement";
import { ClientsTable } from "@/components/admin/ClientsTable";
import { PricingManager } from "@/components/admin/PricingManager";
import { toggleStatus } from "@/actions/toggle-status";
import {
  createLocation, registerMovement, updatePackPrice, updateFlavorPrice,
  createProduct, createFlavor, updateClubDiscountPercent, updateProductDimensions,
  createPlan, updatePlanPrice, updatePlanProduct, deleteLead, updateLocation,
  createTransfer, receiveTransfer
} from "@/actions/admin-actions";
import { generateShippingLabel } from "@/actions/admin-actions";

// ---- Types ----
type TabId = "dashboard" | "inventario" | "envios" | "suscripciones" | "leads" | "productos" | "usuarios" | "pedidos" | "clientes" | "precios" | "giros";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  group: string;
}

const TABS: Tab[] = [
  { id: "dashboard",    label: "Dashboard",     icon: <LayoutDashboard size={15} />, group: "general" },
  { id: "inventario",   label: "Inventario",    icon: <Package size={15} />,         group: "operaciones" },
  { id: "envios",       label: "Traspasos",     icon: <Truck size={15} />,           group: "operaciones" },
  { id: "pedidos",      label: "Pedidos",       icon: <ShoppingCart size={15} />,    group: "operaciones" },
  { id: "productos",    label: "Productos",     icon: <Package2 size={15} />,        group: "catalogo" },
  { id: "precios",      label: "Precios",       icon: <DollarSign size={15} />,      group: "catalogo" },
  { id: "suscripciones",label: "Suscripciones", icon: <Repeat size={15} />,          group: "catalogo" },
  { id: "clientes",     label: "Clientes",      icon: <Contact2 size={15} />,        group: "crm" },
  { id: "leads",        label: "Leads",         icon: <Users size={15} />,           group: "crm" },
  { id: "usuarios",     label: "Staff",         icon: <UserCog size={15} />,         group: "config" },
  { id: "giros",        label: "Giros",         icon: <Building2 size={15} />,       group: "config" },
];

const GROUPS: { id: string; label: string }[] = [
  { id: "general",     label: "General" },
  { id: "operaciones", label: "Operaciones" },
  { id: "catalogo",    label: "Catálogo" },
  { id: "crm",         label: "CRM" },
  { id: "config",      label: "Configuración" },
];

/**
 * ============================================
 * COMPONENTE PRINCIPAL: AdminDashboard
 * ============================================
 * 
 * Este es un componente CLIENTE que recibe datos del servidor.
 * Tiene máxima protección contra undefined/null.
 */
export default function AdminDashboard({ data }: { data: any }) {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // ==========================================
  // 🛡️ VALIDACIÓN DEFENSIVA NIVEL 1
  // ==========================================
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
        <p className="font-bold italic">Cargando datos del servidor...</p>
      </div>
    );
  }

  // ==========================================
  // 🛡️ VALIDACIÓN DEFENSIVA NIVEL 2
  // ==========================================
  if (typeof data !== 'object') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl text-center">
          <p className="text-red-800 font-bold">Error: Datos inválidos</p>
          <p className="text-red-600 text-sm mt-2">El servidor envió datos en formato incorrecto</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // 🛡️ VALIDACIÓN DEFENSIVA NIVEL 3
  // ==========================================
  if (!data.stats || typeof data.stats !== 'object') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-2xl text-center max-w-md">
          <p className="text-yellow-800 font-bold text-lg">⚠️ Datos incompletos</p>
          <p className="text-yellow-700 text-sm mt-2">
            El servidor no envió las estadísticas correctamente.
            Por favor, recarga la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded font-bold hover:bg-yellow-700"
          >
            🔄 Recargar
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // DESTRUCTURING SEGURO CON VALORES POR DEFECTO
  // ==========================================
  const {
    stats = {},
    topFlavors = [],
    topPacks = [],
    totalFlavorsSold = 0,
    totalPacksSold = 0,
    allFlavors = [],
    activeFlavors = [],
    allProducts = [],
    allPlans = [],
    priceHistory = [],
    allLocations = [],
    activeLocations = [],
    leads = [],
    userEmail = "",
    from = null,
    to = null,
    transfers = [],
    allSubscriptions = [],
    users = [],
    clients = [],
    orders = [],
    flavorsWithPricing = [],
    giros = [],
  } = data;

  const memoizedStats = useMemo(() => stats, [stats]);
  const activeTabInfo = TABS.find(t => t.id === activeTab);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile backdrop */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* ═══════════════════ SIDEBAR ═══════════════════ */}
      <aside className={[
        "bg-zinc-950 flex flex-col flex-shrink-0 overflow-y-auto transition-transform duration-300",
        // Mobile: fixed overlay, toggled by state
        "fixed inset-y-0 left-0 z-50 w-64",
        showMobileSidebar ? "translate-x-0" : "-translate-x-full",
        // Tablet: static, icon-only width
        "md:relative md:translate-x-0 md:w-14",
        // Desktop: full width
        "lg:w-56 xl:w-64",
      ].join(" ")}>
        {/* Logo */}
        <div className="px-3 lg:px-5 py-5 lg:py-6 border-b border-white/10">
          <div className="flex items-center gap-3 justify-center lg:justify-start">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
              <span className="text-zinc-950 font-black text-xs">P</span>
            </div>
            <div className="min-w-0 hidden lg:block">
              <p className="text-white font-black text-sm tracking-tight leading-none">Pormucha</p>
              <p className="text-zinc-500 text-[11px] mt-0.5">Panel Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-1.5 lg:px-3 py-5 space-y-4 lg:space-y-5 overflow-y-auto">
          {GROUPS.map(group => {
            const groupTabs = TABS.filter(t => t.group === group.id);
            if (groupTabs.length === 0) return null;
            return (
              <div key={group.id}>
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mb-1.5 px-2 hidden lg:block">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {groupTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setShowMobileSidebar(false); }}
                      title={tab.label}
                      className={`w-full flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-2.5 rounded-lg text-sm transition-all ${
                        activeTab === tab.id
                          ? "bg-white text-zinc-950 font-semibold shadow-sm"
                          : "text-zinc-400 hover:text-white hover:bg-white/10 font-medium"
                      }`}
                    >
                      <span className={activeTab === tab.id ? "text-zinc-700" : "text-zinc-500"}>
                        {tab.icon}
                      </span>
                      <span className="flex-1 text-left text-[13px] hidden lg:block">{tab.label}</span>
                      {activeTab === tab.id && <ChevronRight size={12} className="text-zinc-400 hidden lg:block" />}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-2 lg:px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 justify-center lg:justify-start">
            <UserButton />
            <div className="min-w-0 hidden lg:block">
              <p className="text-zinc-300 text-xs font-semibold leading-none">Administrador</p>
              <p className="text-zinc-600 text-[10px] mt-0.5">Panel de control</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══════════════════ MAIN AREA ═══════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumb header */}
        <header className="bg-white border-b px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger — only visible on mobile */}
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors -ml-1"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 hidden sm:inline">Admin</span>
              <ChevronRight size={14} className="text-gray-300 hidden sm:inline" />
              <span className="text-gray-900 font-semibold">{activeTabInfo?.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full font-medium hidden md:block">
              {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
            </span>
            <Link
              href="/pos"
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-gray-900 hover:bg-black px-3 sm:px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95 shrink-0"
            >
              <MonitorCheck size={14} />
              <span className="hidden sm:inline">Ir al POS</span>
            </Link>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6 xl:p-8 space-y-8">
          {activeTab === "dashboard" && (
            <TabVentas {...{ stats: memoizedStats, topFlavors, topPacks, totalFlavorsSold, totalPacksSold, from, to }} />
          )}
          {activeTab === "inventario" && (
            <TabInventario {...{ activeFlavors, activeLocations, allLocations, userEmail }} />
          )}
          {activeTab === "envios" && (
            <TabEnvios {...{ activeFlavors, activeLocations, transfers, userEmail }} />
          )}
          {activeTab === "suscripciones" && (
            <TabSuscripciones {...{ allPlans, allProducts, allSubscriptions }} />
          )}
          {activeTab === "leads" && <TabLeads leads={leads} />}
          {activeTab === "productos" && (
            <TabProductos {...{ allProducts, allFlavors, priceHistory, userEmail }} />
          )}
          {activeTab === "usuarios" && <TabUsuarios users={users} />}
          {activeTab === "clientes" && <TabClientes clients={clients} />}
          {activeTab === "precios" && <TabPrecios flavors={flavorsWithPricing} />}
          {activeTab === "pedidos" && <TabPedidos orders={orders} />}
          {activeTab === "giros" && <TabGiros giros={giros} />}
        </main>
      </div>
    </div>
  );
}

function TabPedidos({ orders = [] }: { orders: any[] }) {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<"all" | "POS" | "WEB">("all");

  const handleAction = async (order: any) => {
    if (order.trackingUrl) {
      window.open(order.trackingUrl, "_blank");
      return;
    }
    setIsGenerating(order.id);
    try {
      const res = await generateShippingLabel(order.id);
      if (res.success && res.labelUrl) {
        window.open(res.labelUrl, "_blank");
      } else {
        alert("Error: " + res.error);
      }
    } catch (err) {
      alert("Error crítico al conectar con Skydropx");
    } finally {
      setIsGenerating(null);
    }
  };

  const posCount = orders.filter(o => o.channel === "POS").length;
  const webCount = orders.filter(o => o.channel !== "POS").length;

  const filteredOrders = orders.filter(order => {
    if (channelFilter === "POS") return order.channel === "POS";
    if (channelFilter === "WEB") return order.channel !== "POS";
    return true;
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Gestión de Pedidos</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            {filteredOrders.length} pedidos encontrados
          </p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setChannelFilter("all")}
            className={`px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${channelFilter === "all" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Todos ({orders.length})
          </button>
          <button
            onClick={() => setChannelFilter("POS")}
            className={`px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${channelFilter === "POS" ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            POS ({posCount})
          </button>
          <button
            onClick={() => setChannelFilter("WEB")}
            className={`px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${channelFilter === "WEB" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Web ({webCount})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-[10px] uppercase font-black text-gray-500 border-b">
              <th className="px-6 py-4">ID Orden</th>
              <th className="px-6 py-4">Canal</th>
              <th className="px-6 py-4">Nombre del Cliente</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Estatus</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order: any) => {
                const isPOS = order.channel === "POS";
                return (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        #{order.id.slice(-6).toUpperCase()}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-black border ${isPOS ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-sky-50 text-sky-700 border-sky-100"}`}>
                        {isPOS ? "POS" : "Web"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{order.fullName || "Sin nombre registrado"}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{order.email}</p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-black text-sm text-gray-900">
                        ${Number(order.total).toLocaleString('es-MX')}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-3 py-1 rounded-full font-black tracking-tighter border ${
                        order.status === "SHIPPED" ? "bg-blue-50 text-blue-600 border-blue-100"
                        : order.status === "PAID" || order.status === "COMPLETED" ? "bg-green-50 text-green-700 border-green-100"
                        : "bg-gray-50 text-gray-600 border-gray-100"
                      }`}>
                        ● {order.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {!isPOS ? (
                        <button
                          onClick={() => handleAction(order)}
                          disabled={isGenerating === order.id}
                          className={`text-[10px] px-4 py-2 rounded-xl font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50 ${order.trackingUrl
                            ? "bg-green-100 text-green-700 border border-green-200 hover:bg-green-200"
                            : "bg-black text-white hover:bg-gray-800"
                          }`}
                        >
                          {isGenerating === order.id ? "Procesando..." : order.trackingUrl ? "Ver Guía" : "Generar Guía"}
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-medium">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="p-20 text-center">
                  <p className="text-gray-400 italic font-medium">No hay pedidos con este filtro.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}


// =====================================================================
// TAB: GESTIÓN DE USUARIOS (STAFF)
// =====================================================================
function TabUsuarios({ users }: { users: any[] }) {
  if (!Array.isArray(users)) {
    return (
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-black">Gestión de Staff</h2>
          <p className="text-sm text-gray-400 mt-1">Asigna roles de administrador o vendedor.</p>
        </div>
        <div className="p-10 border-2 border-dashed rounded-3xl text-center text-gray-400">
          Error al cargar usuarios. Por favor, recarga la página.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-black">Gestión de Staff</h2>
        <p className="text-sm text-gray-400 mt-1">Asigna roles de administrador o vendedor a los usuarios registrados.</p>
      </div>
      {users.length > 0 ? (
        <UserManagement data={users} />
      ) : (
        <div className="p-10 border-2 border-dashed rounded-3xl text-center text-gray-400">
          No hay usuarios registrados en Clerk todavía.
        </div>
      )}
    </section>
  );
}

// =====================================================================
// TAB: CLIENTES (BASE DE DATOS LOCAL)
// =====================================================================
function TabClientes({ clients }: { clients: any[] }) {
  if (!Array.isArray(clients)) {
    return (
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-black italic">Gestión de Clientes ERP</h2>
          <p className="text-sm text-gray-400 mt-1">
            Administra clientes, direcciones, créditos y descuentos.
          </p>
        </div>
        <div className="p-10 border-2 border-dashed rounded-3xl text-center text-gray-400">
          Error al cargar clientes.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-black italic">Gestión de Clientes ERP</h2>
        <p className="text-sm text-gray-400 mt-1">
          RFC, razón social, clasificación, crédito, múltiples direcciones y descuentos.
        </p>
      </div>

      <ClientsTable clients={clients} total={clients.length} />
    </section>
  );
}

// =====================================================================
// TAB: GIROS DEL NEGOCIO
// =====================================================================
function TabGiros({ giros: initialGiros }: { giros: any[] }) {
  const [giros, setGiros] = useState<any[]>(Array.isArray(initialGiros) ? initialGiros : []);
  const [showForm, setShowForm] = useState(false);
  const [editingGiro, setEditingGiro] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const openCreate = () => { setEditingGiro(null); setName(""); setDescription(""); setError(""); setShowForm(true); };
  const openEdit = (g: any) => { setEditingGiro(g); setName(g.name); setDescription(g.description || ""); setError(""); setShowForm(true); };

  const handleSave = async () => {
    if (!name.trim()) { setError("El nombre es requerido"); return; }
    setLoading(true); setError("");
    try {
      const { createGiro, updateGiro } = await import("@/app/_actions/giros");
      if (editingGiro) {
        const res = await updateGiro(editingGiro.id, { name: name.trim(), description: description.trim() || undefined });
        if (res.error) { setError(res.error); return; }
        setGiros(prev => prev.map(g => g.id === editingGiro.id ? { ...g, name: name.trim(), description: description.trim() } : g));
      } else {
        const res = await createGiro({ name: name.trim(), description: description.trim() || undefined });
        if (res.error) { setError(res.error); return; }
        if (res.giro) setGiros(prev => [...prev, res.giro]);
      }
      setShowForm(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este giro? Los clientes vinculados quedarán sin giro.")) return;
    try {
      const { deleteGiro } = await import("@/app/_actions/giros");
      await deleteGiro(id);
      setGiros(prev => prev.filter(g => g.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black italic">Giros del Negocio</h2>
          <p className="text-sm text-gray-400 mt-1">
            Categorías de negocio para clasificar clientes (hotel, gimnasio, cafetería, etc.)
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-black transition shrink-0"
        >
          <Plus size={15} /> Nuevo Giro
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-800">{editingGiro ? "Editar Giro" : "Nuevo Giro"}</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
          </div>
          {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Restaurante, Hotel, Gimnasio..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descripción opcional"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-black disabled:opacity-50">
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {giros.length === 0 ? (
        <div className="p-12 border-2 border-dashed rounded-3xl text-center text-gray-400">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold">No hay giros creados</p>
          <p className="text-sm mt-1">Crea giros para clasificar a tus clientes por tipo de negocio</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {giros.map((g: any) => (
            <div key={g.id} className="bg-white border rounded-2xl p-4 flex items-start justify-between gap-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="min-w-0">
                <p className="font-black text-gray-900 truncate">{g.name}</p>
                {g.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{g.description}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(g)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(g.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// =====================================================================
// TAB: GESTIÓN DE PRECIOS
// =====================================================================
function TabPrecios({ flavors }: { flavors: any[] }) {
  const [selectedFlavorId, setSelectedFlavorId] = useState<string | null>(null);

  if (!Array.isArray(flavors) || flavors.length === 0) {
    return (
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-black italic">Gestión de Precios</h2>
          <p className="text-sm text-gray-400 mt-1">
            Configura precios base, escalas de cantidad y descuentos por cliente.
          </p>
        </div>
        <div className="p-10 border-2 border-dashed rounded-3xl text-center text-gray-400">
          No hay flavores disponibles.
        </div>
      </section>
    );
  }

  const selectedFlavor = selectedFlavorId
    ? flavors.find((f) => f.id === selectedFlavorId)
    : null;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-black italic">Gestión de Precios</h2>
        <p className="text-sm text-gray-400 mt-1">
          Precios base, escalas dinámicas por cantidad y descuentos por clasificación.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Listado de Flavores */}
        <div className="bg-white rounded-xl border shadow-sm p-6 h-fit">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Flavores</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {flavors.map((flavor: any) => (
              <button
                key={flavor.id}
                onClick={() => setSelectedFlavorId(flavor.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedFlavor?.id === flavor.id
                    ? "bg-blue-50 border-blue-200 text-blue-900 font-semibold"
                    : "hover:bg-gray-50 border-gray-200 text-gray-900"
                }`}
              >
                <p className="font-medium truncate">{flavor.name}</p>
                <p className="text-xs text-gray-600 mt-1">
                  ${flavor.basePrice?.toFixed(2) || "0.00"}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Panel de configuración */}
        <div className="lg:col-span-3">
          {selectedFlavor ? (
            <PricingManager flavor={selectedFlavor} />
          ) : (
            <div className="bg-white rounded-xl border shadow-sm p-6 text-center text-gray-500">
              <p className="text-lg font-semibold mb-2">Selecciona un flavor</p>
              <p className="text-sm">Haz clic en un flavor para gestionar sus precios</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// TAB 1: DASHBOARD DE VENTAS
// =====================================================================
function TabVentas({ stats, topFlavors, topPacks, totalFlavorsSold, totalPacksSold, from, to }: any) {
  const safeStats = stats || {};

  return (
    <section className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-end">
        <div>
          <h2 className="text-2xl font-black">Reporte de Ventas</h2>
          <p className="text-sm text-gray-400 mt-1">
            {from && to ? `Del ${from} al ${to}` : "Histórico completo"}
          </p>
        </div>
      </div>
      <DateRangeFilter />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black text-white p-6 rounded-2xl shadow-lg">
          <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Ingresos</p>
          <p className="text-3xl font-black text-green-400 mt-1">
            ${(safeStats.totalRevenue || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pedidos</p>
          <p className="text-3xl font-black mt-1">{safeStats.totalOrders || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sabor #1</p>
          <p className="text-xl font-black truncate mt-1">{topFlavors?.[0]?.name || "-"}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pack #1</p>
          <p className="text-xl font-black truncate mt-1">{topPacks?.[0]?.name || "-"}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border">
          <h3 className="text-lg font-black mb-6">🍍 Top Sabores</h3>
          <div className="space-y-4">
            {Array.isArray(topFlavors) && topFlavors.length > 0 ? (
              topFlavors.map((f: any, idx: number) => {
                const pct =
                  totalFlavorsSold > 0
                    ? ((f.count / totalFlavorsSold) * 100).toFixed(1)
                    : 0;
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm font-bold mb-1">
                      <span className="text-gray-800">{idx + 1}. {f.name}</span>
                      <span className="text-gray-400">{pct}% ({f.count})</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-center italic text-sm">Sin datos aún.</p>
            )}
          </div>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border">
          <h3 className="text-lg font-black mb-6">📦 Top Packs</h3>
          <div className="space-y-4">
            {Array.isArray(topPacks) && topPacks.length > 0 ? (
              topPacks.map((p: any, idx: number) => {
                const pct =
                  totalPacksSold > 0
                    ? ((p.count / totalPacksSold) * 100).toFixed(1)
                    : 0;
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm font-bold mb-1">
                      <span className="text-gray-800">{idx + 1}. {p.name}</span>
                      <span className="text-gray-400">{pct}% ({p.count})</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className="h-full bg-black rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-center italic text-sm">Sin datos aún.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// TAB 2: INVENTARIO
// =====================================================================
function TabInventario({ activeFlavors, activeLocations, allLocations, userEmail }: any) {
  const [expandedFlavorId, setExpandedFlavorId] = useState<string | null>(null);

  const toggleKardex = (id: string) => {
    if (expandedFlavorId === id) setExpandedFlavorId(null);
    else setExpandedFlavorId(id);
  };

  const safeFlavors = Array.isArray(activeFlavors) ? activeFlavors : [];
  const safeLocations = Array.isArray(activeLocations) ? activeLocations : [];
  const safeAllLocations = Array.isArray(allLocations) ? allLocations : [];

  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-black">Plantas, Bodegas e Inventario</h2>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Existencias y Kardex */}
        <div className="xl:col-span-2 space-y-6">
          {/* Formulario Global de Entradas / Salidas */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm border-blue-100">
            <h3 className="font-bold text-blue-900 uppercase text-xs tracking-widest mb-4">
              Mover / Ajustar Inventario
            </h3>
            <form
              action={registerMovement}
              onSubmit={(e) => {
                if (!confirm("¿Estás seguro de registrar este movimiento?"))
                  e.preventDefault();
              }}
              className="grid grid-cols-12 gap-3"
            >
              <input type="hidden" name="adminEmail" value={userEmail || ""} />
              <div className="col-span-12 md:col-span-4">
                <select
                  name="flavorId"
                  className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold border outline-none"
                  required
                >
                  <option value="">-- Seleccionar Producto --</option>
                  {safeFlavors.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-12 md:col-span-3">
                <select
                  name="locationId"
                  className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold border outline-none"
                  required
                >
                  <option value="">-- Seleccionar Planta/Bodega --</option>
                  {safeLocations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-6 md:col-span-3">
                <select
                  name="type"
                  className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold border outline-none"
                  required
                >
                  <option value="IN">📥 Entrada</option>
                  <option value="OUT">📤 Salida</option>
                </select>
              </div>
              <div className="col-span-6 md:col-span-2">
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  placeholder="Cant."
                  className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold border text-center outline-none"
                  required
                />
              </div>
              <div className="col-span-12 md:col-span-9">
                <input
                  name="reason"
                  type="text"
                  placeholder="Motivo (Ej. Producción, Ajuste, Merma...)"
                  className="w-full p-2 bg-gray-50 rounded-lg text-sm border outline-none"
                  required
                />
              </div>
              <div className="col-span-12 md:col-span-3">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white p-2 rounded-lg text-sm font-bold hover:bg-blue-700"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>

          {/* Tabla de Existencias */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-widest border-b">
                  <th className="px-6 py-3 font-bold">Producto (Sabor)</th>
                  <th className="px-6 py-3 font-bold">Existencia Actual</th>
                  <th className="px-6 py-3 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {safeFlavors.length > 0 ? (
                  safeFlavors.map((flavor: any) => {
                    const totalStock =
                      flavor.locationStocks?.reduce(
                        (sum: number, s: any) => sum + (s.quantity || 0),
                        0
                      ) || 0;
                    const isExpanded = expandedFlavorId === flavor.id;

                    return (
                      <React.Fragment key={flavor.id}>
                        <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-sm text-gray-900">
                            {flavor.name}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-black text-lg">{totalStock}</span>{" "}
                            <span className="text-xs text-gray-400 uppercase">pzs</span>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {flavor.locationStocks?.map((s: any) => (
                                <span
                                  key={s.locationId}
                                  className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded"
                                >
                                  {s.location?.name?.split(" ")[0]}: {s.quantity}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => toggleKardex(flavor.id)}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-2 rounded-lg"
                            >
                              {isExpanded ? "Ocultar Kardex" : "Ver Kardex"}
                            </button>
                          </td>
                        </tr>
                        {/* Sub-tabla Kardex */}
                        {isExpanded && (
                          <tr className="bg-slate-50 border-b">
                            <td colSpan={3} className="px-6 py-4">
                              <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">
                                Movimientos (Últimos 100)
                              </h4>
                              <div className="max-h-[300px] overflow-y-auto pr-2">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-200 text-gray-400">
                                      <th className="py-2">Fecha</th>
                                      <th className="py-2">Tipo</th>
                                      <th className="py-2">Cantidad</th>
                                      <th className="py-2">Motivo / Usuario</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {flavor.movements && flavor.movements.length > 0 ? (
                                      flavor.movements.map((m: any) => (
                                        <tr
                                          key={m.id}
                                          className="border-b border-gray-100 last:border-0"
                                        >
                                          <td className="py-2 font-mono text-gray-500">
                                            {new Date(m.createdAt).toLocaleString()}
                                          </td>
                                          <td
                                            className={`py-2 font-bold ${m.type === "IN"
                                              ? "text-green-600"
                                              : "text-red-500"
                                              }`}
                                          >
                                            {m.type === "IN" ? "Entrada" : "Salida"}
                                          </td>
                                          <td className="py-2 font-black">
                                            {m.quantity}
                                          </td>
                                          <td className="py-2 text-gray-600 uppercase">
                                            <span className="font-bold">
                                              {m.reason}
                                            </span>{" "}
                                            <span className="text-gray-400 lowercase">
                                              ({m.userId})
                                            </span>
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td
                                          colSpan={4}
                                          className="py-4 text-center italic text-gray-400"
                                        >
                                          Sin movimientos.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400 italic">
                      No hay productos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gestión Sucursales */}
        <div className="space-y-6">
          <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
            <h4 className="font-bold text-purple-800 mb-3 text-sm uppercase">
              Nueva Planta / Bodega
            </h4>
            <form action={createLocation} className="grid grid-cols-1 gap-3">
              <input
                name="name"
                placeholder="Nombre (Ej: Planta, Bodega Campeche)"
                className="p-2 rounded bg-white border text-sm"
                required
              />
              <input
                name="address"
                placeholder="Dirección (Opcional)"
                className="p-2 rounded bg-white border text-sm"
              />
              <button className="bg-purple-600 text-white p-2 rounded font-bold text-sm hover:bg-purple-700">
                + Crear Ubicación
              </button>
            </form>
            <div className="mt-4 border-t pt-4 border-purple-200">
              <p className="text-xs font-bold text-purple-500 uppercase mb-2">
                Ubicaciones existentes:
              </p>
              <div className="flex flex-col gap-3">
                {safeAllLocations.map((loc: any) => {
                  const locStockCount =
                    safeFlavors?.reduce(
                      (sum: number, flavor: any) =>
                        sum +
                        (flavor.locationStocks?.find(
                          (s: any) => s.locationId === loc.id
                        )?.quantity || 0),
                      0
                    ) || 0;
                  return (
                    <div
                      key={loc.id}
                      className={`flex flex-col gap-2 bg-white p-3 rounded-xl border shadow-sm transition-all ${loc.isArchived
                        ? "opacity-60 bg-gray-50/50 grayscale-[0.5]"
                        : "hover:border-purple-300"
                        }`}
                    >
                      <form action={updateLocation} className="flex flex-col gap-2 relative">
                        <input type="hidden" name="id" value={loc.id} />
                        <div className="flex gap-2 items-center">
                          <input
                            name="name"
                            defaultValue={loc.name || ""}
                            className={`flex-1 text-sm font-bold border border-transparent hover:border-gray-200 focus:border-purple-400 bg-transparent focus:bg-white rounded p-1 outline-none transition-colors ${loc.isDefault
                              ? "text-yellow-700"
                              : "text-purple-700"
                              }`}
                            required
                          />
                          {loc.isDefault && (
                            <span className="text-[10px] uppercase font-black text-yellow-600 tracking-wider">
                              ★ Principal
                            </span>
                          )}
                          {loc.isArchived && (
                            <span className="text-xs font-bold text-gray-500">
                              (Inactivo)
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            name="address"
                            defaultValue={loc.address || ""}
                            placeholder="Dirección / Comentarios"
                            className="w-full text-xs text-gray-500 border border-transparent hover:border-gray-200 focus:border-purple-400 bg-transparent focus:bg-white rounded p-1 outline-none transition-colors"
                          />
                          <button
                            type="submit"
                            className="text-[10px] bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors border border-purple-100 shadow-sm"
                          >
                            Guardar
                          </button>
                        </div>
                      </form>
                      {!loc.isDefault && (
                        <form
                          action={toggleStatus}
                          onSubmit={(e) => {
                            const isInactivating = !loc.isArchived;
                            if (isInactivating && locStockCount > 0) {
                              e.preventDefault();
                              alert(
                                "❌ ERROR: No puedes inactivar esta ubicación porque aún tiene inventario.\n\nTiene " +
                                locStockCount +
                                " botellas en total según los registros.\n\n➤ Por favor, realiza un traspaso de su inventario hacia otra ubicación (o da de baja esas piezas) antes de inactivarla."
                              );
                              return;
                            }
                            if (
                              !confirm(
                                "¿Estás seguro de cambiar el estado de la sucursal?"
                              )
                            )
                              e.preventDefault();
                          }}
                          className="flex justify-end pt-3 border-t border-gray-100 mt-1"
                        >
                          <input type="hidden" name="id" value={loc.id} />
                          <input type="hidden" name="model" value="location" />
                          <input
                            type="hidden"
                            name="currentStatus"
                            value={String(loc.isArchived)}
                          />
                          <button
                            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${loc.isArchived
                              ? "text-green-600 bg-green-50 hover:bg-green-100 border border-green-200"
                              : "text-red-500 bg-red-50 hover:bg-red-100 border border-red-100"
                              }`}
                          >
                            {loc.isArchived ? "Activar" : "Inactivar"}
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// TAB 3: SUSCRIPCIONES Y PLANES
// =====================================================================
function TabSuscripciones({ allPlans, allProducts, allSubscriptions }: any) {
  const [filter, setFilter] = useState<"all" | "active" | "canceled">("all");

  const safePlans = Array.isArray(allPlans) ? allPlans : [];
  const safeProducts = Array.isArray(allProducts) ? allProducts : [];
  const safeSubscriptions = Array.isArray(allSubscriptions) ? allSubscriptions : [];

  const filteredSubscriptions = safeSubscriptions.filter((s: any) => {
    if (filter === "all") return true;
    return s.status === filter;
  });

  return (
    <section className="space-y-12">
      <div>
        <h2 className="text-2xl font-black text-amber-700">Suscripciones & Planes</h2>
        <p className="text-sm text-gray-400 mt-1 italic">
          Gestiona los planes de cobro recurrente para el Club.
        </p>
      </div>

      {/* SECCIÓN 1: Gestión de Planes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <h3 className="font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
            📂 Planes de Suscripción Disponibles
          </h3>
          <div className="overflow-x-auto bg-white border border-gray-100 rounded-xl shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-widest font-black">
                  <th className="px-4 py-3">Nombre del Plan</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Prod. Base</th>
                  <th className="px-4 py-3 text-right">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {safePlans.length > 0 ? (
                  safePlans.map((plan: any) => (
                    <tr
                      key={plan.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-sm">{plan.name}</p>
                        <p className="text-[10px] text-gray-400 italic">
                          ID: {plan.stripePriceId || "Sin ID"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <form action={updatePlanPrice} className="flex items-center gap-1">
                          <input type="hidden" name="planId" value={plan.id} />
                          <span className="text-xs text-gray-400">$</span>
                          <input
                            name="newPrice"
                            type="number"
                            step="1"
                            defaultValue={Number(plan.price) || 0}
                            className="w-16 p-1 text-center font-bold bg-white border rounded text-xs"
                            disabled={!plan.isActive}
                          />
                          <button
                            disabled={!plan.isActive}
                            className="bg-amber-600 text-white p-1 rounded hover:bg-amber-700 disabled:bg-gray-300"
                          >
                            💾
                          </button>
                        </form>
                      </td>
                      <td className="px-4 py-3">
                        <form action={updatePlanProduct} className="flex items-center gap-1">
                          <input type="hidden" name="planId" value={plan.id} />
                          <select
                            name="productId"
                            defaultValue={plan.productId || ""}
                            className="w-28 p-1 bg-white border rounded text-[10px] font-bold text-gray-600"
                            disabled={!plan.isActive}
                          >
                            <option value="">(Ninguno)</option>
                            {safeProducts.map((p: any) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <button
                            disabled={!plan.isActive}
                            className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700 disabled:bg-gray-300"
                          >
                            💾
                          </button>
                        </form>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <form action={toggleStatus}>
                          <input type="hidden" name="id" value={plan.id} />
                          <input type="hidden" name="model" value="plan" />
                          <input
                            type="hidden"
                            name="currentStatus"
                            value={String(!plan.isActive)}
                          />
                          <button
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors shadow-sm ml-auto ${plan.isActive
                              ? "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border border-red-100"
                              : "bg-green-50 text-green-600 hover:bg-green-600 hover:text-white border border-green-100"
                              }`}
                          >
                            {plan.isActive ? "✕" : "↺"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-400 italic">
                      No hay planes creados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="bg-[#FAF9F6] p-6 rounded-3xl border border-[#EAE7DD] shadow-sm">
            <h4 className="font-bold text-[#8B3A18] mb-4 text-xs uppercase tracking-widest flex items-center gap-2">
              ✨ Crear Nuevo Plan
            </h4>
            <form action={createPlan} className="space-y-4">
              <input
                name="name"
                placeholder="Nombre (ej: Pack de 12)"
                className="w-full p-3 rounded-xl bg-white border border-[#EAE7DD] text-sm"
                required
              />
              <textarea
                name="description"
                placeholder="Descripción breve"
                className="w-full p-3 rounded-xl bg-white border border-[#EAE7DD] text-sm min-h-[70px]"
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  name="interval"
                  className="w-full p-3 rounded-xl bg-white border border-[#EAE7DD] text-sm"
                  required
                >
                  <option value="month">Mensual</option>
                  <option value="week">Semanal</option>
                </select>
                <input
                  name="intervalCount"
                  type="number"
                  min="1"
                  defaultValue="1"
                  className="w-full p-3 rounded-xl bg-white border border-[#EAE7DD] text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  name="price"
                  type="number"
                  step="1"
                  placeholder="Precio ($)"
                  className="w-full p-3 rounded-xl bg-white border border-[#EAE7DD] text-sm font-bold"
                  required
                />
                <select
                  name="productId"
                  className="w-full p-3 rounded-xl bg-white border border-[#EAE7DD] text-xs"
                >
                  <option value="">(Prod. Base)</option>
                  {safeProducts.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <button className="w-full bg-[#8B3A18] text-white p-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#6c2d13] transition-all shadow-md">
                + Crear Plan en Stripe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: Miembros del Club */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t pt-10">
          <div>
            <h3 className="text-xl font-black flex items-center gap-2">
              💎 Miembros del Club
            </h3>
            <p className="text-xs text-gray-400">
              Listado de clientes con pagos recurrentes activos.
            </p>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${filter === "all"
                ? "bg-white text-black shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Todos ({safeSubscriptions.length})
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${filter === "active"
                ? "bg-white text-green-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Activos (
              {safeSubscriptions.filter((s: any) => s.status === "active")
                .length}
              )
            </button>
            <button
              onClick={() => setFilter("canceled")}
              className={`px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${filter === "canceled"
                ? "bg-white text-red-500 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Cancelados (
              {safeSubscriptions.filter((s: any) => s.status === "canceled")
                .length}
              )
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] text-gray-500 uppercase tracking-widest font-black border-b">
                <th className="px-6 py-4">Socio</th>
                <th className="px-6 py-4">Plan Actual</th>
                <th className="px-6 py-4">Estatus</th>
                <th className="px-6 py-4">Próximo Cobro</th>
                <th className="px-6 py-4 text-right">Fecha Alta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-0">
              {filteredSubscriptions.length > 0 ? (
                filteredSubscriptions.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-bold text-sm text-gray-900">
                        {sub.client?.fullName || "Desconocido"}
                      </p>
                      <p className="text-[11px] text-blue-600">
                        {sub.client?.email}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {sub.plan?.name || "Plan Eliminado"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${sub.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                          }`}
                      >
                        {sub.status === "active" ? "● Activo" : "○ Cancelado"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-bold text-gray-700">
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-right font-mono text-[10px] text-gray-400">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                    No se encontraron suscripciones con este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// TAB 4: LEADS
// =====================================================================
function TabLeads({ leads }: { leads: any[] }) {
  const safeLeads = Array.isArray(leads) ? leads : [];

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black">Leads & Prospectos</h2>
          <p className="text-sm text-gray-400 mt-1">
            {safeLeads.length} registros capturados
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-widest border-b">
              <th className="px-6 py-3 font-bold">Nombre</th>
              <th className="px-6 py-3 font-bold">Email</th>
              <th className="px-6 py-3 font-bold">Teléfono</th>
              <th className="px-6 py-3 font-bold">Fecha</th>
              <th className="px-6 py-3 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {safeLeads.length > 0 ? (
              safeLeads.map((lead: any) => (
                <tr
                  key={lead.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-4 font-bold text-sm">{lead.name}</td>
                  <td className="px-6 py-4 text-sm text-blue-600">{lead.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {lead.phone || "-"}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <form
                      action={deleteLead}
                      onSubmit={(e) => {
                        if (!confirm("¿Estás seguro de eliminar este lead?"))
                          e.preventDefault();
                      }}
                    >
                      <input type="hidden" name="leadId" value={lead.id} />
                      <button className="text-red-400 hover:text-red-600 text-xs font-bold">
                        Eliminar
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                  Aún no se han capturado leads.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// =====================================================================
// TAB 5: PRODUCTOS Y PACKS
// =====================================================================
function TabProductos({ allProducts, allFlavors, priceHistory, userEmail }: any) {
  const safeProducts = Array.isArray(allProducts) ? allProducts : [];
  const safeFlavors = Array.isArray(allFlavors) ? allFlavors : [];
  const safeHistory = Array.isArray(priceHistory) ? priceHistory : [];

  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-black">Productos, Packs & Sabores</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* PACKS */}
        <div className="space-y-6">
          <h3 className="font-bold text-gray-900 border-b pb-2">📦 Packs (Venta Online)</h3>
          <div className="space-y-3">
            {safeProducts.length > 0 ? (
              safeProducts.map((p: any) => (
                <div
                  key={p.id}
                  className={`flex flex-col gap-3 bg-white p-4 rounded-xl border ${p.isArchived ? "opacity-50 grayscale bg-gray-100" : ""
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm">
                        {p.name} {p.isArchived && "(Inactivo)"}
                      </p>
                      <p className="text-xs text-gray-400">{p.quantity} pzs</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase w-12 text-right">
                        Precio:
                      </span>
                      <form
                        action={updatePackPrice}
                        onSubmit={(e) => {
                          if (
                            !confirm(
                              "¿Estás seguro de actualizar el precio?"
                            )
                          )
                            e.preventDefault();
                        }}
                        className="flex items-center gap-1"
                      >
                        <input type="hidden" name="productId" value={p.id} />
                        <input
                          type="hidden"
                          name="adminEmail"
                          value={userEmail || ""}
                        />
                        <input
                          name="newPrice"
                          type="number"
                          step="0.01"
                          defaultValue={Number(p.price) || 0}
                          className="w-16 p-1 text-center font-bold bg-white border rounded text-xs"
                          disabled={p.isArchived}
                        />
                        <button
                          disabled={p.isArchived}
                          className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          💾
                        </button>
                      </form>
                      <form
                        action={toggleStatus}
                        onSubmit={(e) => {
                          if (
                            !confirm("¿Estás seguro de cambiar el estado?")
                          )
                            e.preventDefault();
                        }}
                      >
                        <input type="hidden" name="id" value={p.id} />
                        <input
                          type="hidden"
                          name="model"
                          value="product"
                        />
                        <input
                          type="hidden"
                          name="currentStatus"
                          value={String(p.isArchived)}
                        />
                        <button
                          className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white ml-1 ${p.isArchived ? "bg-green-500" : "bg-red-400"
                            }`}
                        >
                          {p.isArchived ? "↺" : "✕"}
                        </button>
                      </form>
                    </div>
                  </div>
                  {/* Dimensiones */}
                  <div className="flex justify-between items-center py-2 border-t border-gray-100 gap-2 overflow-x-auto">
                    <span className="text-[10px] text-gray-400 font-bold uppercase shrink-0">
                      DIMENSIONES:
                    </span>
                    <form
                      action={updateProductDimensions}
                      onSubmit={(e) => {
                        if (
                          !confirm(
                            "¿Estás seguro de actualizar dimensiones?"
                          )
                        )
                          e.preventDefault();
                      }}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="productId" value={p.id} />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400">
                          Peso(kg)
                        </span>
                        <input
                          name="weight"
                          type="number"
                          step="0.01"
                          defaultValue={Number(p.weight) || 1.5}
                          className="w-12 p-1 text-center bg-gray-50 border rounded text-xs"
                          disabled={p.isArchived}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400">L(cm)</span>
                        <input
                          name="length"
                          type="number"
                          step="0.01"
                          defaultValue={Number(p.length) || 20}
                          className="w-12 p-1 text-center bg-gray-50 border rounded text-xs"
                          disabled={p.isArchived}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400">A(cm)</span>
                        <input
                          name="width"
                          type="number"
                          step="0.01"
                          defaultValue={Number(p.width) || 20}
                          className="w-12 p-1 text-center bg-gray-50 border rounded text-xs"
                          disabled={p.isArchived}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400">
                          Al(cm)
                        </span>
                        <input
                          name="height"
                          type="number"
                          step="0.01"
                          defaultValue={Number(p.height) || 20}
                          className="w-12 p-1 text-center bg-gray-50 border rounded text-xs"
                          disabled={p.isArchived}
                        />
                      </div>
                      <button
                        disabled={p.isArchived}
                        className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        💾
                      </button>
                    </form>
                  </div>
                  {/* Descuento socios */}
                  <div className="flex justify-end items-center pt-2 border-t border-gray-100 gap-2">
                    <span className="text-[10px] text-[#8B3A18] font-bold uppercase">
                      Socios (%):
                    </span>
                    <form
                      action={updateClubDiscountPercent}
                      onSubmit={(e) => {
                        if (
                          !confirm("¿Estás seguro de modificar el descuento?")
                        )
                          e.preventDefault();
                      }}
                      className="flex items-center gap-1"
                    >
                      <input type="hidden" name="productId" value={p.id} />
                      <input
                        name="clubDiscountPercent"
                        type="number"
                        min="0"
                        max="100"
                        defaultValue={p.clubDiscountPercent || 0}
                        className="w-14 p-1 text-center font-bold bg-[#8B3A18]/5 border border-[#8B3A18]/30 rounded text-xs text-[#8B3A18]"
                        disabled={p.isArchived}
                      />
                      <button
                        disabled={p.isArchived}
                        className="bg-[#8B3A18] text-white p-1 rounded hover:bg-[#6c2d13] disabled:bg-gray-400"
                      >
                        💾
                      </button>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 italic text-sm text-center py-6">
                No hay packs creados.
              </p>
            )}
          </div>

          {/* Crear Pack */}
          <div className="bg-gray-50 p-6 rounded-2xl border">
            <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase">
              + Nuevo Pack
            </h4>
            <form action={createProduct} className="grid grid-cols-2 gap-3">
              <input
                name="name"
                placeholder="Nombre Pack"
                className="col-span-2 p-2 rounded bg-white border text-sm"
                required
              />
              <input
                name="price"
                type="number"
                step="0.01"
                placeholder="Precio ($)"
                className="p-2 rounded bg-white border text-sm"
                required
              />
              <input
                name="quantity"
                type="number"
                placeholder="# Bebidas"
                className="p-2 rounded bg-white border text-sm"
                required
              />
              <input
                name="clubDiscountPercent"
                type="number"
                min="0"
                max="100"
                placeholder="% Descuento Socios"
                className="col-span-2 p-2 rounded bg-white border text-sm"
              />
              <div className="col-span-2 grid grid-cols-4 gap-2">
                <input
                  name="weight"
                  type="number"
                  step="0.01"
                  placeholder="Peso (kg)"
                  className="p-2 rounded bg-white border text-xs"
                />
                <input
                  name="length"
                  type="number"
                  step="0.01"
                  placeholder="Largo (cm)"
                  className="p-2 rounded bg-white border text-xs"
                />
                <input
                  name="width"
                  type="number"
                  step="0.01"
                  placeholder="Ancho (cm)"
                  className="p-2 rounded bg-white border text-xs"
                />
                <input
                  name="height"
                  type="number"
                  step="0.01"
                  placeholder="Alto (cm)"
                  className="p-2 rounded bg-white border text-xs"
                />
              </div>
              <button className="col-span-2 bg-black text-white p-2 rounded font-bold text-sm hover:bg-gray-800">
                Crear Pack
              </button>
            </form>
          </div>
        </div>

        {/* SABORES */}
        <div className="space-y-6">
          <h3 className="font-bold text-gray-900 border-b pb-2">
            🍾 Botellas (Unitario)
          </h3>
          <div className="space-y-3">
            {safeFlavors.length > 0 ? (
              safeFlavors.map((f: any) => (
                <div
                  key={f.id}
                  className={`flex justify-between items-center bg-white p-3 rounded-xl border ${f.isArchived ? "opacity-50 grayscale" : ""
                    }`}
                >
                  <div>
                    <p className="font-bold text-sm">
                      {f.name} {f.isArchived && "(Inactivo)"}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">{f.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <form
                      action={updateFlavorPrice}
                      onSubmit={(e) => {
                        if (
                          !confirm(
                            "¿Estás seguro de actualizar el precio?"
                          )
                        )
                          e.preventDefault();
                      }}
                      className="flex items-center gap-1"
                    >
                      <input type="hidden" name="flavorId" value={f.id} />
                      <input
                        type="hidden"
                        name="adminEmail"
                        value={userEmail || ""}
                      />
                      <input
                        name="newPrice"
                        type="number"
                        step="0.01"
                        defaultValue={Number(f.price) || 0}
                        className="w-16 p-1 text-center font-bold bg-white border rounded text-xs"
                        disabled={f.isArchived}
                      />
                      <button
                        disabled={f.isArchived}
                        className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        💾
                      </button>
                    </form>
                    <form
                      action={toggleStatus}
                      onSubmit={(e) => {
                        if (
                          !confirm("¿Estás seguro de cambiar el estado?")
                        )
                          e.preventDefault();
                      }}
                    >
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="model" value="flavor" />
                      <input
                        type="hidden"
                        name="currentStatus"
                        value={String(f.isArchived)}
                      />
                      <button
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white ${f.isArchived ? "bg-green-500" : "bg-red-400"
                          }`}
                      >
                        {f.isArchived ? "↺" : "✕"}
                      </button>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 italic text-sm text-center py-6">
                No hay sabores creados.
              </p>
            )}
          </div>

          {/* Crear Sabor */}
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <h4 className="font-bold text-blue-800 mb-3 text-sm uppercase">
              + Nuevo Sabor
            </h4>
            <form action={createFlavor} className="grid grid-cols-2 gap-3">
              <input
                name="name"
                placeholder="Nombre"
                className="col-span-2 p-2 rounded bg-white border text-sm"
                required
              />
              <input
                name="slug"
                placeholder="Slug (ej: pina)"
                className="col-span-2 p-2 rounded bg-white border text-sm"
                required
              />
              <input
                name="price"
                type="number"
                step="0.01"
                placeholder="Precio ($)"
                className="col-span-2 p-2 rounded bg-white border text-sm"
                required
              />
              <button className="col-span-2 bg-blue-600 text-white p-2 rounded font-bold text-sm hover:bg-blue-700">
                Crear Sabor
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Historial de Precios */}
      <div className="bg-white rounded-2xl p-6 border shadow-sm">
        <h3 className="text-sm font-black text-gray-500 uppercase mb-4">
          📈 Historial de Cambios de Precio
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Producto</th>
                <th className="px-4 py-2">Usuario</th>
                <th className="px-4 py-2">Cambio</th>
                <th className="px-4 py-2">Var.</th>
              </tr>
            </thead>
            <tbody>
              {safeHistory.length > 0 ? (
                safeHistory.map((h: any) => {
                  const isRise = Number(h.newPrice) > Number(h.oldPrice);
                  return (
                    <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">
                        {new Date(h.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {h.product?.name || h.flavor?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {h.userId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="line-through text-gray-400 mr-2">
                          ${Number(h.oldPrice)}
                        </span>
                        →{" "}
                        <span className="font-bold ml-2">
                          ${Number(h.newPrice)}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 font-bold ${isRise ? "text-green-600" : "text-red-500"
                          }`}
                      >
                        {isRise ? "↑" : "↓"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic text-sm">
                    Sin cambios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}