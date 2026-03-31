"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // 1. IMPORTAR ROUTER
import { processPosSale } from "@/actions/pos-sales";
import { SalesHistory } from "@/components/pos/sales-history";
import { printTicket } from "@/components/pos/ticket-receipt";
import {
  Trash2, User, Package, Beer, Plus, Minus,
  X, ClipboardList, Banknote, CreditCard
} from "lucide-react";
import { toast } from "sonner";

const formatMoney = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const PosInterface = ({ locations, products, flavors, clients, userEmail }: any) => {
  const router = useRouter(); // 2. INICIALIZAR ROUTER
  const [mounted, setMounted] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(locations[0]?.id);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");
  const [confirmPayment, setConfirmPayment] = useState<"CASH" | "CARD" | "CONSIGNMENT" | null>(null);

  const [showPackModal, setShowPackModal] = useState<any>(null);
  const [packSelection, setPackSelection] = useState<Record<string, number>>({});

  useEffect(() => { setMounted(true); }, []);

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleAddProduct = (item: any, type: "PACK" | "BOTTLE") => {
    if (type === "BOTTLE") {
      const stockEntry = item.locationStocks.find((s: any) => s.locationId === selectedLocation);
      const currentInCart = cart.find(c => c.flavorId === item.id)?.quantity || 0;

      if (!stockEntry || (stockEntry.quantity - currentInCart) <= 0) {
        toast.error("⚠️ Sin stock suficiente");
        return;
      }
      addToCart({ ...item, type, flavorId: item.id, composition: [{ flavorId: item.id, name: item.name, quantity: 1 }] });
    } else {
      const initial: Record<string, number> = {};
      flavors.forEach((f: any) => initial[f.id] = 0);
      setPackSelection(initial);
      setShowPackModal(item);
    }
  };

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing && item.type === "BOTTLE") {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const confirmPackToCart = () => {
    const totalSelected = Object.values(packSelection).reduce((a, b) => a + b, 0);
    if (totalSelected !== showPackModal.quantity) {
      toast.error(`Selecciona exactamente ${showPackModal.quantity} botellas`);
      return;
    }

    const composition = Object.entries(packSelection)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => ({
        flavorId: id,
        name: flavors.find((f: any) => f.id === id).name,
        quantity: qty
      }));

    addToCart({
      ...showPackModal,
      id: `pack-${Date.now()}`,
      type: "PACK",
      composition
    });
    setShowPackModal(null);
  };

  const executeCheckout = async () => {
    const method = confirmPayment;
    if (!method || cart.length === 0) return;

    setConfirmPayment(null);
    setIsProcessing(true);

    const saleData = {
      locationId: selectedLocation,
      clientId: selectedClient?.id || null,
      fullName: selectedClient?.fullName || "Cliente Mostrador",
      email: selectedClient?.email || "",
      items: cart,
      paymentMethod: method,
      status: method === "CONSIGNMENT" ? "PENDING" : "PAID",
      total: total,
    };

    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData)
      });

      if (res.ok) {
        toast.success(method === "CONSIGNMENT" ? "Consignación guardada" : "Venta Pagada");
        setCart([]);
        setSelectedClient(null);
        router.refresh(); // Ahora sí funcionará
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al procesar");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* TABS */}
      <div className="flex bg-white border-b px-4 gap-1 pt-2 shrink-0">
        <button onClick={() => setActiveTab("pos")} className={`px-6 py-2 rounded-t-xl font-black text-xs uppercase tracking-widest ${activeTab === "pos" ? "bg-gray-900 text-white shadow-lg" : "text-gray-400 hover:bg-gray-100"}`}>
          🛒 Punto de Venta
        </button>
        <button onClick={() => setActiveTab("history")} className={`px-6 py-2 rounded-t-xl font-black text-xs uppercase tracking-widest ${activeTab === "history" ? "bg-gray-900 text-white shadow-lg" : "text-gray-400 hover:bg-gray-100"}`}>
          📋 Historial
        </button>
      </div>

      {activeTab === "history" ? (
        <div className="flex-1 overflow-auto p-4">
          <SalesHistory locations={locations} />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* IZQUIERDA: CATÁLOGO */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <header className="flex justify-between items-center">
              <h1 className="text-2xl font-black text-gray-800">Caja Pormucha</h1>
              <select value={selectedLocation} onChange={(e) => { setCart([]); setSelectedLocation(e.target.value); }} className="p-2 border rounded-xl font-black text-xs bg-white shadow-sm">
                {locations.map((loc: any) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
              </select>
            </header>

            {/* SECCIÓN BOTELLAS */}
            <div className="space-y-3">
              <h2 className="font-black uppercase text-xs text-gray-400 flex items-center gap-2"><Beer size={16} /> Botellas Individuales</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {flavors.map((flavor: any) => {
                  const stock = flavor.locationStocks.find((s: any) => s.locationId === selectedLocation)?.quantity || 0;
                  return (
                    <button key={flavor.id} onClick={() => handleAddProduct(flavor, "BOTTLE")} disabled={stock <= 0} className={`p-4 rounded-3xl border-2 transition-all text-left ${stock > 0 ? 'bg-white border-transparent hover:border-blue-500 shadow-sm' : 'bg-gray-200 opacity-50 cursor-not-allowed'}`}>
                      <h3 className="font-black text-gray-800 leading-tight">{flavor.name}</h3>
                      <p className="text-xs font-bold text-gray-400 mt-1">${formatMoney(Number(flavor.price))}</p>
                      <div className={`mt-2 text-[10px] font-black px-2 py-1 rounded-lg w-fit ${stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>STOCK: {stock}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* SECCIÓN PACKS */}
            <div className="space-y-3">
              <h2 className="font-black uppercase text-xs text-gray-400 flex items-center gap-2"><Package size={16} /> Packs Comerciales</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((prod: any) => (
                  <button key={prod.id} onClick={() => handleAddProduct(prod, "PACK")} className="p-6 rounded-[2rem] bg-gray-900 text-white hover:bg-black transition-all shadow-xl group text-left">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-black text-lg leading-tight">{prod.name}</h3>
                      <div className="bg-white/10 p-2 rounded-full group-hover:scale-110 transition-transform"><Plus size={16} /></div>
                    </div>
                    <p className="text-sm font-bold text-gray-400">${formatMoney(Number(prod.price))}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* DERECHA: TICKET */}
          <div className="w-[420px] bg-white border-l shadow-2xl flex flex-col h-full overflow-hidden">
            <div className="p-8 bg-gray-50 border-b">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-gray-800 text-lg">Ticket de Venta</h3>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 size={20} />
                  </button>
                )}
              </div>

              <div className="bg-white p-3 rounded-2xl border-2 border-dashed border-gray-200 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedClient ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  <User size={18} />
                </div>
                <div className="flex-1">
                  <select
                    value={selectedClient?.id || ""}
                    onChange={(e) => {
                      const c = clients.find((cli: any) => cli.id === e.target.value);
                      setSelectedClient(c || null);
                    }}
                    className="w-full bg-transparent outline-none font-bold text-xs text-gray-700 cursor-pointer"
                  >
                    <option value="">👤 Cliente Mostrador</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.fullName}</option>
                    ))}
                  </select>
                </div>
                {selectedClient && (
                  <button onClick={() => setSelectedClient(null)} className="text-gray-300 hover:text-red-500">
                    <X size={14} strokeWidth={3} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-200 italic opacity-50">
                  <Package size={64} className="mb-4" />
                  <p className="font-black uppercase text-xs tracking-widest">Esperando productos...</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-sm text-gray-800">{item.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{item.type === "PACK" ? "Pack Armado" : "Botella Suelta"}</p>
                      </div>
                      <p className="font-black text-gray-800 text-sm">${formatMoney(item.price * item.quantity)}</p>
                    </div>
                    {item.composition && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.composition.map((c: any, i: number) => (
                          <span key={i} className="text-[9px] bg-white px-2 py-0.5 rounded-full border text-gray-500 font-bold">{c.quantity} {c.name}</span>
                        ))}
                      </div>
                    )}
                    <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-8 bg-white border-t space-y-6">
              <div className="flex justify-between items-end">
                <span className="font-black text-xs text-gray-400 uppercase tracking-widest">Total Venta</span>
                <span className="text-4xl font-black text-gray-900 tracking-tighter">${formatMoney(total)}</span>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setConfirmPayment("CASH")} disabled={isProcessing || cart.length === 0} className="bg-green-600 py-5 rounded-2xl font-black text-xs text-white flex flex-col items-center gap-1 shadow-lg shadow-green-600/20 active:scale-95 transition-all">
                    <Banknote size={24} /> Efectivo
                  </button>
                  <button onClick={() => setConfirmPayment("CARD")} disabled={isProcessing || cart.length === 0} className="bg-[#6E55A0] py-5 rounded-2xl font-black text-xs text-white flex flex-col items-center gap-1 shadow-lg shadow-[#6E55A0]/20 active:scale-95 transition-all">
                    <CreditCard size={24} /> Tarjeta
                  </button>
                </div>
                <button onClick={() => setConfirmPayment("CONSIGNMENT")} disabled={isProcessing || cart.length === 0} className="w-full bg-orange-50 text-orange-600 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 border-2 border-orange-100 active:scale-95 transition-all">
                  <ClipboardList size={18} /> Dejar en Consignación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALES */}
      {confirmPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-4">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${confirmPayment === 'CONSIGNMENT' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                {confirmPayment === 'CASH' && <Banknote size={40} />}
                {confirmPayment === 'CARD' && <CreditCard size={40} />}
                {confirmPayment === 'CONSIGNMENT' && <ClipboardList size={40} />}
              </div>
              <h2 className="text-3xl font-black text-gray-800">¿Confirmar Venta?</h2>
              <div className="bg-gray-50 p-6 rounded-3xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-bold">Cliente:</span>
                  <span className="text-gray-800 font-black">{selectedClient?.fullName || "Mostrador"}</span>
                </div>
                <div className="flex justify-between text-2xl border-t pt-2">
                  <span className="text-gray-800 font-black">Total:</span>
                  <span className="text-[#6E55A0] font-black">${formatMoney(total)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-4">
                <button onClick={executeCheckout} className={`w-full py-5 rounded-2xl font-black uppercase text-white shadow-xl active:scale-95 transition-all ${confirmPayment === 'CONSIGNMENT' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}>
                  Confirmar y Finalizar
                </button>
                <button onClick={() => setConfirmPayment(null)} className="w-full py-4 font-black uppercase text-xs text-gray-400 hover:text-gray-800">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPackModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-10 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="mb-8">
              <h2 className="text-4xl font-black text-gray-800 mb-1">Armar Pack</h2>
              <p className="text-gray-400 font-bold uppercase text-xs">{showPackModal.name}</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-3xl mb-6 text-white flex justify-between items-center">
              <p className="text-2xl font-black">Faltan: {showPackModal.quantity - Object.values(packSelection).reduce((a, b) => (a as number) + (b as number), 0)} botellas</p>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {flavors.map((f: any) => {
                const qty = packSelection[f.id] || 0;
                const stockEntry = f.locationStocks?.find((s: any) => s.locationId === selectedLocation);
                const availableStock = stockEntry ? stockEntry.quantity : 0;
                return (
                  <div key={f.id} className={`flex justify-between items-center p-5 rounded-3xl border transition-all ${availableStock <= 0 ? 'bg-gray-100 opacity-50' : 'bg-gray-50 border-transparent'}`}>
                    <div className="flex flex-col text-left">
                      <span className="font-black text-gray-800">{f.name}</span>
                      <span className={`text-[10px] font-bold ${availableStock <= 0 ? 'text-red-500' : 'text-gray-400'}`}>STOCK: {availableStock}</span>
                    </div>
                    <div className="flex items-center gap-5">
                      <button onClick={() => setPackSelection({ ...packSelection, [f.id]: Math.max(0, qty - 1) })} className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center font-black shadow-sm">-</button>
                      <span className="font-mono font-black text-xl w-6 text-center">{qty}</span>
                      <button
                        onClick={() => {
                          const currentTotal = Object.values(packSelection).reduce((a, b) => (a as number) + (b as number), 0);
                          if (currentTotal < showPackModal.quantity && qty < availableStock) {
                            setPackSelection({ ...packSelection, [f.id]: qty + 1 });
                          }
                        }}
                        disabled={availableStock <= 0 || qty >= availableStock}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-sm ${availableStock <= 0 || qty >= availableStock ? 'bg-gray-200 text-gray-400' : 'bg-white text-blue-600'}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowPackModal(null)} className="flex-1 py-5 font-black text-gray-400 uppercase text-xs tracking-widest">Cancelar</button>
              <button
                disabled={Object.values(packSelection).reduce((a, b) => (a as number) + (b as number), 0) !== showPackModal.quantity}
                onClick={confirmPackToCart}
                className="flex-[2] bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest disabled:bg-gray-200 shadow-xl"
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