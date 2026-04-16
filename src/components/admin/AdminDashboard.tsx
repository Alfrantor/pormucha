"use client";

import React, { useState, useMemo } from "react";
import { BarChart3, Package, Repeat, Users, ShoppingBag, Truck, ShieldCheck, Contact2 } from "lucide-react";
import { TogglePlanBtn } from "@/components/admin/toggle-plan-btn";
import { DateRangeFilter } from "@/components/admin/date-range-filter";
import { TabEnvios } from "@/components/admin/TabEnvios";
import UserManagement from "@/components/admin/UserManagement";
import { toggleStatus } from "@/actions/toggle-status";
import {
  createLocation, registerMovement, updatePackPrice, updateFlavorPrice,
  createProduct, createFlavor, updateClubDiscountPercent, updateProductDimensions,
  createPlan, updatePlanPrice, updatePlanProduct, deleteLead, updateLocation,
  createTransfer, receiveTransfer
} from "@/actions/admin-actions";
import { generateShippingLabel } from "@/actions/admin-actions";

// ---- Types ----
type TabId = "dashboard" | "inventario" | "envios" | "suscripciones" | "leads" | "productos" | "usuarios" | "pedidos" | "clientes";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: "dashboard", label: "📊 Dashboard", icon: <BarChart3 size={18} /> },
  { id: "inventario", label: "📦 Inventario", icon: <Package size={18} /> },
  { id: "envios", label: "🚚 Traspasos", icon: <Truck size={18} /> },
  { id: "productos", label: "🏷️ Productos", icon: <ShoppingBag size={18} /> },
  { id: "suscripciones", label: "🔄 Suscripciones", icon: <Repeat size={18} /> },
  { id: "leads", label: "👥 Leads", icon: <Users size={18} /> },
  { id: "clientes", label: "👤 Clientes", icon: <Contact2 size={18} /> },
  { id: "pedidos", label: "🛒 Pedidos", icon: <ShoppingBag size={18} /> },
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
    orders = []
  } = data;

  // Memoize para evitar re-renders innecesarios
  const memoizedStats = useMemo(() => stats, [stats]);

  return (
    <>
      {/* TAB BAR */}
      <nav className="bg-white border-b sticky top-[65px] z-40 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold tracking-wide uppercase border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
                ? "border-black text-black"
                : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200"
                }`}
            >
              {tab.icon}
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>



      <main className="max-w-7xl mx-auto p-6 space-y-8">
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
        {activeTab === "pedidos" && <TabPedidos orders={orders} />}
        {activeTab === "clientes" && <TabClientes clients={clients} />}
      </main>
    </>
  );
}

function TabPedidos({ orders = [] }: { orders: any[] }) {
  // Estado para controlar qué pedido se está procesando (loading)
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // Función manejadora del botón
  const handleAction = async (order: any) => {
    // 1. Si ya existe la guía, solo la abrimos
    if (order.trackingUrl) {
      window.open(order.trackingUrl, "_blank");
      return;
    }

    // 2. Si no hay guía, procedemos a generarla
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

  // Filtramos para ver tanto los pagados como los que ya tienen guía (SHIPPED)
  const relevantOrders = orders.filter(
    (order) => order.status === "PAID" || order.status === "SHIPPED"
  );

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Gestión de Pedidos</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            Mostrando pedidos listos para envío ({relevantOrders.length})
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-[10px] uppercase font-black text-gray-500 border-b">
              <th className="px-6 py-4">ID Orden</th>
              <th className="px-6 py-4">Nombre del Cliente</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Estatus</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {relevantOrders.length > 0 ? (
              relevantOrders.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      #{order.id.slice(-6).toUpperCase()}
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
                    <span className={`text-[10px] px-3 py-1 rounded-full font-black tracking-tighter border ${order.status === "SHIPPED"
                      ? "bg-blue-50 text-blue-600 border-blue-100"
                      : "bg-green-50 text-green-700 border-green-100"
                      }`}>
                      ● {order.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleAction(order)}
                      disabled={isGenerating === order.id}
                      className={`text-[10px] px-4 py-2 rounded-xl font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50 ${order.trackingUrl
                        ? "bg-green-100 text-green-700 border border-green-200 hover:bg-green-200"
                        : "bg-black text-white hover:bg-gray-800"
                        }`}
                    >
                      {isGenerating === order.id
                        ? "Procesando..."
                        : order.trackingUrl
                          ? "Ver Guía"
                          : "Generar Guía"
                      }
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-20 text-center">
                  <p className="text-gray-400 italic font-medium">No hay pedidos pendientes de envío.</p>
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
        <UserManagement users={users} />
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
          <h2 className="text-2xl font-black italic">Base de Datos de Clientes</h2>
          <p className="text-sm text-gray-400 mt-1">Información de direcciones y contacto.</p>
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
        <h2 className="text-2xl font-black italic">Base de Datos de Clientes</h2>
        <p className="text-sm text-gray-400 mt-1">
          Información recolectada de la tabla client (direcciones y contacto).
        </p>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-[10px] uppercase font-black text-gray-500 border-b">
              <th className="px-6 py-4">Cliente / Email</th>
              <th className="px-6 py-4">Teléfono</th>
              <th className="px-6 py-4">Ubicación</th>
              <th className="px-6 py-4">Referencia</th>
            </tr>
          </thead>
          <tbody>
            {clients.length > 0 ? (
              clients.map((c: any) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{c.fullName || "S/N"}</p>
                    <p className="text-xs text-blue-600 font-medium">{c.email || "S/E"}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-700">
                    {c.phone || "---"}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">
                      {c.street || ""} {c.number || ""}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">
                      {c.neighborhood || ""}, {c.city || ""}, {c.state || ""}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-[11px] text-gray-500 italic max-w-xs">
                    {c.reference || "Sin referencias"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-10 text-center text-gray-400 italic">
                  No hay registros en la tabla de clientes.
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