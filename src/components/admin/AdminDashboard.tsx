"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3, Package, Repeat, Users, ShoppingBag, Truck, Contact2, DollarSign,
  ShoppingCart, ChevronRight, LayoutDashboard, Package2, UserCog, Menu, MonitorCheck,
  Building2, Pencil, Trash2, Plus, X, TrendingUp, TrendingDown, ArrowUpRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Area, AreaChart, ReferenceLine,
} from "recharts";
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
import { setInventoryPin } from "@/app/_actions/settings";
import { createAdjustmentRequest, approveAdjustmentRequest, rejectAdjustmentRequest } from "@/app/_actions/inventory";
import { cancelOrder } from "@/app/_actions/orders";
import { editOrder, getOrderEdits } from "@/app/_actions/order-edits";
import { registerOrderPayment, cancelOrderPayment, recalculateOrderPayment, getOrderPayments } from "@/app/_actions/payments";
import { getUploadUrl, getDownloadUrl } from "@/app/_actions/upload";
import { toast } from "sonner";

async function uploadFileToS3(file: File, folder: "facturas" | "comprobantes"): Promise<string> {
  const res = await getUploadUrl(file.name, file.type, folder);
  if ("error" in res && res.error) throw new Error(res.error);
  await fetch(res.signedUrl!, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  return res.fileUrl!;
}

async function openS3File(fileUrl: string) {
  const res = await getDownloadUrl(fileUrl);
  if ("error" in res) { toast.error(res.error); return; }
  window.open(res.url, "_blank");
}

function S3FileLink({ url, label }: { url: string; label: string }) {
  return (
    <button
      onClick={() => openS3File(url)}
      className="text-xs text-blue-600 font-bold underline hover:text-blue-800 transition text-left"
    >
      {label}
    </button>
  );
}

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
    userRole = "admin",
    from = null,
    to = null,
    transfers = [],
    allSubscriptions = [],
    users = [],
    clients = [],
    orders = [],
    flavorsWithPricing = [],
    giros = [],
    adjustmentRequests = [],
    unpaidPosOrders = [],
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
            <TabVentas {...{ stats: memoizedStats, topFlavors, topPacks, totalFlavorsSold, totalPacksSold, from, to, orders, allLocations, allSubscriptions }} />
          )}
          {activeTab === "inventario" && (
            <TabInventario {...{ activeFlavors, activeLocations, allLocations, userEmail, userRole, adjustmentRequests }} />
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
          {activeTab === "usuarios" && <TabUsuarios users={users} currentUserRole={userRole} />}
          {activeTab === "clientes" && <TabClientes clients={clients} orders={orders} giros={giros} unpaidPosOrders={unpaidPosOrders} />}
          {activeTab === "precios" && <TabPrecios flavors={flavorsWithPricing} />}
          {activeTab === "pedidos" && <TabPedidos orders={orders} />}
          {activeTab === "giros" && <TabGiros giros={giros} />}
        </main>
      </div>
    </div>
  );
}

// ── tipos del modal de cancelación ───────────────────────────────────────────
type CancelStep = "confirm" | "stock" | "replacement" | "note" | "done";

const PAGE_SIZE = 30;

