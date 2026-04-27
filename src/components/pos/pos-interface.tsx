"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SalesHistory } from "@/components/pos/sales-history";
import {
  Trash2, User, Package, Beer, Plus, X, ArrowLeft, ShoppingCart, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

const formatMoney = (v: number) =>
  v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "CONSIGNMENT" | "COURTESY";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; emoji: string }[] = [
  { value: "CASH",        label: "Efectivo",      emoji: "💵" },
  { value: "CARD",        label: "Tarjeta",        emoji: "💳" },
  { value: "TRANSFER",    label: "Transferencia",  emoji: "🏦" },
  { value: "CONSIGNMENT", label: "Consignación",   emoji: "📋" },
  { value: "COURTESY",    label: "Cortesía",       emoji: "🎁" },
];

export const PosInterface = ({
  locations, products, flavors, clients, recentSales, userEmail,
}: any) => {
  const router = useRouter();

  const [selectedLocation, setSelectedLocation] = useState(locations[0]?.id ?? "");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");
  const [showConfirm, setShowConfirm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [wholesaleMode, setWholesaleMode] = useState(false);
  const [showPackModal, setShowPackModal] = useState<any>(null);
  const [packSelection, setPackSelection] = useState<Record<string, number>>({});
  const [showMobileCart, setShowMobileCart] = useState(false);

  // ─── Pricing ─────────────────────────────────────────────────────────────
  const getFlavorPrice = (flavor: any) =>
    wholesaleMode && flavor.wholesalePrice && Number(flavor.wholesalePrice) > 0
      ? Number(flavor.wholesalePrice)
      : Number(flavor.price);

  const toggleWholesale = () => {
    const next = !wholesaleMode;
    setWholesaleMode(next);
    setCart(prev =>
      prev.map(item => {
        if (item.type !== "BOTTLE") return item;
        const f = flavors.find((fl: any) => fl.id === item.flavorId);
        if (!f) return item;
        const price =
          next && f.wholesalePrice && Number(f.wholesalePrice) > 0
            ? Number(f.wholesalePrice)
            : Number(f.price);
        return { ...item, price };
      })
    );
  };

  const isCourtesy = paymentMethod === "COURTESY";
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const chargedTotal = isCourtesy ? 0 : cartTotal;
  const cartItemCount = cart.reduce((a, b) => a + b.quantity, 0);

  // ─── Cart ─────────────────────────────────────────────────────────────────
  const addToCart = (item: any) => {
    setCart(prev => {
      if (item.type === "BOTTLE") {
        const exists = prev.findIndex(i => i.flavorId === item.flavorId);
        if (exists >= 0) {
          const updated = [...prev];
          updated[exists] = { ...updated[exists], quantity: updated[exists].quantity + 1 };
          return updated;
        }
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQty = (idx: number, qty: number) => {
    if (qty < 1) { setCart(prev => prev.filter((_, i) => i !== idx)); return; }
    setCart(prev => prev.map((item, i) => i === idx ? { ...item, quantity: qty } : item));
  };

  const removeItem = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx));

  const updateItemPrice = (idx: number, price: number) => {
    setCart(prev => prev.map((item, i) => i === idx ? { ...item, price } : item));
  };

  const handleAddBottle = (flavor: any) => {
    const stock = flavor.locationStocks.find((s: any) => s.locationId === selectedLocation)?.quantity ?? 0;
    const inCart = cart.find(c => c.flavorId === flavor.id)?.quantity ?? 0;
    if (stock - inCart <= 0) { toast.error("Sin stock suficiente"); return; }
    addToCart({
      id: flavor.id, flavorId: flavor.id, type: "BOTTLE",
      name: flavor.name, price: getFlavorPrice(flavor),
      composition: [{ flavorId: flavor.id, name: flavor.name, quantity: 1 }],
    });
  };

  const openPackModal = (prod: any) => {
    const init: Record<string, number> = {};
    flavors.forEach((f: any) => (init[f.id] = 0));
    setPackSelection(init);
    setShowPackModal(prod);
  };

  const confirmPack = () => {
    const total = Object.values(packSelection).reduce((a, b) => a + b, 0);
    if (total !== showPackModal.quantity) {
      toast.error(`Selecciona exactamente ${showPackModal.quantity} botellas`); return;
    }
    const composition = Object.entries(packSelection)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({ flavorId: id, name: flavors.find((f: any) => f.id === id).name, quantity: q }));
    addToCart({ ...showPackModal, id: `pack-${Date.now()}`, type: "PACK", composition });
    setShowPackModal(null);
  };

  // ─── Checkout ─────────────────────────────────────────────────────────────
  const executeCheckout = async () => {
    if (cart.length === 0) return;
    setShowConfirm(false);
    setShowMobileCart(false);
    setIsProcessing(true);

    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: selectedLocation,
          clientId: selectedClient?.id ?? null,
          fullName: selectedClient?.fullName ?? "Cliente Mostrador",
          email: selectedClient?.email ?? "",
          items: cart,
          paymentMethod,
          status: paymentMethod === "CONSIGNMENT" ? "PENDING" : "PAID",
          total: chargedTotal,
          originalTotal: cartTotal,
        }),
      });

      if (res.ok) {
        const labels: Record<PaymentMethod, string> = {
          CASH: "Venta en efectivo registrada",
          CARD: "Venta con tarjeta registrada",
          TRANSFER: "Transferencia registrada",
          CONSIGNMENT: "Consignación guardada",
          COURTESY: "Cortesía registrada",
        };
        toast.success(labels[paymentMethod]);
        setCart([]);
        setSelectedClient(null);
        setPaymentMethod("CASH");
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Error al procesar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedOption = PAYMENT_OPTIONS.find(p => p.value === paymentMethod)!;

  // ─── Ticket content (shared between desktop panel and mobile sheet) ────────
  const ticketContent = (
    <>
      {/* Client selector */}
      <div className="p-4 sm:p-5 bg-gray-50 border-b shrink-0">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-black text-gray-800">Ticket de Venta</h3>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Vaciar carrito">
              <Trash2 size={15} />
            </button>
          )}
        </div>
        <div className="bg-white p-3 rounded-2xl border-2 border-dashed border-gray-200 flex items-center gap-2">
          <div className={`p-1.5 rounded-lg shrink-0 ${selectedClient ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
            <User size={15} />
          </div>
          <select
            value={selectedClient?.id ?? ""}
            onChange={e => setSelectedClient(clients.find((c: any) => c.id === e.target.value) ?? null)}
            className="flex-1 bg-transparent outline-none font-bold text-xs text-gray-700 cursor-pointer min-w-0"
          >
            <option value="">Cliente Mostrador</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>{c.fullName}</option>
            ))}
          </select>
          {selectedClient && (
            <button onClick={() => setSelectedClient(null)} className="text-gray-300 hover:text-red-500 shrink-0">
              <X size={13} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-60 py-12">
            <Package size={52} className="mb-3" />
            <p className="font-black uppercase text-[10px] tracking-widest">Esperando productos...</p>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-gray-800 truncate">{item.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">
                      {item.type === "PACK" ? "Pack" : "Botella"}
                    </span>
                    <span className="text-[10px] text-gray-300 shrink-0">·</span>
                    <span className="text-[10px] text-gray-400 shrink-0">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={e => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                      className="w-16 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 rounded-md px-1 py-0.5 outline-none focus:border-blue-400"
                    />
                    <span className="text-[10px] text-gray-400 shrink-0">c/u</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQty(idx, item.quantity - 1)}
                    className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center font-black text-gray-700 text-sm"
                  >−</button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => updateQty(idx, parseInt(e.target.value) || 1)}
                    className="w-9 sm:w-10 text-center font-black text-sm bg-white border border-gray-200 rounded-lg py-0.5 outline-none focus:border-gray-400"
                  />
                  <button
                    onClick={() => updateQty(idx, item.quantity + 1)}
                    className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center font-black text-gray-700 text-sm"
                  >+</button>
                  <button
                    onClick={() => removeItem(idx)}
                    className="w-6 h-6 bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-lg flex items-center justify-center ml-0.5"
                  >
                    <X size={11} strokeWidth={3} />
                  </button>
                </div>
              </div>
              {item.composition && item.composition.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.composition.map((c: any, i: number) => (
                    <span key={i} className="text-[9px] bg-white px-2 py-0.5 rounded-full border text-gray-500 font-bold">
                      {c.quantity} {c.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex justify-end mt-1.5">
                <p className="font-black text-sm text-gray-900">${formatMoney(item.price * item.quantity)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Checkout panel */}
      <div className="p-4 sm:p-5 bg-white border-t space-y-3 sm:space-y-4 shrink-0">
        {/* Total */}
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Venta</p>
            {isCourtesy && cartTotal > 0 && (
              <p className="text-xs text-gray-400 line-through">${formatMoney(cartTotal)}</p>
            )}
          </div>
          <span className={`text-3xl sm:text-4xl font-black tracking-tighter ${isCourtesy ? "text-pink-500" : "text-gray-900"}`}>
            ${formatMoney(chargedTotal)}
          </span>
        </div>

        {/* Payment method */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Forma de Pago</p>
          <div className="relative">
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full p-3 pr-10 bg-gray-50 border-2 border-gray-200 rounded-2xl font-bold text-sm text-gray-800 outline-none cursor-pointer appearance-none focus:border-gray-400 transition-colors"
            >
              {PAYMENT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">▾</span>
          </div>

          {paymentMethod === "CONSIGNMENT" && (
            <p className="text-[11px] text-orange-600 font-bold bg-orange-50 px-3 py-2 rounded-xl">
              📋 Quedará como pedido pendiente de cobro
            </p>
          )}
          {paymentMethod === "COURTESY" && (
            <p className="text-[11px] text-pink-600 font-bold bg-pink-50 px-3 py-2 rounded-xl">
              🎁 Se registra la salida de inventario pero el total es $0
            </p>
          )}
        </div>

        {/* Cobrar button */}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isProcessing || cart.length === 0}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg ${
            paymentMethod === "COURTESY"    ? "bg-pink-500   text-white shadow-pink-500/20" :
            paymentMethod === "CONSIGNMENT" ? "bg-orange-500 text-white shadow-orange-500/20" :
                                              "bg-gray-900   text-white shadow-gray-900/20"
          }`}
        >
          {isProcessing ? "Procesando..." : `Cobrar · ${selectedOption.emoji} ${selectedOption.label}`}
        </button>
      </div>
    </>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ── TOP BAR ── */}
      <div className="flex bg-white border-b px-3 sm:px-4 gap-1 pt-2 items-end shrink-0">
        <div className="flex gap-1 flex-1">
          <button
            onClick={() => setActiveTab("pos")}
            className={`px-3 sm:px-6 py-2 rounded-t-xl font-black text-xs uppercase tracking-widest transition-colors ${activeTab === "pos" ? "bg-gray-900 text-white" : "text-gray-400 hover:bg-gray-100"}`}
          >
            <span className="sm:hidden">🛒</span>
            <span className="hidden sm:inline">🛒 Punto de Venta</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 sm:px-6 py-2 rounded-t-xl font-black text-xs uppercase tracking-widest transition-colors ${activeTab === "history" ? "bg-gray-900 text-white" : "text-gray-400 hover:bg-gray-100"}`}
          >
            <span className="sm:hidden">📋</span>
            <span className="hidden sm:inline">📋 Historial</span>
          </button>
        </div>
        <Link
          href="/admin"
          className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 sm:px-4 py-2 rounded-xl transition-all mb-2"
        >
          <ArrowLeft size={13} />
          <span className="hidden sm:inline">Admin</span>
        </Link>
      </div>

      {activeTab === "history" ? (
        <div className="flex-1 overflow-auto p-4">
          <SalesHistory locations={locations} />
        </div>
      ) : (
        <>
          <div className="flex flex-1 overflow-hidden">
            {/* ── LEFT: CATALOG ── */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 pb-28 lg:pb-6">
              <header className="flex flex-wrap justify-between items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-gray-800">Caja Pormucha</h1>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  {/* Wholesale toggle */}
                  <button
                    onClick={toggleWholesale}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border-2 text-xs font-black uppercase transition-all ${
                      wholesaleMode
                        ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20"
                        : "bg-white text-gray-500 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className={`w-8 sm:w-9 h-5 rounded-full relative transition-colors ${wholesaleMode ? "bg-blue-400" : "bg-gray-300"}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${wholesaleMode ? "left-[14px] sm:left-[18px]" : "left-0.5"}`} />
                    </div>
                    <span className="hidden sm:inline">{wholesaleMode ? "Mayoreo" : "Menudeo"}</span>
                    <span className="sm:hidden">{wholesaleMode ? "May" : "Men"}</span>
                  </button>

                  <select
                    value={selectedLocation}
                    onChange={e => { setCart([]); setSelectedLocation(e.target.value); }}
                    className="p-2 border rounded-xl font-black text-xs bg-white shadow-sm outline-none max-w-[130px] sm:max-w-none"
                  >
                    {locations.map((loc: any) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </header>

              {/* Bottles */}
              <section className="space-y-3">
                <h2 className="font-black uppercase text-xs text-gray-400 flex items-center gap-2">
                  <Beer size={15} /> Botellas Individuales
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {flavors.map((f: any) => {
                    const stock = f.locationStocks.find((s: any) => s.locationId === selectedLocation)?.quantity ?? 0;
                    const price = getFlavorPrice(f);
                    const hasWholesale = f.wholesalePrice && Number(f.wholesalePrice) > 0;
                    return (
                      <button
                        key={f.id}
                        onClick={() => handleAddBottle(f)}
                        disabled={stock <= 0}
                        className={`p-3 sm:p-4 rounded-3xl border-2 transition-all text-left ${
                          stock > 0
                            ? "bg-white border-transparent hover:border-blue-400 shadow-sm active:scale-95"
                            : "bg-gray-100 opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <p className="font-black text-gray-800 text-xs sm:text-sm leading-tight">{f.name}</p>
                        <p className="text-sm font-black text-gray-900 mt-1">${formatMoney(price)}</p>
                        {hasWholesale && !wholesaleMode && (
                          <p className="text-[10px] text-blue-500 font-bold">May: ${formatMoney(Number(f.wholesalePrice))}</p>
                        )}
                        <div className={`mt-2 text-[10px] font-black px-2 py-1 rounded-lg w-fit ${stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          STOCK: {stock}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Packs */}
              {products.length > 0 && (
                <section className="space-y-3">
                  <h2 className="font-black uppercase text-xs text-gray-400 flex items-center gap-2">
                    <Package size={15} /> Packs Comerciales
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {products.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => openPackModal(p)}
                        className="p-5 sm:p-6 rounded-[2rem] bg-gray-900 text-white hover:bg-black transition-all shadow-xl group text-left active:scale-95"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-black text-base sm:text-lg leading-tight">{p.name}</p>
                          <div className="bg-white/10 p-2 rounded-full group-hover:scale-110 transition-transform shrink-0">
                            <Plus size={15} />
                          </div>
                        </div>
                        <p className="text-sm font-bold text-gray-400">${formatMoney(Number(p.price))}</p>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* ── RIGHT: TICKET (desktop side panel) ── */}
            <div className="hidden lg:flex w-[390px] xl:w-[430px] bg-white border-l shadow-2xl flex-col h-full overflow-hidden">
              {ticketContent}
            </div>
          </div>

          {/* ── MOBILE FLOATING CART BAR ── */}
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t px-4 py-3 flex items-center gap-3 shadow-xl">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {cartItemCount > 0 ? `${cartItemCount} pza${cartItemCount !== 1 ? "s" : ""}` : "Carrito vacío"}
              </p>
              <p className={`text-xl font-black leading-tight ${isCourtesy ? "text-pink-500" : "text-gray-900"}`}>
                ${formatMoney(chargedTotal)}
              </p>
            </div>
            <button
              onClick={() => setShowMobileCart(true)}
              disabled={cart.length === 0}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm text-white shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                paymentMethod === "COURTESY"    ? "bg-pink-500" :
                paymentMethod === "CONSIGNMENT" ? "bg-orange-500" :
                                                  "bg-gray-900"
              }`}
            >
              <ShoppingCart size={16} />
              Ver Carrito
              {cartItemCount > 0 && (
                <span className="bg-white/20 text-white text-xs font-black px-1.5 py-0.5 rounded-full">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>

          {/* ── MOBILE CART BOTTOM SHEET ── */}
          {showMobileCart && (
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowMobileCart(false)}
            />
          )}
          <div className={[
            "lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col",
            "transition-transform duration-300 ease-out",
            "max-h-[90vh]",
            showMobileCart ? "translate-y-0" : "translate-y-full",
          ].join(" ")}>
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
            </div>
            {/* Mobile sheet header */}
            <div className="flex items-center justify-between px-5 pb-2 shrink-0">
              <span className="font-black text-gray-800 text-lg">Carrito</span>
              <button
                onClick={() => setShowMobileCart(false)}
                className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <ChevronDown size={18} />
              </button>
            </div>
            {ticketContent}
          </div>
        </>
      )}

      {/* ── CONFIRM MODAL ── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-3xl sm:text-4xl">
                {selectedOption.emoji}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-800">¿Confirmar?</h2>
              <div className="bg-gray-50 p-4 sm:p-6 rounded-3xl space-y-3 text-left">
                <Row label="Cliente" value={selectedClient?.fullName ?? "Mostrador"} />
                <Row label="Método" value={`${selectedOption.emoji} ${selectedOption.label}`} />
                <Row label="Artículos" value={`${cartItemCount} pzs`} />
                <div className="flex justify-between text-xl border-t pt-3 mt-1">
                  <span className="text-gray-800 font-black">Total</span>
                  <span className={`font-black ${isCourtesy ? "text-pink-500" : "text-gray-900"}`}>
                    ${formatMoney(chargedTotal)}
                  </span>
                </div>
                {isCourtesy && cartTotal > 0 && (
                  <p className="text-[10px] text-pink-500 text-center font-bold">
                    Valor real de mercancía: ${formatMoney(cartTotal)}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={executeCheckout}
                  className={`w-full py-4 sm:py-5 rounded-2xl font-black uppercase text-white shadow-xl active:scale-95 transition-all ${
                    paymentMethod === "COURTESY"    ? "bg-pink-500   hover:bg-pink-600" :
                    paymentMethod === "CONSIGNMENT" ? "bg-orange-500 hover:bg-orange-600" :
                                                      "bg-gray-900   hover:bg-black"
                  }`}
                >
                  Confirmar y Finalizar
                </button>
                <button onClick={() => setShowConfirm(false)} className="py-3 font-black uppercase text-xs text-gray-400 hover:text-gray-800">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PACK MODAL ── */}
      {showPackModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="bg-white rounded-t-[3rem] sm:rounded-[3rem] p-6 sm:p-10 w-full sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-gray-800">Armar Pack</h2>
              <p className="text-gray-400 font-bold uppercase text-xs mt-1">{showPackModal.name}</p>
            </div>
            <div className="bg-gray-900 p-4 sm:p-5 rounded-3xl mb-4 sm:mb-5 text-white">
              <p className="text-lg sm:text-xl font-black">
                Faltan: {showPackModal.quantity - Object.values(packSelection).reduce((a: number, b) => a + (b as number), 0)} botellas
              </p>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 pr-1 sm:pr-2">
              {flavors.map((f: any) => {
                const qty = packSelection[f.id] ?? 0;
                const stock = f.locationStocks?.find((s: any) => s.locationId === selectedLocation)?.quantity ?? 0;
                const totalSelected = Object.values(packSelection).reduce((a: number, b) => a + (b as number), 0);
                return (
                  <div
                    key={f.id}
                    className={`flex justify-between items-center p-3 sm:p-4 rounded-2xl border transition-all ${stock <= 0 ? "bg-gray-100 opacity-50" : "bg-gray-50 border-transparent"}`}
                  >
                    <div>
                      <p className="font-black text-gray-800 text-sm sm:text-base">{f.name}</p>
                      <p className={`text-[10px] font-bold ${stock <= 0 ? "text-red-500" : "text-gray-400"}`}>STOCK: {stock}</p>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <button
                        onClick={() => setPackSelection(p => ({ ...p, [f.id]: Math.max(0, qty - 1) }))}
                        className="w-8 h-8 sm:w-9 sm:h-9 bg-white rounded-2xl flex items-center justify-center font-black shadow-sm"
                      >−</button>
                      <span className="font-black text-lg sm:text-xl w-5 text-center">{qty}</span>
                      <button
                        onClick={() => {
                          if (totalSelected < showPackModal.quantity && qty < stock)
                            setPackSelection(p => ({ ...p, [f.id]: qty + 1 }));
                        }}
                        disabled={stock <= 0 || qty >= stock || totalSelected >= showPackModal.quantity}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center font-black shadow-sm ${
                          stock <= 0 || qty >= stock || totalSelected >= showPackModal.quantity
                            ? "bg-gray-200 text-gray-400"
                            : "bg-white text-blue-600"
                        }`}
                      >+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 sm:gap-4 mt-4 sm:mt-6">
              <button onClick={() => setShowPackModal(null)} className="flex-1 py-4 font-black text-gray-400 uppercase text-xs tracking-widest">
                Cancelar
              </button>
              <button
                disabled={Object.values(packSelection).reduce((a: number, b) => a + (b as number), 0) !== showPackModal.quantity}
                onClick={confirmPack}
                className="flex-[2] bg-blue-600 text-white py-4 rounded-3xl font-black uppercase tracking-widest disabled:bg-gray-200 shadow-xl"
              >
                Confirmar y Añadir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400 font-bold">{label}</span>
      <span className="text-gray-800 font-black">{value}</span>
    </div>
  );
}
