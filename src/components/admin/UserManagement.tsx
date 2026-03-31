"use client";

import React, { useState } from "react";
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

// ---- Types ----
type TabId = "dashboard" | "inventario" | "envios" | "suscripciones" | "leads" | "productos" | "usuarios" | "clientes";

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
    { id: "usuarios", label: "🛡️ Staff", icon: <ShieldCheck size={18} /> },
    { id: "clientes", label: "👤 Clientes", icon: <Contact2 size={18} /> },
];

export default function AdminDashboard({ data }: { data: any }) {
    const [activeTab, setActiveTab] = useState<TabId>("dashboard");

    const {
        stats, topFlavors, topPacks, totalFlavorsSold, totalPacksSold,
        allFlavors, activeFlavors, allProducts, allPlans, priceHistory,
        allLocations, activeLocations, leads, userEmail, from, to, transfers,
        allSubscriptions, users
    } = data;

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
                {activeTab === "dashboard" && <TabVentas {...{ stats, topFlavors, topPacks, totalFlavorsSold, totalPacksSold, from, to }} />}
                {activeTab === "inventario" && <TabInventario {...{ activeFlavors, activeLocations, allLocations, userEmail }} />}
                {activeTab === "envios" && <TabEnvios {...{ activeFlavors, activeLocations, transfers, userEmail }} />}
                {activeTab === "suscripciones" && <TabSuscripciones {...{ allPlans, allProducts, allSubscriptions }} />}
                {activeTab === "leads" && <TabLeads leads={leads} />}
                {activeTab === "productos" && <TabProductos {...{ allProducts, allFlavors, priceHistory, userEmail }} />}
                {activeTab === "usuarios" && <TabUsuarios users={users} />}
                {activeTab === "clientes" && <TabClientes />}
            </main>
        </>
    );
}

// =====================================================================
// TAB: GESTIÓN DE USUARIOS (STAFF)
// =====================================================================
function TabUsuarios({ users }: { users: any[] }) {
    return (
        <section className="space-y-6">
            <div>
                <h2 className="text-2xl font-black">Gestión de Staff</h2>
                <p className="text-sm text-gray-400 mt-1">Asigna roles de administrador o vendedor a los usuarios registrados.</p>
            </div>
            <UserManagement users={users} />
        </section>
    );
}

// =====================================================================
// TAB: CLIENTES (Próximamente)
// =====================================================================
function TabClientes() {
    return (
        <section className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 p-10 rounded-3xl text-center">
                <h2 className="text-2xl font-black text-blue-900">Base de Datos de Clientes</h2>
                <p className="text-blue-700 mt-2">Aquí conectaremos la tabla `client` de Prisma para ver direcciones y teléfonos.</p>
            </div>
        </section>
    );
}

// ... (Aquí van todas tus funciones TabVentas, TabInventario, etc., sin cambios)

function TabVentas({ stats, topFlavors, topPacks, totalFlavorsSold, totalPacksSold, from, to }: any) {
    return (
        <section className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black">Reporte de Ventas</h2>
                    <p className="text-sm text-gray-400 mt-1">{from && to ? `Del ${from} al ${to}` : "Histórico completo"}</p>
                </div>
            </div>
            <DateRangeFilter />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black text-white p-6 rounded-2xl shadow-lg">
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Ingresos</p>
                    <p className="text-3xl font-black text-green-400 mt-1">${stats.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pedidos</p>
                    <p className="text-3xl font-black mt-1">{stats.totalOrders}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sabor #1</p>
                    <p className="text-xl font-black truncate mt-1">{topFlavors[0]?.name || "-"}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pack #1</p>
                    <p className="text-xl font-black truncate mt-1">{topPacks[0]?.name || "-"}</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl shadow-sm border">
                    <h3 className="text-lg font-black mb-6">🍍 Top Sabores</h3>
                    <div className="space-y-4">
                        {topFlavors.map((f: any, idx: number) => {
                            const pct = totalFlavorsSold > 0 ? ((f.count / totalFlavorsSold) * 100).toFixed(1) : 0;
                            return (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm font-bold mb-1">
                                        <span className="text-gray-800">{idx + 1}. {f.name}</span>
                                        <span className="text-gray-400">{pct}% ({f.count})</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                        {topFlavors.length === 0 && <p className="text-gray-400 text-center italic text-sm">Sin datos aún.</p>}
                    </div>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-sm border">
                    <h3 className="text-lg font-black mb-6">📦 Top Packs</h3>
                    <div className="space-y-4">
                        {topPacks.map((p: any, idx: number) => {
                            const pct = totalPacksSold > 0 ? ((p.count / totalPacksSold) * 100).toFixed(1) : 0;
                            return (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm font-bold mb-1">
                                        <span className="text-gray-800">{idx + 1}. {p.name}</span>
                                        <span className="text-gray-400">{pct}% ({p.count})</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                                        <div className="h-full bg-black rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                        {topPacks.length === 0 && <p className="text-gray-400 text-center italic text-sm">Sin datos aún.</p>}
                    </div>
                </div>
            </div>
        </section>
    );
}

// ... (Copia el resto de tus pestañas TabInventario, TabSuscripciones, etc., para completar el archivo)