function TabPedidos({ orders = [] }: { orders: any[] }) {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<"all" | "POS" | "WEB" | "CANCELLED" | "UNPAID">("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  // Estado del modal de cancelación
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelStep, setCancelStep] = useState<CancelStep>("confirm");
  const [returnStock, setReturnStock] = useState<boolean | null>(null);
  const [doReplacement, setDoReplacement] = useState<boolean | null>(null);
  const [cancelNote, setCancelNote] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [localOrders, setLocalOrders] = useState<any[]>(orders);

  // Sincronizar si cambia el prop (refresco de página)
  React.useEffect(() => { setLocalOrders(orders); }, [orders]);

  // Resetear página al cambiar filtros
  React.useEffect(() => { setPage(1); }, [channelFilter, search, dateFrom, dateTo]);

  // ── Modal de gestión de pagos POS ──
  const [paymentsModal, setPaymentsModal] = useState<{ orderId: string; orderLabel: string } | null>(null);
  const [paymentsModalData, setPaymentsModalData] = useState<{ order: any; payments: any[] } | null>(null);
  const [paymentsModalLoading, setPaymentsModalLoading] = useState(false);
  const [pmCancelConfirm, setPmCancelConfirm] = useState<{ paymentId: string; amount: number } | null>(null);
  const [pmCancelling, setPmCancelling] = useState(false);
  const [pmRecalculating, setPmRecalculating] = useState(false);

  const openPaymentsModal = async (order: any) => {
    const label = order.folio || `#${order.id.slice(-6).toUpperCase()}`;
    setPaymentsModal({ orderId: order.id, orderLabel: label });
    setPaymentsModalData(null);
    setPmCancelConfirm(null);
    setPaymentsModalLoading(true);
    const res = await getOrderPayments(order.id);
    setPaymentsModalLoading(false);
    if (res.success && res.order) {
      setPaymentsModalData({ order: res.order, payments: res.payments || [] });
    } else {
      toast.error(res.error || "Error al cargar pagos");
      setPaymentsModal(null);
    }
  };

  const handlePmCancelPayment = async () => {
    if (!pmCancelConfirm || !paymentsModal) return;
    setPmCancelling(true);
    const res = await cancelOrderPayment(pmCancelConfirm.paymentId, paymentsModal.orderId);
    setPmCancelling(false);
    if (res.success) {
      toast.success("Abono cancelado. Saldo recalculado.");
      setPaymentsModalData(prev => prev ? {
        order: { ...prev.order, amountPaid: res.amountPaid, isPaid: res.isPaidNow },
        payments: prev.payments.filter((p: any) => p.id !== pmCancelConfirm.paymentId),
      } : null);
      // Actualizar también la fila en la tabla
      setLocalOrders(prev => prev.map((o: any) =>
        o.id !== paymentsModal.orderId ? o : { ...o, status: res.isPaidNow ? "PAID" : "PENDING" }
      ));
      setPmCancelConfirm(null);
    } else {
      toast.error(res.error || "Error al cancelar pago");
    }
  };

  // ── Formulario de abono dentro del modal de pagos ──
  const [pmAddPayment, setPmAddPayment] = useState(false);
  const [pmPayAmount, setPmPayAmount] = useState("");
  const [pmPayMethod, setPmPayMethod] = useState("CASH");
  const [pmPayNote, setPmPayNote] = useState("");
  const [pmPayProofUrl, setPmPayProofUrl] = useState("");
  const [pmProofUploading, setPmProofUploading] = useState(false);
  const [pmPaying, setPmPaying] = useState(false);

  const handlePmRegisterPayment = async () => {
    if (!paymentsModal || !paymentsModalData) return;
    const amount = parseFloat(pmPayAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Ingresa un monto válido"); return; }
    setPmPaying(true);
    const res = await registerOrderPayment(paymentsModal.orderId, amount, pmPayMethod, pmPayNote || undefined, pmPayProofUrl || undefined);
    setPmPaying(false);
    if (res.success) {
      toast.success(res.isPaidNow ? "¡Orden pagada completamente!" : `Abono registrado. Restante: $${res.remaining.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`);
      const fresh = await getOrderPayments(paymentsModal.orderId);
      if (fresh.success && fresh.order) setPaymentsModalData({ order: fresh.order, payments: fresh.payments || [] });
      setLocalOrders(prev => prev.map((o: any) => o.id !== paymentsModal.orderId ? o : { ...o, status: res.isPaidNow ? "PAID" : o.status }));
      setPmAddPayment(false);
      setPmPayAmount("");
      setPmPayNote("");
      setPmPayMethod("CASH");
      setPmPayProofUrl("");
    } else {
      toast.error(res.error || "Error al registrar abono");
    }
  };

  // ── Modal de edición de orden ──
  const [editModal, setEditModal] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [editEdits, setEditEdits] = useState<any[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [invoiceUploading, setInvoiceUploading] = useState(false);

  const openEditModal = async (order: any) => {
    setEditModal(order);
    setEditForm({
      fullName:        order.fullName        ?? "",
      email:           order.email           ?? "",
      phone:           order.phone           ?? "",
      notes:           order.notes           ?? "",
      requiresInvoice: !!(order as any).requiresInvoice,
      paymentMethod:   order.paymentMethod   ?? "CASH",
      invoiceNumber:   order.invoiceNumber   ?? "",
      invoiceDate:     order.invoiceDate ? order.invoiceDate.slice(0, 10) : "",
      invoiceUrl:      order.invoiceUrl      ?? "",
    });
    setEditEdits([]);
    setEditLoading(true);
    const res = await getOrderEdits(order.id);
    setEditLoading(false);
    if (res.success) setEditEdits(res.edits || []);
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    setEditSaving(true);
    const res = await editOrder(editModal.id, {
      fullName:        editForm.fullName        || null,
      email:           editForm.email           || null,
      phone:           editForm.phone           || null,
      notes:           editForm.notes           || null,
      requiresInvoice: editForm.requiresInvoice,
      paymentMethod:   editForm.paymentMethod   || null,
      invoiceNumber:   editForm.invoiceNumber   || null,
      invoiceDate:     editForm.invoiceDate     ? new Date(editForm.invoiceDate).toISOString() : null,
      invoiceUrl:      editForm.invoiceUrl      || null,
    });
    setEditSaving(false);
    if (res.success) {
      toast.success("Orden actualizada correctamente.");
      setLocalOrders(prev => prev.map((o: any) =>
        o.id !== editModal.id ? o : { ...o, ...editForm }
      ));
      // Recargar historial
      const fresh = await getOrderEdits(editModal.id);
      if (fresh.success) setEditEdits(fresh.edits || []);
    } else {
      toast.error(res.error || "Error al guardar");
    }
  };

  const handlePmRecalculate = async () => {
    if (!paymentsModal) return;
    setPmRecalculating(true);
    const res = await recalculateOrderPayment(paymentsModal.orderId);
    setPmRecalculating(false);
    if (res.success) {
      toast.success(`Recalculado. Pagado: $${res.amountPaid.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`);
      // Recargar desde DB para tener datos limpios
      const fresh = await getOrderPayments(paymentsModal.orderId);
      if (fresh.success && fresh.order) {
        setPaymentsModalData({ order: fresh.order, payments: fresh.payments || [] });
      }
      setLocalOrders(prev => prev.map((o: any) =>
        o.id !== paymentsModal.orderId ? o : { ...o, status: res.isPaidNow ? "PAID" : "PENDING" }
      ));
    } else {
      toast.error(res.error || "Error al recalcular");
    }
  };

  const openCancel = (order: any) => {
    setCancelTarget(order);
    setCancelStep("confirm");
    setReturnStock(null);
    setDoReplacement(null);
    setCancelNote("");
  };
  const closeCancel = () => { setCancelTarget(null); setCancelLoading(false); };

  const executeCancel = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    const res = await cancelOrder(
      cancelTarget.id,
      returnStock ?? false,
      doReplacement ?? false,
      cancelNote || undefined
    );
    setCancelLoading(false);
    if (!res.success) { alert("Error: " + res.error); return; }

    // Actualizar estado local
    setLocalOrders(prev => {
      const updated = prev.map(o =>
        o.id === cancelTarget.id
          ? { ...o, status: "CANCELLED", cancelledAt: new Date().toISOString(), cancellationNote: cancelNote || null }
          : o
      );
      if (res.replacementOrderId) {
        // Añadir la orden de reemplazo con datos básicos
        const orig = cancelTarget;
        updated.unshift({
          ...orig,
          id: res.replacementOrderId,
          status: "PENDING",
          cancelledAt: null,
          cancellationNote: null,
          replacesOrderId: orig.id,
          replacements: [],
          notes: `Reemplazo de #${orig.id.slice(-6).toUpperCase()}`,
        });
      }
      return updated;
    });
    setCancelStep("done");
  };

  const handleAction = async (order: any) => {
    if (order.trackingUrl) { window.open(order.trackingUrl, "_blank"); return; }
    setIsGenerating(order.id);
    try {
      const res = await generateShippingLabel(order.id);
      if (res.success && res.labelUrl) window.open(res.labelUrl, "_blank");
      else alert("Error: " + res.error);
    } catch { alert("Error crítico al conectar con Skydropx"); }
    finally { setIsGenerating(null); }
  };

  const cancelledCount = localOrders.filter(o => o.status === "CANCELLED").length;
  const posCount       = localOrders.filter(o => o.channel === "POS" && o.status !== "CANCELLED").length;
  const webCount       = localOrders.filter(o => o.channel !== "POS" && o.status !== "CANCELLED").length;
  const unpaidCount    = localOrders.filter(o => !o.isPaid && o.status !== "CANCELLED").length;

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const to   = dateTo   ? new Date(dateTo   + "T23:59:59") : null;

    return localOrders
      .filter(order => {
        // Canal
        if (channelFilter === "CANCELLED") return order.status === "CANCELLED";
        if (channelFilter === "UNPAID") return !order.isPaid && order.status !== "CANCELLED";
        if (channelFilter === "POS") return order.channel === "POS" && order.status !== "CANCELLED";
        if (channelFilter === "WEB") return order.channel !== "POS" && order.status !== "CANCELLED";
        return true;
      })
      .filter(order => {
        if (!q) return true;
        const folio = (order.folio || "").toLowerCase();
        const name  = (order.fullName || "").toLowerCase();
        const shortId = order.id.slice(-6).toLowerCase();
        return folio.includes(q) || name.includes(q) || shortId.includes(q);
      })
      .filter(order => {
        const d = new Date(order.createdAt);
        if (from && d < from) return false;
        if (to   && d > to)   return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [localOrders, channelFilter, search, dateFrom, dateTo]);

  const totalPages     = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      SHIPPED:    "bg-blue-50 text-blue-600 border-blue-100",
      PAID:       "bg-green-50 text-green-700 border-green-100",
      COMPLETED:  "bg-green-50 text-green-700 border-green-100",
      CANCELLED:  "bg-red-50 text-red-600 border-red-100",
      PENDING:    "bg-amber-50 text-amber-600 border-amber-100",
    };
    return map[status] ?? "bg-gray-50 text-gray-600 border-gray-100";
  };

  return (
    <section className="space-y-4">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Gestión de Pedidos</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            {filteredOrders.length} pedidos · mostrando {paginatedOrders.length}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl shrink-0">
          {(["all","POS","WEB","CANCELLED","UNPAID"] as const).map(f => (
            <button key={f}
              onClick={() => setChannelFilter(f)}
              className={`px-3 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${channelFilter === f
                ? f === "CANCELLED" ? "bg-white text-red-600 shadow-sm"
                  : f === "UNPAID" ? "bg-white text-orange-600 shadow-sm"
                  : f === "POS" ? "bg-white text-purple-700 shadow-sm"
                  : f === "WEB" ? "bg-white text-blue-600 shadow-sm"
                  : "bg-white text-black shadow-sm"
                : "text-gray-500 hover:text-gray-700"}`}
            >
              {f === "all" ? `Todos (${localOrders.length})`
                : f === "POS" ? `POS (${posCount})`
                : f === "WEB" ? `Web (${webCount})`
                : f === "CANCELLED" ? `Cancelados (${cancelledCount})`
                : `Cuentas por pagar (${unpaidCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y FECHAS ── */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        {/* Buscador */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por # folio o nombre del cliente..."
            className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-gray-300 transition bg-gray-50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          )}
        </div>
        {/* Fechas */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase whitespace-nowrap">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="p-2 border-2 border-gray-100 rounded-xl text-xs font-mono bg-gray-50 focus:outline-none focus:border-gray-300 transition"
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase whitespace-nowrap">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="p-2 border-2 border-gray-100 rounded-xl text-xs font-mono bg-gray-50 focus:outline-none focus:border-gray-300 transition"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition whitespace-nowrap"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-[10px] uppercase font-black text-gray-500 border-b">
              <th className="px-6 py-4">Folio / ID</th>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Canal</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Estatus</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map((order: any) => {
                const isPOS = order.channel === "POS";
                const isCancelled = order.status === "CANCELLED";
                const hasReplacement = order.replacements?.length > 0;
                const isReplacement = !!order.replacesOrderId;
                return (
                  <tr key={order.id} className={`hover:bg-gray-50/50 transition-colors ${isCancelled ? "opacity-60" : ""}`}>
                    <td className="px-6 py-4">
                      {order.folio ? (
                        <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {order.folio}
                        </span>
                      ) : (
                        <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                      )}
                      {isReplacement && (
                        <p className="text-[9px] text-amber-600 font-bold mt-1">
                          ↩ Reemplazo de #{order.replacesOrderId?.slice(-6).toUpperCase()}
                        </p>
                      )}
                      {hasReplacement && (
                        <p className="text-[9px] text-blue-500 font-bold mt-1">
                          ↪ Reemplazada
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-xs font-bold text-gray-700">{new Date(order.createdAt).toLocaleDateString("es-MX")}</p>
                      <p className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</p>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-black border ${isPOS ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-sky-50 text-sky-700 border-sky-100"}`}>
                        {isPOS ? "POS" : "Web"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{order.fullName || "Sin nombre"}</p>
                      <p className="text-[10px] text-gray-400">{order.email}</p>
                      {isCancelled && order.cancellationNote && (
                        <p className="text-[9px] text-red-500 italic mt-0.5">"{order.cancellationNote}"</p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-black text-sm text-gray-900">
                        ${Number(order.total).toLocaleString("es-MX")}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-3 py-1 rounded-full font-black tracking-tighter border ${statusBadge(order.status)}`}>
                        ● {order.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* Botón envío (solo web) */}
                        {!isPOS && !isCancelled && (
                          <button
                            onClick={() => handleAction(order)}
                            disabled={isGenerating === order.id}
                            className={`text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50 ${order.trackingUrl
                              ? "bg-green-100 text-green-700 border border-green-200 hover:bg-green-200"
                              : "bg-black text-white hover:bg-gray-800"
                            }`}
                          >
                            {isGenerating === order.id ? "..." : order.trackingUrl ? "Ver Guía" : "Generar Guía"}
                          </button>
                        )}

                        {/* Botón pagos POS */}
                        {isPOS && (
                          <button
                            onClick={() => openPaymentsModal(order)}
                            className="text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest border border-green-200 text-green-700 hover:bg-green-50 transition-all"
                          >
                            💳 Pagos
                          </button>
                        )}

                        {/* Botón editar */}
                        {!isCancelled && (
                          <button
                            onClick={() => openEditModal(order)}
                            className="text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all"
                          >
                            ✏️ Editar
                          </button>
                        )}

                        {/* Botón cancelar */}
                        {!isCancelled && (
                          <button
                            onClick={() => openCancel(order)}
                            className="text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest border border-red-200 text-red-500 hover:bg-red-50 transition-all"
                          >
                            Cancelar
                          </button>
                        )}

                        {isCancelled && (
                          <span className="text-[10px] text-gray-400 font-medium">
                            {order.cancelledAt ? new Date(order.cancelledAt).toLocaleDateString("es-MX") : "—"}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="p-20 text-center">
                  <p className="text-gray-400 italic font-medium">
                    {search || dateFrom || dateTo ? "No se encontraron pedidos con ese filtro." : "No hay pedidos con este filtro."}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── PAGINACIÓN ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-gray-400 font-bold">
            Página {page} de {totalPages} · {filteredOrders.length} pedidos en total
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-black text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              «
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-black text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black transition ${p === page ? "bg-gray-900 text-white" : "border text-gray-600 hover:bg-gray-50"}`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-black text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-black text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL DE GESTIÓN DE PAGOS POS ── */}
      {paymentsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">Gestión de Pagos</h3>
                <p className="text-sm text-gray-400 font-mono mt-0.5">{paymentsModal.orderLabel}</p>
              </div>
              <button onClick={() => setPaymentsModal(null)} className="p-2 rounded-full hover:bg-gray-100 transition text-gray-400">
                <X size={18} />
              </button>
            </div>

            {paymentsModalLoading && (
              <div className="py-12 text-center text-gray-400">
                <p className="text-2xl mb-2">⏳</p>
                <p className="text-sm font-bold">Cargando pagos...</p>
              </div>
            )}

            {paymentsModalData && (
              <>
                {/* Resumen de la orden */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cliente</span>
                    <span className="font-bold text-gray-900">{paymentsModalData.order.fullName || "Mostrador"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total de la orden</span>
                    <span className="font-black">${paymentsModalData.order.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pagado (en DB)</span>
                    <span className={`font-black ${paymentsModalData.order.amountPaid >= paymentsModalData.order.total ? "text-green-600" : "text-orange-600"}`}>
                      ${paymentsModalData.order.amountPaid.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {paymentsModalData.order.amountPaid < paymentsModalData.order.total && (
                    <div className="flex justify-between border-t pt-1.5 mt-1.5">
                      <span className="text-gray-500">Pendiente</span>
                      <span className="font-black text-red-600">
                        ${(paymentsModalData.order.total - paymentsModalData.order.amountPaid).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1.5 mt-1.5">
                    <span className="text-gray-500">Estado</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${paymentsModalData.order.isPaid ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                      {paymentsModalData.order.isPaid ? "✓ Pagado" : "Pendiente"}
                    </span>
                  </div>

                  {/* Alerta de inconsistencia */}
                  {paymentsModalData.payments.length === 0 && paymentsModalData.order.amountPaid > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">
                      <p className="text-xs font-bold text-amber-700">
                        ⚠ El campo "Pagado" tiene un valor pero no hay abonos registrados en la base de datos. Usa ⟳ Recalcular para corregirlo.
                      </p>
                    </div>
                  )}
                </div>

                {/* Historial de abonos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Abonos registrados ({paymentsModalData.payments.length})
                    </p>
                    <button
                      onClick={handlePmRecalculate}
                      disabled={pmRecalculating}
                      className="text-[10px] font-black px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                      {pmRecalculating ? "Calculando..." : "⟳ Recalcular desde DB"}
                    </button>
                  </div>

                  {paymentsModalData.payments.length === 0 ? (
                    <div className="py-6 text-center text-gray-400 border-2 border-dashed rounded-2xl">
                      <p className="text-sm font-bold">Sin abonos registrados</p>
                      <p className="text-xs mt-1">Usa ⟳ Recalcular para sincronizar el saldo.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {paymentsModalData.payments.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between gap-3 bg-green-50 rounded-xl px-4 py-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-green-800 text-sm">
                                ${Number(p.amount).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                {p.paymentMethod === "CASH" ? "Efectivo" : p.paymentMethod === "CARD" ? "Tarjeta" : "Transferencia"}
                              </span>
                              <span className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString("es-MX")}</span>
                            </div>
                            {p.note && <p className="text-xs text-gray-400 mt-0.5 truncate">· {p.note}</p>}
                            {p.proofUrl && (
                              <span className="mt-0.5 block">
                                📎 <S3FileLink url={p.proofUrl} label="Ver comprobante" />
                              </span>
                            )}
                          </div>
                          {/* Confirmación inline de cancelación */}
                          {pmCancelConfirm?.paymentId === p.id ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs text-red-600 font-bold">¿Cancelar?</span>
                              <button
                                onClick={handlePmCancelPayment}
                                disabled={pmCancelling}
                                className="text-[10px] font-black px-2 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50"
                              >
                                {pmCancelling ? "..." : "Sí"}
                              </button>
                              <button
                                onClick={() => setPmCancelConfirm(null)}
                                className="text-[10px] font-black px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setPmCancelConfirm({ paymentId: p.id, amount: Number(p.amount) })}
                              className="shrink-0 text-red-400 hover:text-red-600 hover:bg-red-50 w-7 h-7 rounded-full flex items-center justify-center transition font-black text-base"
                              title="Cancelar este abono"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Formulario de nuevo abono ── */}
                {!paymentsModalData.order.isPaid && (
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden">
                    {!pmAddPayment ? (
                      <button
                        onClick={() => {
                          const remaining = paymentsModalData.order.total - paymentsModalData.order.amountPaid;
                          setPmPayAmount(remaining > 0 ? remaining.toFixed(2) : "");
                          setPmPayMethod("CASH");
                          setPmPayNote("");
                          setPmAddPayment(true);
                        }}
                        className="w-full py-3 px-4 text-sm font-black text-gray-500 hover:bg-gray-50 transition flex items-center justify-center gap-2"
                      >
                        <span className="text-lg">+</span> Registrar Abono
                      </button>
                    ) : (
                      <div className="p-4 space-y-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nuevo Abono</p>

                        {/* Monto */}
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Monto</label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={pmPayAmount}
                            onChange={e => setPmPayAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-black focus:outline-none focus:border-gray-400"
                          />
                        </div>

                        {/* Método de pago */}
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Método de pago</label>
                          <div className="flex gap-2">
                            {(["CASH", "CARD", "TRANSFER"] as const).map(m => (
                              <button
                                key={m}
                                onClick={() => setPmPayMethod(m)}
                                className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition ${
                                  pmPayMethod === m
                                    ? "bg-gray-900 text-white border-gray-900"
                                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                                }`}
                              >
                                {m === "CASH" ? "Efectivo" : m === "CARD" ? "Tarjeta" : "Transfer."}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Nota */}
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Nota (opcional)</label>
                          <input
                            type="text"
                            value={pmPayNote}
                            onChange={e => setPmPayNote(e.target.value)}
                            placeholder="Ej: Transferencia BBVA 12:30pm"
                            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                          />
                        </div>

                        {/* Comprobante (solo si método es CARD o TRANSFER) */}
                        {(pmPayMethod === "CARD" || pmPayMethod === "TRANSFER") && (
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Comprobante (PDF o imagen)</label>
                            {pmPayProofUrl ? (
                              <div className="flex items-center gap-2 bg-white border-2 border-green-200 rounded-xl px-3 py-2">
                                <span className="text-green-600 text-sm">✓</span>
                                <span className="flex-1 truncate">
                                  <S3FileLink url={pmPayProofUrl} label="Ver comprobante" />
                                </span>
                                <button onClick={() => setPmPayProofUrl("")} className="text-gray-400 hover:text-red-500 text-lg leading-none shrink-0">×</button>
                              </div>
                            ) : (
                              <label className={`flex items-center gap-2 border-2 border-dashed rounded-xl px-3 py-2.5 cursor-pointer transition ${pmProofUploading ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-blue-300 bg-white"}`}>
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                                  className="hidden"
                                  disabled={pmProofUploading}
                                  onChange={async e => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setPmProofUploading(true);
                                    try {
                                      const url = await uploadFileToS3(file, "comprobantes");
                                      setPmPayProofUrl(url);
                                      toast.success("Comprobante subido correctamente");
                                    } catch (err: any) {
                                      toast.error(err.message || "Error al subir comprobante");
                                    } finally {
                                      setPmProofUploading(false);
                                    }
                                  }}
                                />
                                <span className="text-gray-400 text-base">{pmProofUploading ? "⏳" : "📎"}</span>
                                <span className="text-xs text-gray-500 font-bold">
                                  {pmProofUploading ? "Subiendo..." : "Adjuntar comprobante"}
                                </span>
                              </label>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={handlePmRegisterPayment}
                            disabled={pmPaying}
                            className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-black hover:bg-gray-700 transition disabled:opacity-50"
                          >
                            {pmPaying ? "Registrando..." : "Confirmar Abono"}
                          </button>
                          <button
                            onClick={() => setPmAddPayment(false)}
                            disabled={pmPaying}
                            className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-black text-gray-500 hover:bg-gray-50 transition disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setPaymentsModal(null)}
                  className="w-full py-3 rounded-2xl border-2 border-gray-200 font-black text-gray-500 hover:bg-gray-50 transition"
                >
                  Cerrar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL DE EDICIÓN DE ORDEN ── */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">Editar Orden</h3>
                <p className="text-sm text-gray-400 font-mono mt-0.5">
                  {editModal.folio ? `#${editModal.folio}` : `#${editModal.id.slice(-6).toUpperCase()}`}
                </p>
              </div>
              <button onClick={() => setEditModal(null)} className="p-2 rounded-full hover:bg-gray-100 transition text-gray-400">
                <X size={18} />
              </button>
            </div>

            {/* Campos editables */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Datos del cliente</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Nombre</label>
                  <input
                    type="text"
                    value={editForm.fullName || ""}
                    onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={editForm.email || ""}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Teléfono</label>
                  <input
                    type="tel"
                    value={editForm.phone || ""}
                    onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Notas</label>
                <textarea
                  value={editForm.notes || ""}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Ej: Entregar entre 2-4pm, sin azúcar..."
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none"
                />
              </div>

              {/* Método de pago */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Método de pago</label>
                <div className="flex gap-2">
                  {(["CASH", "CARD", "TRANSFER"] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setEditForm(f => ({ ...f, paymentMethod: m }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition ${
                        editForm.paymentMethod === m
                          ? "bg-gray-900 text-white border-gray-900"
                          : "border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {m === "CASH" ? "Efectivo" : m === "CARD" ? "Tarjeta" : "Transfer."}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requiere factura */}
              <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                <div>
                  <p className="text-sm font-black text-gray-800">Requiere factura</p>
                  <p className="text-xs text-gray-400">Marcar si el cliente solicitó factura</p>
                </div>
                <button
                  onClick={() => setEditForm(f => ({ ...f, requiresInvoice: !f.requiresInvoice }))}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    editForm.requiresInvoice ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    editForm.requiresInvoice ? "translate-x-6" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {/* Datos de factura (visible solo si requiresInvoice) */}
              {editForm.requiresInvoice && (
                <div className="border-2 border-blue-100 bg-blue-50/50 rounded-2xl p-4 space-y-3">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Datos de Factura</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block"># Factura</label>
                      <input
                        type="text"
                        value={editForm.invoiceNumber || ""}
                        onChange={e => setEditForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                        placeholder="Ej: FAC-2024-001"
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">Fecha de factura</label>
                      <input
                        type="date"
                        value={editForm.invoiceDate || ""}
                        onChange={e => setEditForm(f => ({ ...f, invoiceDate: e.target.value }))}
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Archivo de factura (PDF/XML)</label>
                    {editForm.invoiceUrl ? (
                      <div className="flex items-center gap-2 bg-white border-2 border-green-200 rounded-xl px-3 py-2">
                        <span className="text-green-600 text-sm">✓</span>
                        <span className="flex-1 truncate">
                          <S3FileLink url={editForm.invoiceUrl} label="Ver factura subida" />
                        </span>
                        <button
                          onClick={() => setEditForm(f => ({ ...f, invoiceUrl: "" }))}
                          className="text-gray-400 hover:text-red-500 text-lg leading-none shrink-0"
                        >×</button>
                      </div>
                    ) : (
                      <label className={`flex items-center gap-2 border-2 border-dashed rounded-xl px-3 py-2.5 cursor-pointer transition ${invoiceUploading ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-blue-300 bg-white"}`}>
                        <input
                          type="file"
                          accept=".pdf,.xml,application/pdf,text/xml,application/xml"
                          className="hidden"
                          disabled={invoiceUploading}
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setInvoiceUploading(true);
                            try {
                              const url = await uploadFileToS3(file, "facturas");
                              setEditForm(f => ({ ...f, invoiceUrl: url }));
                              toast.success("Factura subida correctamente");
                            } catch (err: any) {
                              toast.error(err.message || "Error al subir factura");
                            } finally {
                              setInvoiceUploading(false);
                            }
                          }}
                        />
                        <span className="text-gray-400 text-base">{invoiceUploading ? "⏳" : "📎"}</span>
                        <span className="text-xs text-gray-500 font-bold">
                          {invoiceUploading ? "Subiendo..." : "Seleccionar PDF o XML"}
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Botón guardar */}
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="flex-1 bg-gray-900 text-white py-3 rounded-2xl font-black hover:bg-gray-700 transition disabled:opacity-50"
              >
                {editSaving ? "Guardando..." : "Guardar Cambios"}
              </button>
              <button
                onClick={() => setEditModal(null)}
                className="px-5 py-3 rounded-2xl border-2 border-gray-200 font-black text-gray-500 hover:bg-gray-50 transition"
              >
                Cerrar
              </button>
            </div>

            {/* Historial de cambios */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Historial de cambios ({editEdits.length})
              </p>

              {editLoading && (
                <div className="py-4 text-center text-gray-400">
                  <p className="text-sm font-bold">Cargando historial...</p>
                </div>
              )}

              {!editLoading && editEdits.length === 0 && (
                <div className="py-4 text-center text-gray-400 border-2 border-dashed rounded-2xl">
                  <p className="text-sm font-bold">Sin modificaciones previas</p>
                </div>
              )}

              {!editLoading && editEdits.map((edit: any) => {
                const fieldLabels: Record<string, string> = {
                  fullName: "Nombre",
                  email: "Email",
                  phone: "Teléfono",
                  notes: "Notas",
                  requiresInvoice: "Requiere factura",
                  paymentMethod: "Método de pago",
                  invoiceNumber: "# Factura",
                  invoiceDate: "Fecha factura",
                  invoiceUrl: "Archivo factura",
                };
                const methodLabel = (v: string | boolean | null) => {
                  if (typeof v === "boolean") return v ? "Sí" : "No";
                  if (v === "CASH") return "Efectivo";
                  if (v === "CARD") return "Tarjeta";
                  if (v === "TRANSFER") return "Transferencia";
                  return v ?? "—";
                };
                return (
                  <div key={edit.id} className="bg-gray-50 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-black text-gray-700">{edit.changedBy}</span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(edit.changedAt).toLocaleString("es-MX", {
                          year: "numeric", month: "2-digit", day: "2-digit",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(edit.changes as Record<string, { old: any; new: any }>).map(([field, diff]) => (
                        <div key={field} className="flex items-start gap-2 text-xs">
                          <span className="font-bold text-gray-500 min-w-[90px] shrink-0">{fieldLabels[field] ?? field}:</span>
                          <span className="text-red-500 line-through max-w-[120px] truncate" title={String(diff.old)}>
                            {methodLabel(diff.old)}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-700 font-bold max-w-[120px] truncate" title={String(diff.new)}>
                            {methodLabel(diff.new)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL DE CANCELACIÓN ── */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">

            {cancelStep === "confirm" && (
              <>
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center text-2xl">🚫</div>
                  <h3 className="text-xl font-black text-gray-800">¿Cancelar esta orden?</h3>
                  <p className="text-sm text-gray-500">
                    Orden <span className="font-black text-gray-800">#{cancelTarget.id.slice(-6).toUpperCase()}</span>
                    {" — "}{cancelTarget.fullName || "Sin nombre"}
                  </p>
                  <p className="font-black text-gray-900">${Number(cancelTarget.total).toLocaleString("es-MX")}</p>
                </div>
                <div className="space-y-2">
                  <button onClick={() => setCancelStep("stock")} className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-2xl font-black uppercase transition-all active:scale-95">
                    Sí, cancelar orden
                  </button>
                  <button onClick={closeCancel} className="w-full py-3 text-sm text-gray-400 font-bold hover:text-gray-700">
                    Volver
                  </button>
                </div>
              </>
            )}

            {cancelStep === "stock" && (
              <>
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-2xl">📦</div>
                  <h3 className="text-xl font-black text-gray-800">¿Regresar inventario?</h3>
                  <p className="text-sm text-gray-500">¿Deseas devolver los productos de esta orden al inventario de la sucursal?</p>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => { setReturnStock(true); setCancelStep("replacement"); }}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-2xl font-black transition-all active:scale-95"
                  >
                    ✅ Sí, regresar al inventario
                  </button>
                  <button
                    onClick={() => { setReturnStock(false); setCancelStep("replacement"); }}
                    className="w-full border-2 border-gray-200 py-3 rounded-2xl font-black text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    ❌ No, mantener inventario
                  </button>
                </div>
              </>
            )}

            {cancelStep === "replacement" && (
              <>
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-2xl">🔄</div>
                  <h3 className="text-xl font-black text-gray-800">¿Crear nota de venta?</h3>
                  <p className="text-sm text-gray-500">¿Deseas generar una nueva orden vinculada a esta cancelación para dar seguimiento?</p>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => { setDoReplacement(true); setCancelStep("note"); }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-black transition-all active:scale-95"
                  >
                    ✅ Sí, crear nota de reemplazo
                  </button>
                  <button
                    onClick={() => { setDoReplacement(false); setCancelStep("note"); }}
                    className="w-full border-2 border-gray-200 py-3 rounded-2xl font-black text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    ❌ No, solo cancelar
                  </button>
                </div>
              </>
            )}

            {cancelStep === "note" && (
              <>
                <div className="space-y-3">
                  <div className="text-center space-y-1">
                    <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-2xl">📝</div>
                    <h3 className="text-xl font-black text-gray-800">Motivo (opcional)</h3>
                  </div>
                  <textarea
                    value={cancelNote}
                    onChange={e => setCancelNote(e.target.value)}
                    placeholder="Ej: Cliente solicitó devolución, error en pedido..."
                    rows={3}
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 resize-none"
                  />
                  <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-600 space-y-1">
                    <p>• Regresar inventario: <span className="font-black">{returnStock ? "Sí" : "No"}</span></p>
                    <p>• Nota de reemplazo: <span className="font-black">{doReplacement ? "Sí" : "No"}</span></p>
                  </div>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={executeCancel}
                    disabled={cancelLoading}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-2xl font-black uppercase transition-all active:scale-95 disabled:opacity-50"
                  >
                    {cancelLoading ? "Procesando..." : "Confirmar Cancelación"}
                  </button>
                  <button onClick={closeCancel} className="w-full py-3 text-sm text-gray-400 font-bold hover:text-gray-700">
                    Volver
                  </button>
                </div>
              </>
            )}

            {cancelStep === "done" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center text-3xl">✅</div>
                <h3 className="text-xl font-black text-gray-800">Cancelación completada</h3>
                {doReplacement && (
                  <p className="text-sm text-blue-600 font-bold bg-blue-50 rounded-2xl px-4 py-3">
                    Se generó una nota de reemplazo vinculada (PENDING) para dar seguimiento.
                  </p>
                )}
                {returnStock && (
                  <p className="text-sm text-amber-600 font-bold bg-amber-50 rounded-2xl px-4 py-3">
                    El inventario fue actualizado correctamente.
                  </p>
                )}
                <button onClick={closeCancel} className="w-full bg-gray-900 text-white py-3 rounded-2xl font-black uppercase transition-all active:scale-95">
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}


// =====================================================================
// TAB: GESTIÓN DE USUARIOS (STAFF)
// =====================================================================
function TabUsuarios({ users, currentUserRole }: { users: any[]; currentUserRole?: string }) {
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinStatus, setPinStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [pinMsg, setPinMsg] = useState("");

  const handleSavePin = async () => {
    if (pin.length < 4) { setPinMsg("El PIN debe tener al menos 4 caracteres."); setPinStatus("error"); return; }
    if (pin !== pinConfirm) { setPinMsg("Los PINs no coinciden."); setPinStatus("error"); return; }
    setPinStatus("saving");
    const res = await setInventoryPin(pin);
    if ((res as any).error) { setPinMsg((res as any).error); setPinStatus("error"); }
    else { setPinMsg("PIN guardado correctamente."); setPinStatus("ok"); setPin(""); setPinConfirm(""); }
  };

  if (!Array.isArray(users)) {
    return (
      <section className="space-y-6">
        <h2 className="text-2xl font-black">Gestión de Staff</h2>
        <div className="p-10 border-2 border-dashed rounded-3xl text-center text-gray-400">
          Error al cargar usuarios. Por favor, recarga la página.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
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

      {/* PIN de ajuste de inventario */}
      {currentUserRole === "admin" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-md">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 text-lg">🔐</div>
            <div>
              <h3 className="font-bold text-gray-900">PIN de ajuste de inventario</h3>
              <p className="text-xs text-gray-400 mt-0.5">Requerido cuando un no-admin registra movimientos</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Nuevo PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pin}
                onChange={e => { setPin(e.target.value); setPinStatus("idle"); }}
                placeholder="Mínimo 4 dígitos"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 tracking-widest"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Confirmar PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pinConfirm}
                onChange={e => { setPinConfirm(e.target.value); setPinStatus("idle"); }}
                placeholder="Repite el PIN"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 tracking-widest"
              />
            </div>

            {pinMsg && (
              <p className={`text-xs font-bold ${pinStatus === "ok" ? "text-green-600" : "text-red-500"}`}>
                {pinMsg}
              </p>
            )}

            <button
              onClick={handleSavePin}
              disabled={pinStatus === "saving"}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg text-sm transition disabled:opacity-50"
            >
              {pinStatus === "saving" ? "Guardando..." : "Guardar PIN"}
            </button>

            <p className="text-[11px] text-gray-400">
              Los administradores no necesitan ingresar el PIN al hacer ajustes.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

// =====================================================================
// TAB: CLIENTES (BASE DE DATOS LOCAL)
// =====================================================================
const MONTH_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function TabClientes({ clients, orders = [], giros = [], unpaidPosOrders = [] }: { clients: any[]; orders?: any[]; giros?: any[]; unpaidPosOrders?: any[] }) {
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [view, setView] = useState<"clientes" | "deudores">("clientes");
  const [localUnpaidOrders, setLocalUnpaidOrders] = useState<any[]>(unpaidPosOrders);
  const [expandedDebtorId, setExpandedDebtorId] = useState<string | null>(null);
  const [payModal, setPayModal] = useState<{ order: any; client: any } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payNote, setPayNote] = useState("");
  const [paying, setPaying] = useState(false);
  const [cancelPayConfirm, setCancelPayConfirm] = useState<{ paymentId: string; orderId: string; amount: number } | null>(null);
  const [cancellingPay, setCancellingPay] = useState(false);
  const [recalculating, setRecalculating] = useState<string | null>(null);

  if (!Array.isArray(clients)) {
    return (
      <section className="space-y-6">
        <h2 className="text-2xl font-black italic">Gestión de Clientes ERP</h2>
        <div className="p-10 border-2 border-dashed rounded-3xl text-center text-gray-400">Error al cargar clientes.</div>
      </section>
    );
  }

  // ── POS orders por cliente (usable en filas expandidas) ──
  const posOrdersByClientId = useMemo(() => {
    const map = new Map<string, any[]>();
    localUnpaidOrders.forEach((o: any) => {
      if (o.clientId) {
        const arr = map.get(o.clientId) || [];
        arr.push(o);
        map.set(o.clientId, arr);
      }
    });
    return map;
  }, [localUnpaidOrders]);

  // ── Deudores ──
  const debtors = useMemo(() => {
    const today = Date.now();

    const posDebtMap = new Map<string, { total: number; remaining: number; count: number }>();
    localUnpaidOrders.forEach((o: any) => {
      if (o.clientId) {
        const cur = posDebtMap.get(o.clientId) || { total: 0, remaining: 0, count: 0 };
        const remaining = (o.total || 0) - (o.amountPaid || 0);
        posDebtMap.set(o.clientId, {
          total: cur.total + (o.total || 0),
          remaining: cur.remaining + remaining,
          count: cur.count + 1,
        });
      }
    });

    const creditDebtorIds = new Set(clients.filter((c: any) => c.creditUsed > 0).map((c: any) => c.id));
    const debtorClientIds = new Set([...creditDebtorIds, ...posDebtMap.keys()]);
    const debtorClients = clients.filter((c: any) => debtorClientIds.has(c.id));

    return debtorClients
      .map((c: any) => {
        const overdueCredits = (c.credits || []).filter((cr: any) =>
          cr.status !== "PAID" && cr.status !== "CANCELLED" && cr.dueDate && new Date(cr.dueDate).getTime() < today
        );
        const oldest = overdueCredits.reduce((min: any, cr: any) =>
          !min || new Date(cr.dueDate) < new Date(min.dueDate) ? cr : min, null);
        const daysOverdue = oldest
          ? Math.floor((today - new Date(oldest.dueDate).getTime()) / 86400000)
          : 0;
        const totalDebt = (c.credits || [])
          .filter((cr: any) => cr.status !== "PAID" && cr.status !== "CANCELLED")
          .reduce((s: number, cr: any) => s + (cr.amount || 0), 0);
        const posInfo = posDebtMap.get(c.id);
        const posDebt = posInfo?.remaining || 0;
        const posOrderCount = posInfo?.count || 0;
        return { ...c, daysOverdue, totalDebt, posDebt, posOrderCount, isOverdue: daysOverdue > 0 };
      })
      .sort((a: any, b: any) => b.daysOverdue - a.daysOverdue || b.posDebt - a.posDebt);
  }, [clients, localUnpaidOrders]);

  // ── Registrar pago ──
  const openPayModal = (order: any, client: any) => {
    const remaining = order.total - (order.amountPaid || 0);
    setPayModal({ order, client });
    setPayAmount(remaining.toFixed(2));
    setPayMethod("CASH");
    setPayNote("");
  };

  const handleRegisterPayment = async () => {
    if (!payModal) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Ingresa un monto válido"); return; }
    setPaying(true);
    const res = await registerOrderPayment(payModal.order.id, amount, payMethod, payNote || undefined);
    setPaying(false);
    if (res.success) {
      if (res.isPaidNow) {
        toast.success("¡Orden pagada completamente!");
        setLocalUnpaidOrders(prev => prev.filter((o: any) => o.id !== payModal.order.id));
      } else {
        const fmt = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2 });
        toast.success(`Abono registrado. Restante: $${fmt(res.remaining)}`);
        setLocalUnpaidOrders(prev => prev.map((o: any) =>
          o.id !== payModal.order.id ? o : {
            ...o,
            amountPaid: res.amountPaid,
            payments: [...(o.payments || []), res.payment ?? {
              id: Date.now().toString(),
              amount,
              paymentMethod: payMethod,
              note: payNote || null,
              createdAt: new Date().toISOString(),
            }],
          }
        ));
      }
      setPayModal(null);
    } else {
      toast.error(res.error || "Error al registrar pago");
    }
  };

  const handleCancelPayment = async () => {
    if (!cancelPayConfirm) return;
    setCancellingPay(true);
    const res = await cancelOrderPayment(cancelPayConfirm.paymentId, cancelPayConfirm.orderId);
    setCancellingPay(false);
    if (res.success) {
      toast.success("Pago cancelado. Saldo recalculado desde la base de datos.");
      setLocalUnpaidOrders(prev => {
        // Si la orden volvió a no-pagada, asegúrate de que esté en la lista
        return prev.map((o: any) => {
          if (o.id !== cancelPayConfirm.orderId) return o;
          return {
            ...o,
            amountPaid: res.amountPaid,
            payments: (o.payments || []).filter((p: any) => p.id !== cancelPayConfirm.paymentId),
          };
        });
      });
      setCancelPayConfirm(null);
    } else {
      toast.error(res.error || "Error al cancelar el pago");
    }
  };

  const handleRecalculate = async (orderId: string) => {
    setRecalculating(orderId);
    const res = await recalculateOrderPayment(orderId);
    setRecalculating(null);
    if (res.success) {
      toast.success(`Recalculado. Pagado: $${res.amountPaid.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`);
      setLocalUnpaidOrders(prev => {
        if (res.isPaidNow) return prev.filter((o: any) => o.id !== orderId);
        return prev.map((o: any) => o.id !== orderId ? o : { ...o, amountPaid: res.amountPaid });
      });
    } else {
      toast.error(res.error || "Error al recalcular");
    }
  };

  // ── Historial del cliente seleccionado ──
  const clientOrders = useMemo(() => {
    if (!selectedClient) return [];
    return orders
      .filter((o: any) =>
        (selectedClient.email && o.email === selectedClient.email) ||
        (selectedClient.id && o.clientId === selectedClient.id)
      )
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [selectedClient, orders]);

  const clientStats = useMemo(() => {
    if (!clientOrders.length) return null;
    const totalSpent = clientOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);
    const avgTicket = totalSpent / clientOrders.length;
    const maxOrder = Math.max(...clientOrders.map((o: any) => o.total || 0));
    const totalBottles = clientOrders.reduce((s: number, o: any) =>
      s + (o.orderItems || []).reduce((ss: number, it: any) => ss + (it.quantity || 0), 0), 0);
    return { totalSpent, avgTicket, maxOrder, totalBottles };
  }, [clientOrders]);

  // ── Gráfica mensual del cliente ──
  const clientMonthlyData = useMemo(() => {
    if (!clientOrders.length) return [];
    const map = new Map<string, number>();
    clientOrders.forEach((o: any) => {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + (o.total || 0));
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => {
        const [yr, mo] = key.split("-");
        return { name: `${MONTH_SHORT[Number(mo) - 1]} ${yr.slice(2)}`, total: Math.round(total) };
      });
  }, [clientOrders]);

  return (
    <section className="space-y-6">
      {/* Header + toggle de vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black italic">Gestión de Clientes ERP</h2>
          <p className="text-sm text-gray-400 mt-0.5">RFC, clasificación, crédito y descuentos.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setView("clientes")}
            className={`px-4 py-2 text-[11px] font-bold uppercase rounded-lg transition-all ${view === "clientes" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Todos los clientes ({clients.length})
          </button>
          <button
            onClick={() => setView("deudores")}
            className={`px-4 py-2 text-[11px] font-bold uppercase rounded-lg transition-all flex items-center gap-1.5 ${view === "deudores" ? "bg-white text-red-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Deudores
            {debtors.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${view === "deudores" ? "bg-red-100 text-red-700" : "bg-gray-200 text-gray-600"}`}>
                {debtors.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Mini-modal: confirmar cancelación de abono ── */}
      {cancelPayConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-100 flex items-center justify-center text-2xl">🗑️</div>
              <h3 className="text-lg font-black text-gray-900">¿Cancelar este abono?</h3>
              <p className="text-sm text-gray-500">
                Se eliminará el pago de{" "}
                <span className="font-black text-gray-900">
                  ${cancelPayConfirm.amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>{" "}
                y el saldo se recalculará desde la base de datos.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelPayConfirm(null)}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-black text-gray-500 hover:bg-gray-50 transition"
              >
                No, volver
              </button>
              <button
                onClick={handleCancelPayment}
                disabled={cancellingPay}
                className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black transition active:scale-95 disabled:opacity-50"
              >
                {cancellingPay ? "Cancelando..." : "Sí, cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de pago ── */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">Registrar Pago</h3>
                <p className="text-sm text-gray-400 mt-0.5">{payModal.client.fullName}</p>
              </div>
              <button onClick={() => setPayModal(null)} className="p-2 rounded-full hover:bg-gray-100 transition text-gray-400">
                <X size={18} />
              </button>
            </div>

            {/* Resumen de la orden */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-1 text-sm">
              {payModal.order.folio && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Folio</span>
                  <span className="font-mono font-black text-blue-600">{payModal.order.folio}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Total de la orden</span>
                <span className="font-black">${payModal.order.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
              {payModal.order.amountPaid > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Ya pagado</span>
                  <span className="font-black">${payModal.order.amountPaid.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-orange-700 font-black border-t pt-1 mt-1">
                <span>Saldo pendiente</span>
                <span>${(payModal.order.total - (payModal.order.amountPaid || 0)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Historial de abonos previos */}
            {(payModal.order.payments || []).length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Abonos anteriores</p>
                {payModal.order.payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-xs bg-green-50 rounded-xl px-3 py-2">
                    <div>
                      <span className="font-bold text-green-800">${Number(p.amount).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                      <span className="text-green-600 ml-2">{p.paymentMethod === "CASH" ? "Efectivo" : p.paymentMethod === "CARD" ? "Tarjeta" : "Transferencia"}</span>
                      {p.note && <span className="text-gray-400 ml-2">· {p.note}</span>}
                    </div>
                    <span className="text-gray-400">{new Date(p.createdAt).toLocaleDateString("es-MX")}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Formulario */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Monto a registrar</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-2xl font-black text-gray-900 focus:outline-none focus:border-gray-400 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Método de pago</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl font-bold text-sm text-gray-800 focus:outline-none focus:border-gray-400 transition bg-white"
                >
                  <option value="CASH">💵 Efectivo</option>
                  <option value="CARD">💳 Tarjeta</option>
                  <option value="TRANSFER">🏦 Transferencia</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Nota (opcional)</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  placeholder="Ej: Abono con efectivo, cheque #123..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm text-gray-800 focus:outline-none focus:border-gray-400 transition"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPayModal(null)}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-black text-gray-500 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterPayment}
                disabled={paying}
                className="flex-1 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black transition active:scale-95 disabled:opacity-50"
              >
                {paying ? "Registrando..." : "Registrar Pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Vista: Deudores ── */}
      {view === "deudores" && (
        <div className="space-y-4">
          {debtors.length === 0 ? (
            <div className="p-12 border-2 border-dashed rounded-3xl text-center text-gray-400">
              <p className="font-bold text-lg">Sin deudores activos</p>
              <p className="text-sm mt-1">Ningún cliente tiene crédito pendiente ni ventas POS sin pagar.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-red-50 flex items-center gap-2">
                <span className="text-red-600 font-black text-sm">{debtors.length} cliente{debtors.length !== 1 ? "s" : ""} con deuda activa</span>
                <span className="text-red-400 text-xs">· clic para ver detalle de ventas</span>
              </div>
              <div className="divide-y">
                {debtors.map((c: any) => {
                  const isExpanded = expandedDebtorId === c.id;
                  const clientPosOrders = posOrdersByClientId.get(c.id) || [];
                  return (
                    <div key={c.id}>
                      {/* Fila principal */}
                      <div
                        className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setExpandedDebtorId(isExpanded ? null : c.id)}
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate">{c.fullName}</p>
                          <p className="text-xs text-gray-400 truncate">{c.email}</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Crédito</p>
                          {c.totalDebt > 0 ? (
                            <p className="font-black text-sm text-red-600">${c.totalDebt.toLocaleString("es-MX", { minimumFractionDigits: 0 })}</p>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400 font-bold uppercase">POS pendiente</p>
                          {c.posDebt > 0 ? (
                            <div>
                              <p className="font-black text-sm text-orange-600">${c.posDebt.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                              <p className="text-[10px] text-gray-400">{c.posOrderCount} venta{c.posOrderCount !== 1 ? "s" : ""}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </div>
                        <div className="text-right hidden md:block">
                          {c.daysOverdue > 0 ? (
                            <span className="font-black text-sm text-red-600">{c.daysOverdue}d</span>
                          ) : (
                            <span className="text-xs text-green-600 font-bold">—</span>
                          )}
                        </div>
                        <div>
                          {c.daysOverdue > 30 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-red-100 text-red-700 border border-red-200">Crítico</span>
                          ) : c.daysOverdue > 0 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-amber-100 text-amber-700 border border-amber-200">Atrasado</span>
                          ) : c.posDebt > 0 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-orange-100 text-orange-700 border border-orange-200 whitespace-nowrap">POS sin pagar</span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-green-50 text-green-700 border border-green-200">Al corriente</span>
                          )}
                        </div>
                        <div className="text-gray-400 text-sm">{isExpanded ? "▲" : "▼"}</div>
                      </div>

                      {/* Detalle expandido: órdenes POS sin pagar */}
                      {isExpanded && clientPosOrders.length > 0 && (
                        <div className="bg-orange-50 border-t border-orange-100 px-5 py-4">
                          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3">
                            Ventas POS pendientes de pago
                          </p>
                          <div className="space-y-3">
                            {clientPosOrders.map((order: any) => {
                              const remaining = order.total - (order.amountPaid || 0);
                              const pct = order.total > 0 ? ((order.amountPaid || 0) / order.total) * 100 : 0;
                              const payments: any[] = order.payments || [];
                              return (
                                <div key={order.id} className="bg-white rounded-2xl border border-orange-100 p-4 space-y-3">
                                  {/* Cabecera de la orden */}
                                  <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {order.folio && (
                                          <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{order.folio}</span>
                                        )}
                                        <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString("es-MX")}</span>
                                      </div>
                                      <div className="flex items-center gap-4 mt-1.5 text-sm flex-wrap">
                                        <span className="text-gray-500">Total: <span className="font-black text-gray-900">${order.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span></span>
                                        {order.amountPaid > 0 && (
                                          <span className="text-green-600">Abonado: <span className="font-black">${order.amountPaid.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span></span>
                                        )}
                                        <span className="text-orange-700 font-black">Pendiente: ${remaining.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                                      </div>
                                      {order.amountPaid > 0 && (
                                        <div className="mt-2 h-1.5 bg-orange-100 rounded-full overflow-hidden w-full max-w-xs">
                                          <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                      <button
                                        onClick={() => handleRecalculate(order.id)}
                                        disabled={recalculating === order.id}
                                        title="Recalcular saldo desde la base de datos"
                                        className="text-[10px] font-black px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-50"
                                      >
                                        {recalculating === order.id ? "..." : "⟳ Recalcular"}
                                      </button>
                                      <button
                                        onClick={() => openPayModal(order, c)}
                                        className="text-xs font-black px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white transition active:scale-95"
                                      >
                                        + Registrar Pago
                                      </button>
                                    </div>
                                  </div>

                                  {/* Historial de abonos */}
                                  {payments.length > 0 && (
                                    <div className="border-t border-orange-50 pt-2 space-y-1">
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Abonos registrados</p>
                                      {payments.map((p: any) => (
                                        <div key={p.id} className="flex items-center justify-between gap-2 text-xs bg-green-50 rounded-xl px-3 py-2">
                                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                                            <span className="font-black text-green-800">${Number(p.amount).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                                            <span className="text-green-600 bg-green-100 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                              {p.paymentMethod === "CASH" ? "Efectivo" : p.paymentMethod === "CARD" ? "Tarjeta" : "Transferencia"}
                                            </span>
                                            {p.note && <span className="text-gray-400 truncate">· {p.note}</span>}
                                            <span className="text-gray-400">{new Date(p.createdAt).toLocaleDateString("es-MX")}</span>
                                          </div>
                                          <button
                                            onClick={() => setCancelPayConfirm({ paymentId: p.id, orderId: order.id, amount: Number(p.amount) })}
                                            title="Cancelar este abono"
                                            className="shrink-0 text-red-400 hover:text-red-600 hover:bg-red-50 w-6 h-6 rounded-full flex items-center justify-center transition font-black text-sm"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {payments.length === 0 && order.amountPaid > 0 && (
                                    <div className="border-t border-orange-50 pt-2">
                                      <p className="text-[10px] text-amber-600 font-bold">
                                        ⚠ El saldo registrado (${order.amountPaid.toLocaleString("es-MX", { minimumFractionDigits: 2 })}) no tiene abonos en la base de datos.{" "}
                                        <button onClick={() => handleRecalculate(order.id)} className="underline hover:text-amber-800">
                                          Haz clic en ⟳ Recalcular para corregirlo.
                                        </button>
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {isExpanded && clientPosOrders.length === 0 && c.posDebt === 0 && (
                        <div className="bg-gray-50 border-t px-5 py-3 text-xs text-gray-400">
                          Este cliente solo tiene deuda por créditos — gestionar desde el módulo de créditos.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Vista: Todos los clientes ── */}
      {view === "clientes" && (
        <div className={`grid gap-6 transition-all ${selectedClient ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
          {/* Tabla */}
          <div className="min-w-0">
            <ClientsTable
              clients={clients}
              total={clients.length}
              giros={giros}
              onClientClick={(c: any) => setSelectedClient((prev: any) => prev?.id === c.id ? null : c)}
              selectedClientId={selectedClient?.id}
            />
          </div>

          {/* Panel detalle del cliente seleccionado */}
          {selectedClient && (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden h-fit">
              {/* Header */}
              <div className="px-6 py-4 bg-gray-950 text-white flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-black text-sm truncate">{selectedClient.fullName || "Sin nombre"}</p>
                  <p className="text-gray-400 text-xs truncate">{selectedClient.email}</p>
                </div>
                <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-white p-1 rounded transition shrink-0 ml-3">
                  <X size={16} />
                </button>
              </div>

              {clientStats ? (
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-2 gap-px bg-gray-100">
                    <div className="bg-white p-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total comprado</p>
                      <p className="text-xl font-black text-emerald-600 mt-0.5">${clientStats.totalSpent.toLocaleString("es-MX", { minimumFractionDigits: 0 })}</p>
                    </div>
                    <div className="bg-white p-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pedidos</p>
                      <p className="text-xl font-black text-gray-900 mt-0.5">{clientOrders.length}</p>
                    </div>
                    <div className="bg-white p-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ticket promedio</p>
                      <p className="text-xl font-black text-blue-600 mt-0.5">${clientStats.avgTicket.toLocaleString("es-MX", { minimumFractionDigits: 0 })}</p>
                    </div>
                    <div className="bg-white p-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mayor compra</p>
                      <p className="text-xl font-black text-purple-600 mt-0.5">${clientStats.maxOrder.toLocaleString("es-MX", { minimumFractionDigits: 0 })}</p>
                    </div>
                  </div>

                  {/* Gráfica de compras mes a mes */}
                  {clientMonthlyData.length >= 2 && (
                    <div className="px-5 py-4 border-b">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Compras mes a mes</p>
                      <ResponsiveContainer width="100%" height={140}>
                        <LineChart data={clientMonthlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                          <Tooltip
                            formatter={(v: any) => [`$${Number(v).toLocaleString("es-MX", { minimumFractionDigits: 0 })}`, "Compras"]}
                            contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                          />
                          <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: "#2563eb" }} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Historial de órdenes */}
                  <div className="max-h-[360px] overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3">Canal</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {clientOrders.map((o: any) => (
                          <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="text-xs font-bold text-gray-800">
                                {new Date(o.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                              </p>
                              <p className="text-[10px] text-gray-400 font-mono">#{o.id.slice(-6).toUpperCase()}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${o.channel === "POS" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`}>
                                {o.channel === "POS" ? "POS" : "Web"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-black text-sm text-gray-900">${Number(o.total).toLocaleString("es-MX", { minimumFractionDigits: 0 })}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                                o.status === "PAID" || o.status === "COMPLETED" ? "bg-green-50 text-green-700"
                                : o.status === "SHIPPED" ? "bg-blue-50 text-blue-700"
                                : "bg-gray-100 text-gray-500"
                              }`}>
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-400 font-medium">
                    Total botellas: <span className="font-black text-gray-700">{clientStats.totalBottles} uds</span>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-gray-400">
                  <ShoppingCart size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold text-sm">Sin historial de compras</p>
                  <p className="text-xs mt-1">Este cliente no tiene órdenes registradas.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
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
// TAB 1: DASHBOARD DE VENTAS — PROFESIONAL
// =====================================================================
const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MONTH_NAMES_FULL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const CHART_COLORS = {
  POS: "#7c3aed",
  Web: "#2563eb",
  total: "#15803d",
};

const currencyFormatter = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-black text-gray-700 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-bold">
          {entry.name}: ${Number(entry.value).toLocaleString("es-MX", { minimumFractionDigits: 0 })}
        </p>
      ))}
    </div>
  );
};

function TabVentas({ orders = [], allLocations = [], allSubscriptions = [], topFlavors = [], topPacks = [], totalFlavorsSold = 0, totalPacksSold = 0 }: any) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [viewMode, setViewMode] = useState<"month" | "day">("month");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  // Available years from orders
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    orders.forEach((o: any) => years.add(new Date(o.createdAt).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [orders, currentYear]);

  // Orders filtered by selected year
  const yearOrders = useMemo(() =>
    orders.filter((o: any) => new Date(o.createdAt).getFullYear() === selectedYear),
    [orders, selectedYear]
  );

  // KPIs for selected period
  const kpis = useMemo(() => {
    const base = viewMode === "day"
      ? yearOrders.filter((o: any) => new Date(o.createdAt).getMonth() === selectedMonth)
      : yearOrders;

    const revenue = base.reduce((s: number, o: any) => s + (o.total || 0), 0);
    const posRevenue = base.filter((o: any) => o.channel === "POS").reduce((s: number, o: any) => s + (o.total || 0), 0);
    const webRevenue = base.filter((o: any) => o.channel !== "POS").reduce((s: number, o: any) => s + (o.total || 0), 0);
    const count = base.length;
    const avgTicket = count > 0 ? revenue / count : 0;

    // Prev period comparison (same period last year)
    const prevYearOrders = orders.filter((o: any) => new Date(o.createdAt).getFullYear() === selectedYear - 1);
    const prevBase = viewMode === "day"
      ? prevYearOrders.filter((o: any) => new Date(o.createdAt).getMonth() === selectedMonth)
      : prevYearOrders;
    const prevRevenue = prevBase.reduce((s: number, o: any) => s + (o.total || 0), 0);
    const revGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;

    const activeSubscriptions = allSubscriptions.filter((s: any) => s.status === "active").length;

    return { revenue, posRevenue, webRevenue, count, avgTicket, revGrowth, activeSubscriptions };
  }, [yearOrders, orders, viewMode, selectedMonth, selectedYear, allSubscriptions]);

  // Monthly chart data
  const monthlyChartData = useMemo(() =>
    MONTH_NAMES.map((name, i) => {
      const mo = yearOrders.filter((o: any) => new Date(o.createdAt).getMonth() === i);
      const POS = mo.filter((o: any) => o.channel === "POS").reduce((s: number, o: any) => s + (o.total || 0), 0);
      const Web = mo.filter((o: any) => o.channel !== "POS").reduce((s: number, o: any) => s + (o.total || 0), 0);
      const pedidos = mo.length;
      return { name, POS: Math.round(POS), Web: Math.round(Web), Total: Math.round(POS + Web), pedidos };
    }),
    [yearOrders]
  );

  // Daily chart data (for selected month)
  const dailyChartData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayOrders = yearOrders.filter((o: any) => {
        const d = new Date(o.createdAt);
        return d.getMonth() === selectedMonth && d.getDate() === day;
      });
      const POS = dayOrders.filter((o: any) => o.channel === "POS").reduce((s: number, o: any) => s + (o.total || 0), 0);
      const Web = dayOrders.filter((o: any) => o.channel !== "POS").reduce((s: number, o: any) => s + (o.total || 0), 0);
      return { name: `${day}`, POS: Math.round(POS), Web: Math.round(Web), Total: Math.round(POS + Web) };
    });
  }, [yearOrders, selectedMonth, selectedYear]);

  const chartData = viewMode === "month" ? monthlyChartData : dailyChartData;

  // Recent orders (last 5)
  const recentOrders = useMemo(() =>
    [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6),
    [orders]
  );

  // Top months by revenue
  const topMonth = monthlyChartData.reduce((best, m) => m.Total > best.Total ? m : best, { name: "—", Total: 0 });

  // POS by location chart data
  const locationChartData = useMemo(() => {
    const locs = Array.isArray(allLocations) ? allLocations : [];
    return locs
      .map((loc: any) => {
        const locOrders = yearOrders.filter((o: any) => o.locationId === loc.id && o.channel === "POS");
        const revenue = locOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);
        const pedidos = locOrders.length;
        return { name: loc.name?.length > 16 ? loc.name.slice(0, 15) + "…" : loc.name, fullName: loc.name, revenue: Math.round(revenue), pedidos };
      })
      .filter((d: any) => d.revenue > 0 || d.pedidos > 0)
      .sort((a: any, b: any) => b.revenue - a.revenue);
  }, [yearOrders, allLocations]);

  // Top 10 customers
  const topCustomers = useMemo(() => {
    const map = new Map<string, { name: string; email: string; totalSpent: number; orderCount: number; maxSingleOrder: number; totalBottles: number }>();
    orders.forEach((o: any) => {
      const key = o.email || o.clientId || "anon";
      const prev = map.get(key) || { name: o.fullName || o.email || "Sin nombre", email: o.email || "", totalSpent: 0, orderCount: 0, maxSingleOrder: 0, totalBottles: 0 };
      prev.totalSpent += o.total || 0;
      prev.orderCount += 1;
      prev.maxSingleOrder = Math.max(prev.maxSingleOrder, o.total || 0);
      prev.totalBottles += (o.orderItems || []).reduce((s: number, it: any) => s + (it.quantity || 0), 0);
      if (!prev.name || prev.name === key) prev.name = o.fullName || o.email || "Sin nombre";
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);
  }, [orders]);

  return (
    <section className="space-y-6">
      {/* ─── HEADER + FILTROS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Dashboard de Ventas</h2>
          <p className="text-xs text-gray-400 font-medium mt-0.5 uppercase tracking-widest">
            {viewMode === "month" ? `Año ${selectedYear} · Vista mensual` : `${MONTH_NAMES_FULL[selectedMonth]} ${selectedYear} · Vista diaria`}
          </p>
        </div>

        {/* Controles de filtro */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Año */}
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="text-xs font-bold border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-gray-300"
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Vista: Mes / Día */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${viewMode === "month" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
            >
              Por Mes
            </button>
            <button
              onClick={() => setViewMode("day")}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${viewMode === "day" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
            >
              Por Día
            </button>
          </div>

          {/* Mes (solo en vista diaria) */}
          {viewMode === "day" && (
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-bold border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-gray-300"
            >
              {MONTH_NAMES_FULL.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ─── KPI CARDS ─── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-zinc-950 text-white p-5 rounded-2xl shadow-lg col-span-2 xl:col-span-1">
          <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1">Ingresos totales</p>
          <p className="text-3xl font-black text-emerald-400">
            ${kpis.revenue.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
          </p>
          {kpis.revGrowth !== null && (
            <p className={`text-xs font-bold mt-2 flex items-center gap-1 ${kpis.revGrowth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {kpis.revGrowth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {kpis.revGrowth >= 0 ? "+" : ""}{kpis.revGrowth.toFixed(1)}% vs año anterior
            </p>
          )}
        </div>

        {/* Pedidos */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pedidos</p>
          <p className="text-3xl font-black text-gray-900">{kpis.count}</p>
          <p className="text-xs text-gray-400 mt-2 font-medium">Ticket promedio: ${kpis.avgTicket.toLocaleString("es-MX", { minimumFractionDigits: 0 })}</p>
        </div>

        {/* Canal split */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Canal de venta</p>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-purple-600">POS</span>
                <span>${kpis.posRevenue.toLocaleString("es-MX", { minimumFractionDigits: 0 })}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${kpis.revenue > 0 ? (kpis.posRevenue / kpis.revenue) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-blue-600">Web</span>
                <span>${kpis.webRevenue.toLocaleString("es-MX", { minimumFractionDigits: 0 })}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${kpis.revenue > 0 ? (kpis.webRevenue / kpis.revenue) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Suscripciones + Mes top */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Suscripciones</p>
          <p className="text-3xl font-black text-amber-600">{kpis.activeSubscriptions}</p>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            Mejor mes: <span className="font-bold text-gray-700">{topMonth.name} (${topMonth.Total.toLocaleString("es-MX")})</span>
          </p>
        </div>
      </div>

      {/* ─── GRÁFICA PRINCIPAL ─── */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-black text-gray-900">
              {viewMode === "month" ? "Ventas por mes" : `Ventas por día — ${MONTH_NAMES_FULL[selectedMonth]}`}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">POS (mostrador) vs. Web (ecommerce)</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-purple-500 inline-block" />POS</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />Web</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={currencyFormatter} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9fafb" }} />
            <Bar dataKey="POS" fill={CHART_COLORS.POS} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="Web" fill={CHART_COLORS.Web} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ─── TENDENCIA DE INGRESOS ACUMULADOS ─── */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <h3 className="font-black text-gray-900 mb-1">Tendencia de ingresos acumulados</h3>
        <p className="text-xs text-gray-400 mb-6">Crecimiento mes a mes durante {selectedYear}</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart
            data={monthlyChartData.map((m, i) => ({
              ...m,
              Acumulado: monthlyChartData.slice(0, i + 1).reduce((s, x) => s + x.Total, 0),
            }))}
            margin={{ top: 0, right: 0, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#15803d" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#15803d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={currencyFormatter} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="Acumulado" stroke="#15803d" strokeWidth={2.5} fill="url(#gradientGreen)" dot={false} activeDot={{ r: 5, fill: "#15803d" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ─── VENTAS POR SUCURSAL (POS) ─── */}
      {locationChartData.length > 0 && (
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-gray-900">Ventas por Sucursal — POS</h3>
              <p className="text-xs text-gray-400 mt-0.5">Ingresos generados en mostrador por ubicación · {selectedYear}</p>
            </div>
            <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full border border-purple-100">
              {locationChartData.length} sucursal{locationChartData.length !== 1 ? "es" : ""}
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Gráfica */}
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={locationChartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }} layout="vertical" barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tickFormatter={currencyFormatter} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="revenue" name="Ingresos" fill="#7c3aed" radius={[0, 4, 4, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
            {/* Ranking */}
            <div className="space-y-3">
              {locationChartData.map((loc: any, i: number) => {
                const maxRev = locationChartData[0]?.revenue || 1;
                const pct = (loc.revenue / maxRev) * 100;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white ${i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : "bg-gray-300"}`}>{i + 1}</span>
                        <span className="text-gray-800 truncate max-w-[140px]" title={loc.fullName}>{loc.fullName}</span>
                      </span>
                      <span className="text-gray-500 shrink-0 ml-2">${loc.revenue.toLocaleString("es-MX")} · {loc.pedidos} ped.</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── TOP 10 CLIENTES ─── */}
      {topCustomers.length > 0 && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-black text-gray-900">Top 10 Mejores Clientes</h3>
              <p className="text-xs text-gray-400 mt-0.5">Ordenados por monto acumulado total · histórico completo</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                  <th className="px-6 py-3">#</th>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3 text-right">Total Comprado</th>
                  <th className="px-6 py-3 text-right">Pedidos</th>
                  <th className="px-6 py-3 text-right">Max. Compra</th>
                  <th className="px-6 py-3 text-right">Total Botellas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topCustomers.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white ${i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-gray-200 text-gray-600"}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-bold text-sm text-gray-900 truncate max-w-[180px]">{c.name}</p>
                      <p className="text-[10px] text-blue-500 truncate max-w-[180px]">{c.email}</p>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="font-black text-sm text-emerald-700">${c.totalSpent.toLocaleString("es-MX", { minimumFractionDigits: 0 })}</span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="font-bold text-sm text-gray-700">{c.orderCount}</span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="font-bold text-sm text-gray-500">${c.maxSingleOrder.toLocaleString("es-MX", { minimumFractionDigits: 0 })}</span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="font-bold text-sm text-purple-700">{c.totalBottles} uds</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TOP PRODUCTOS + ÓRDENES RECIENTES ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top Sabores */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h3 className="font-black text-gray-900 mb-5 text-sm uppercase tracking-widest">Top Sabores</h3>
          <div className="space-y-3">
            {topFlavors.length > 0 ? topFlavors.slice(0, 6).map((f: any, idx: number) => {
              const pct = totalFlavorsSold > 0 ? (f.count / totalFlavorsSold) * 100 : 0;
              return (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-gray-700 truncate mr-2">{idx + 1}. {f.name}</span>
                    <span className="text-gray-400 shrink-0">{f.count} uds</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `hsl(${220 + idx * 20}, 70%, ${55 - idx * 5}%)` }} />
                  </div>
                </div>
              );
            }) : (
              <p className="text-gray-400 text-sm italic text-center py-4">Sin ventas registradas.</p>
            )}
          </div>
        </div>

        {/* Top Packs */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h3 className="font-black text-gray-900 mb-5 text-sm uppercase tracking-widest">Top Packs</h3>
          <div className="space-y-3">
            {topPacks.length > 0 ? topPacks.slice(0, 6).map((p: any, idx: number) => {
              const pct = totalPacksSold > 0 ? (p.count / totalPacksSold) * 100 : 0;
              return (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-gray-700 truncate mr-2">{idx + 1}. {p.name}</span>
                    <span className="text-gray-400 shrink-0">{p.count} uds</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `hsl(${280 + idx * 15}, 65%, ${50 - idx * 4}%)` }} />
                  </div>
                </div>
              );
            }) : (
              <p className="text-gray-400 text-sm italic text-center py-4">Sin ventas registradas.</p>
            )}
          </div>
        </div>

        {/* Órdenes recientes */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h3 className="font-black text-gray-900 mb-5 text-sm uppercase tracking-widest">Últimas Órdenes</h3>
          <div className="space-y-3">
            {recentOrders.length > 0 ? recentOrders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{o.fullName || o.email || "Sin nombre"}</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                    {new Date(o.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-gray-900">${Number(o.total).toLocaleString("es-MX")}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${o.channel === "POS" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                    {o.channel === "POS" ? "POS" : "Web"}
                  </span>
                </div>
              </div>
            )) : (
              <p className="text-gray-400 text-sm italic text-center py-4">Sin órdenes recientes.</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── TABLA RESUMEN POR MES ─── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">Resumen por Mes — {selectedYear}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                <th className="px-6 py-3">Mes</th>
                <th className="px-6 py-3 text-right">POS</th>
                <th className="px-6 py-3 text-right">Web</th>
                <th className="px-6 py-3 text-right">Total</th>
                <th className="px-6 py-3 text-right">Pedidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {monthlyChartData.map((m, i) => (
                <tr
                  key={i}
                  onClick={() => { setViewMode("day"); setSelectedMonth(i); }}
                  className="hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-3">
                    <span className="font-bold text-sm text-gray-800 group-hover:text-blue-600 transition-colors">
                      {MONTH_NAMES_FULL[i]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="text-sm font-bold text-purple-600">${m.POS.toLocaleString("es-MX")}</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="text-sm font-bold text-blue-600">${m.Web.toLocaleString("es-MX")}</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="text-sm font-black text-gray-900">${m.Total.toLocaleString("es-MX")}</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="text-sm text-gray-500 font-medium">{m.pedidos}</span>
                  </td>
                </tr>
              ))}
              {/* Totales */}
              <tr className="bg-gray-50 font-black">
                <td className="px-6 py-3 text-sm uppercase tracking-wider text-gray-600">Total {selectedYear}</td>
                <td className="px-6 py-3 text-right text-sm text-purple-700">${monthlyChartData.reduce((s, m) => s + m.POS, 0).toLocaleString("es-MX")}</td>
                <td className="px-6 py-3 text-right text-sm text-blue-700">${monthlyChartData.reduce((s, m) => s + m.Web, 0).toLocaleString("es-MX")}</td>
                <td className="px-6 py-3 text-right text-sm text-gray-900">${monthlyChartData.reduce((s, m) => s + m.Total, 0).toLocaleString("es-MX")}</td>
                <td className="px-6 py-3 text-right text-sm text-gray-600">{monthlyChartData.reduce((s, m) => s + m.pedidos, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// TAB 2: INVENTARIO
// =====================================================================
function TabInventario({ activeFlavors, activeLocations, allLocations, userEmail, userRole, adjustmentRequests: initialRequests }: any) {
  const isAdmin = userRole === "admin";
  const safeFlavors = Array.isArray(activeFlavors) ? activeFlavors : [];
  const safeLocations = Array.isArray(activeLocations) ? activeLocations : [];
  const safeAllLocations = Array.isArray(allLocations) ? allLocations : [];

  const [showGestion, setShowGestion] = useState(false);

  // ── Estado del formulario de ajuste ──
  const [adjForm, setAdjForm] = useState({ locationId: "", flavorId: "", type: "IN", quantity: "", reason: "" });
  const [adjStatus, setAdjStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [adjMsg, setAdjMsg] = useState("");

  // ── Estado de las solicitudes pendientes (admin) ──
  const [pendingRequests, setPendingRequests] = useState<any[]>(Array.isArray(initialRequests) ? initialRequests : []);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; note: string } | null>(null);

  const handleAdjSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjForm.locationId || !adjForm.flavorId || !adjForm.quantity || !adjForm.reason) return;
    setAdjStatus("sending");
    try {
      if (isAdmin) {
        // Admin: registra directamente
        const fd = new FormData();
        fd.append("adminEmail", userEmail || "");
        fd.append("locationId", adjForm.locationId);
        fd.append("flavorId", adjForm.flavorId);
        fd.append("type", adjForm.type);
        fd.append("quantity", adjForm.quantity);
        fd.append("reason", adjForm.reason);
        await registerMovement(fd);
        setAdjMsg("Movimiento registrado correctamente.");
      } else {
        // Non-admin: crea solicitud
        const res = await createAdjustmentRequest({
          locationId: adjForm.locationId,
          flavorId: adjForm.flavorId,
          type: adjForm.type,
          quantity: Number(adjForm.quantity),
          reason: adjForm.reason,
          requestedBy: userEmail || "desconocido",
        });
        if ((res as any).error) { setAdjStatus("error"); setAdjMsg((res as any).error); return; }
        setAdjMsg("Tu solicitud fue enviada. El administrador la revisará pronto.");
      }
      setAdjStatus("sent");
      setAdjForm({ locationId: "", flavorId: "", type: "IN", quantity: "", reason: "" });
    } catch {
      setAdjStatus("error");
      setAdjMsg("Error al procesar. Intenta de nuevo.");
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    const res = await approveAdjustmentRequest(id);
    setProcessingId(null);
    if ((res as any).error) { alert("Error: " + (res as any).error); return; }
    setPendingRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setProcessingId(rejectModal.id);
    await rejectAdjustmentRequest(rejectModal.id, rejectModal.note);
    setProcessingId(null);
    setPendingRequests(prev => prev.filter(r => r.id !== rejectModal.id));
    setRejectModal(null);
  };

  // Precalcula totales y sabores por bodega
  const locCards = useMemo(() =>
    safeLocations.map((loc: any) => ({
      ...loc,
      flavors: safeFlavors
        .map((f: any) => ({
          id: f.id,
          name: f.name,
          qty: f.locationStocks?.find((s: any) => s.locationId === loc.id)?.quantity || 0,
        }))
        .filter((f: any) => f.qty > 0),
      total: safeFlavors.reduce((sum: number, f: any) =>
        sum + (f.locationStocks?.find((s: any) => s.locationId === loc.id)?.quantity || 0), 0),
    })),
    [safeLocations, safeFlavors]
  );

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">Inventario por Bodega</h2>
          {!isAdmin && (
            <p className="text-xs text-gray-400 mt-0.5">Envía solicitudes de ajuste · el admin las aprobará remotamente</p>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowGestion(v => !v)}
            className="text-xs font-bold px-4 py-2 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition"
          >
            {showGestion ? "Ocultar gestión" : "⚙ Gestionar bodegas"}
          </button>
        )}
      </div>

      {/* Solicitudes pendientes — solo admin */}
      {isAdmin && pendingRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-black">{pendingRequests.length}</span>
            <h3 className="font-bold text-amber-900 text-sm uppercase tracking-widest">Solicitudes de ajuste pendientes</h3>
          </div>
          <div className="space-y-3">
            {pendingRequests.map((req: any) => (
              <div key={req.id} className="bg-white rounded-xl border border-amber-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${req.type === "IN" ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                      {req.type === "IN" ? "📥 ENTRADA" : "📤 SALIDA"}
                    </span>
                    <span className="text-xs font-black text-gray-900">{req.quantity} uds</span>
                    <span className="text-xs text-gray-500">·</span>
                    <span className="text-xs font-bold text-gray-700">{req.flavor?.name}</span>
                    <span className="text-xs text-gray-500">en</span>
                    <span className="text-xs font-bold text-gray-700">{req.location?.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{req.reason}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Solicitado por <span className="font-bold">{req.requestedBy}</span> · {new Date(req.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={processingId === req.id}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                  >
                    {processingId === req.id ? "..." : "✓ Aprobar"}
                  </button>
                  <button
                    onClick={() => setRejectModal({ id: req.id, note: "" })}
                    disabled={processingId === req.id}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition disabled:opacity-50"
                  >
                    ✕ Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de rechazo */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-black text-gray-900 mb-1">Rechazar solicitud</h3>
            <p className="text-sm text-gray-500 mb-4">Puedes agregar un motivo (opcional).</p>
            <textarea
              value={rejectModal.note}
              onChange={e => setRejectModal(prev => prev ? { ...prev, note: e.target.value } : null)}
              placeholder="Motivo del rechazo..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-300 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={processingId !== null}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition disabled:opacity-50"
              >
                {processingId ? "Rechazando..." : "Confirmar rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de ajuste */}
      {safeLocations.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border shadow-sm border-blue-100">
          <h3 className="font-bold text-blue-900 uppercase text-xs tracking-widest mb-4">
            {isAdmin ? "Registrar ajuste de inventario" : "Solicitar ajuste de inventario"}
          </h3>

          {adjStatus === "sent" ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                {isAdmin ? "✓" : "📨"}
              </div>
              <p className="text-sm font-bold text-green-700">{adjMsg}</p>
              <button
                onClick={() => { setAdjStatus("idle"); setAdjMsg(""); }}
                className="text-xs text-blue-600 hover:underline font-bold"
              >
                Registrar otro
              </button>
            </div>
          ) : (
            <form onSubmit={handleAdjSubmit} className="grid grid-cols-12 gap-3">
              <div className="col-span-12 md:col-span-3">
                <select
                  value={adjForm.locationId}
                  onChange={e => setAdjForm(f => ({ ...f, locationId: e.target.value }))}
                  className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold border outline-none"
                  required
                >
                  <option value="">-- Bodega --</option>
                  {safeLocations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-12 md:col-span-3">
                <select
                  value={adjForm.flavorId}
                  onChange={e => setAdjForm(f => ({ ...f, flavorId: e.target.value }))}
                  className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold border outline-none"
                  required
                >
                  <option value="">-- Producto --</option>
                  {safeFlavors.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-6 md:col-span-2">
                <select
                  value={adjForm.type}
                  onChange={e => setAdjForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold border outline-none"
                  required
                >
                  <option value="IN">📥 Entrada</option>
                  <option value="OUT">📤 Salida</option>
                </select>
              </div>
              <div className="col-span-6 md:col-span-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Cant."
                  value={adjForm.quantity}
                  onChange={e => setAdjForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold border text-center outline-none"
                  required
                />
              </div>
              <div className="col-span-12 md:col-span-7">
                <input
                  type="text"
                  placeholder="Motivo (Producción, Ajuste, Merma...)"
                  value={adjForm.reason}
                  onChange={e => setAdjForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full p-2 bg-gray-50 rounded-lg text-sm border outline-none"
                  required
                />
              </div>
              <div className="col-span-12 md:col-span-3">
                {adjStatus === "error" && (
                  <p className="text-xs text-red-500 font-bold mb-1">{adjMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={adjStatus === "sending"}
                  className={`w-full p-2 rounded-lg text-sm font-bold transition disabled:opacity-50 ${isAdmin ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"}`}
                >
                  {adjStatus === "sending" ? "Enviando..." : isAdmin ? "Registrar" : "Solicitar ajuste"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {safeLocations.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl text-sm">
          No hay bodegas activas. Usa "Gestionar bodegas" para crear una.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {locCards.map((loc: any) => (
            <div
              key={loc.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4"
            >
              {/* Encabezado */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">
                    {loc.isDefault ? "★ Principal" : "Bodega"}
                  </p>
                  <p className="font-black text-xl text-gray-900 leading-tight">{loc.name}</p>
                  {loc.address && (
                    <p className="text-xs text-gray-400 mt-0.5">{loc.address}</p>
                  )}
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-4xl font-black text-blue-600 leading-none">{loc.total}</p>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-0.5">botellas</p>
                </div>
              </div>

              {/* Separador */}
              <div className="border-t border-gray-100" />

              {/* Lista de sabores */}
              {loc.flavors.length > 0 ? (
                <div className="space-y-2">
                  {loc.flavors.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{f.name}</span>
                      <div className="flex items-center gap-2">
                        {f.qty < 10 && (
                          <span className="text-[10px] font-bold text-orange-500 uppercase">bajo</span>
                        )}
                        <span className={`text-sm font-black tabular-nums w-10 text-right ${
                          f.qty < 10 ? "text-orange-500" : "text-gray-900"
                        }`}>
                          {f.qty}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Sin existencias registradas</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Panel gestión de bodegas (colapsable) */}
      {showGestion && (
        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
          <h4 className="font-bold text-purple-800 mb-4 text-sm uppercase">Gestionar Bodegas</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-purple-600 uppercase mb-2">Nueva bodega</p>
              <form action={createLocation} className="grid grid-cols-1 gap-3">
                <input name="name" placeholder="Nombre (Ej: Bodega Campeche)" className="p-2 rounded bg-white border text-sm" required />
                <input name="address" placeholder="Dirección (Opcional)" className="p-2 rounded bg-white border text-sm" />
                <button className="bg-purple-600 text-white p-2 rounded font-bold text-sm hover:bg-purple-700">+ Crear Bodega</button>
              </form>
            </div>
            <div>
              <p className="text-xs font-bold text-purple-600 uppercase mb-2">Existentes</p>
              <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
                {safeAllLocations.map((loc: any) => {
                  const locStockCount = safeFlavors.reduce(
                    (sum: number, flavor: any) =>
                      sum + (flavor.locationStocks?.find((s: any) => s.locationId === loc.id)?.quantity || 0), 0
                  );
                  return (
                    <div key={loc.id} className={`flex flex-col gap-2 bg-white p-3 rounded-xl border shadow-sm ${loc.isArchived ? "opacity-60" : ""}`}>
                      <form action={updateLocation} className="flex flex-col gap-2">
                        <input type="hidden" name="id" value={loc.id} />
                        <div className="flex gap-2 items-center">
                          <input name="name" defaultValue={loc.name || ""} className="flex-1 text-sm font-bold border border-transparent hover:border-gray-200 focus:border-purple-400 bg-transparent focus:bg-white rounded p-1 outline-none" required />
                          {loc.isDefault && <span className="text-[10px] font-black text-yellow-600">★ Principal</span>}
                          {loc.isArchived && <span className="text-xs text-gray-400">(Inactivo)</span>}
                        </div>
                        <div className="flex gap-2">
                          <input name="address" defaultValue={loc.address || ""} placeholder="Dirección" className="w-full text-xs text-gray-500 border border-transparent hover:border-gray-200 focus:border-purple-400 bg-transparent focus:bg-white rounded p-1 outline-none" />
                          <button type="submit" className="text-[10px] bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white px-3 py-1.5 rounded-lg font-bold shrink-0 border border-purple-100">Guardar</button>
                        </div>
                      </form>
                      {!loc.isDefault && (
                        <form
                          action={toggleStatus}
                          onSubmit={(e) => {
                            const isInactivating = !loc.isArchived;
                            if (isInactivating && locStockCount > 0) {
                              e.preventDefault();
                              alert(`❌ No puedes inactivar esta bodega porque tiene ${locStockCount} botellas. Realiza un traspaso primero.`);
                              return;
                            }
                            if (!confirm("¿Estás seguro de cambiar el estado de la bodega?")) e.preventDefault();
                          }}
                          className="flex justify-end pt-2 border-t border-gray-100"
                        >
                          <input type="hidden" name="id" value={loc.id} />
                          <input type="hidden" name="model" value="location" />
                          <input type="hidden" name="currentStatus" value={String(loc.isArchived)} />
                          <button className={`text-xs px-3 py-1.5 rounded-lg font-bold ${loc.isArchived ? "text-green-600 bg-green-50 border border-green-200" : "text-red-500 bg-red-50 border border-red-100"}`}>
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
      )}
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