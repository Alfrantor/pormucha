"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
    Search, User, Package, Beer,
    ClipboardList, CreditCard, Banknote,
    Trash2, Plus, Minus, X
} from "lucide-react";

interface PosProps {
    locations: any[];
    products: any[];
    flavors: any[];
    clients: any[];
    recentSales: any[];
    userEmail: string;
}

export function PosInterface({ locations, products, flavors, clients, recentSales, userEmail }: PosProps) {
    const [cart, setCart] = useState<any[]>([]);
    const [selectedLocation, setSelectedLocation] = useState(locations[0]?.id || "");
    const [activeTab, setActiveTab] = useState<"packs" | "individual">("packs");
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Modal para composición de Pack
    const [showPackModal, setShowPackModal] = useState<any>(null);
    const [packSelection, setPackSelection] = useState<Record<string, number>>({});

    // --- LÓGICA DE CLIENTES ---
    const handleSelectClient = (clientId: string) => {
        if (!clientId) {
            setSelectedClient(null);
            return;
        }
        const client = clients.find((c: any) => c.id === clientId);
        setSelectedClient(client);
    };

    // --- LÓGICA DE PACKS ---
    const openPackSelector = (pack: any) => {
        const initial: Record<string, number> = {};
        flavors.forEach((f: any) => initial[f.id] = 0);
        setPackSelection(initial);
        setShowPackModal(pack);
    };

    const confirmPackToCart = () => {
        const totalSelected = Object.values(packSelection).reduce((a, b) => a + b, 0);
        if (totalSelected !== showPackModal.quantity) {
            return toast.error(`Debes seleccionar exactamente ${showPackModal.quantity} botellas`);
        }

        const composition = Object.entries(packSelection)
            .filter(([_, qty]) => qty > 0)
            .map(([id, qty]) => ({
                flavorId: id,
                name: flavors.find((f: any) => f.id === id).name,
                quantity: qty
            }));

        const newCartItem = {
            id: `pack-${Date.now()}`,
            productId: showPackModal.id,
            name: showPackModal.name,
            price: showPackModal.price,
            quantity: 1,
            composition: composition
        };

        setCart([...cart, newCartItem]);
        setShowPackModal(null);
        toast.success("Pack añadido al ticket");
    };

    // --- LÓGICA DE INDIVIDUALES ---
    const addIndividualToCart = (flavor: any) => {
        const newCartItem = {
            id: `ind-${flavor.id}-${Date.now()}`,
            flavorId: flavor.id,
            name: `Botella: ${flavor.name}`,
            price: flavor.price,
            quantity: 1,
            composition: [{ flavorId: flavor.id, name: flavor.name, quantity: 1 }]
        };
        setCart([...cart, newCartItem]);
        toast.success(`${flavor.name} añadido`);
    };

    // --- FUNCIONES CARRITO ---
    const removeItem = (id: string) => setCart(cart.filter(i => i.id !== id));

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // --- FINALIZAR VENTA ---
    const handleCheckout = async (method: "CASH" | "CARD" | "CONSIGNMENT") => {
        if (cart.length === 0) return toast.error("El carrito está vacío");
        setIsProcessing(true);

        // DETERMINAMOS EL STATUS AQUÍ
        const currentStatus = method === "CONSIGNMENT" ? "PENDING" : "PAID";

        const saleData = {
            locationId: selectedLocation,
            clientId: selectedClient?.id || null,
            fullName: selectedClient?.fullName || "Cliente Mostrador",
            email: selectedClient?.email || "",
            items: cart,
            paymentMethod: method,
            status: currentStatus, // <--- ENVIAMOS EL STATUS CALCULADO
            total: total,
            subtotal: total,
        };

        console.log("Enviando a la API:", saleData); // Agrega este log para debuguear en la consola del navegador

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
                router.refresh();
            } else {
                const err = await res.json();
                toast.error(err.error || "Error en el servidor");
            }
        } catch (error) {
            toast.error("Error de red");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex h-full gap-4 p-4 bg-gray-100">
            {/* IZQUIERDA: MENÚ Y BÚSQUEDA */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">

                {/* Header & Selector de Ubicación */}
                <div className="bg-white p-4 rounded-3xl shadow-sm border flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#6E55A0] rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-[#6E55A0]/20">P</div>
                        <h2 className="font-black text-xl tracking-tight text-gray-800">POS Pormucha</h2>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="p-2 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-bold transition-colors border"
                        >
                            {showHistory ? "← Menú" : "🕒 Hoy"}
                        </button>
                        <select
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="p-2 border rounded-xl text-xs font-black bg-gray-50 outline-none"
                        >
                            {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* SELECTOR DE CLIENTE */}
                <div className="bg-white p-4 rounded-3xl shadow-sm border flex items-center gap-4 mb-4">
                    <div className="bg-[#6E55A0]/10 p-2 rounded-xl text-[#6E55A0]"><User size={20} /></div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</p>
                        <select
                            onChange={(e) => {
                                const c = clients.find((cli: any) => cli.id === e.target.value);
                                setSelectedClient(c || null);
                            }}
                            className="w-full bg-transparent outline-none font-bold text-sm text-gray-800"
                        >
                            <option value="">Público General (Mostrador)</option>
                            {clients.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.fullName} — {c.email}</option>
                            ))}
                        </select>
                    </div>
                    {selectedClient && (
                        <button onClick={() => setSelectedClient(null)} className="text-red-400 hover:scale-110 transition-transform">
                            <X size={18} strokeWidth={3} />
                        </button>
                    )}
                </div>
                {/* TABS DE PRODUCTOS */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab("packs")}
                        className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'packs' ? 'bg-[#6E55A0] text-white shadow-xl shadow-[#6E55A0]/30' : 'bg-white text-gray-400 border'}`}
                    >
                        <Package size={16} /> Packs Comerciales
                    </button>
                    <button
                        onClick={() => setActiveTab("individual")}
                        className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'individual' ? 'bg-green-600 text-white shadow-xl shadow-green-600/30' : 'bg-white text-gray-400 border'}`}
                    >
                        <Beer size={16} /> Botellas Individuales
                    </button>
                </div>

                {/* GRID DE PRODUCTOS */}
                {!showHistory ? (
                    <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4 pb-10 pr-2">
                        {activeTab === "packs" ? (
                            products.map((p: any) => (
                                <button key={p.id} onClick={() => openPackSelector(p)} className="bg-white p-6 rounded-[2.5rem] border-2 border-transparent hover:border-[#6E55A0] shadow-sm text-left group active:scale-95 transition-all">
                                    <p className="text-[10px] font-black text-[#6E55A0] uppercase mb-1">{p.quantity} Botellas</p>
                                    <p className="font-black text-gray-800 text-lg leading-tight mb-2 h-12 overflow-hidden">{p.name}</p>
                                    <div className="flex justify-between items-end">
                                        <p className="font-black text-xl text-gray-800">${p.price}</p>
                                        <div className="bg-gray-100 p-2 rounded-full text-gray-400 group-hover:bg-[#6E55A0] group-hover:text-white transition-colors"><Plus size={16} /></div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            flavors.map((f: any) => (
                                <button key={f.id} onClick={() => addIndividualToCart(f)} className="bg-white p-6 rounded-[2.5rem] border-2 border-transparent hover:border-green-600 shadow-sm text-left group active:scale-95 transition-all">
                                    <p className="text-[10px] font-black text-green-600 uppercase mb-1">Botella suelta</p>
                                    <p className="font-black text-gray-800 text-lg leading-tight mb-2 h-12 overflow-hidden">{f.name}</p>
                                    <div className="flex justify-between items-end">
                                        <p className="font-black text-xl text-gray-800">${f.price}</p>
                                        <div className="bg-gray-100 p-2 rounded-full text-gray-400 group-hover:bg-green-600 group-hover:text-white transition-colors"><Plus size={16} /></div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-[2.5rem] border p-8 overflow-y-auto flex-1">
                        <h3 className="font-black text-gray-400 uppercase text-xs tracking-widest mb-6">Ventas del Día</h3>
                        <div className="space-y-3">
                            {recentSales.map((sale: any) => (
                                <div key={sale.id} className="p-4 border rounded-2xl flex justify-between items-center hover:bg-gray-50 transition-colors">
                                    <div>
                                        <p className="text-[10px] font-mono text-[#6E55A0] font-black">#{sale.id.slice(-6).toUpperCase()}</p>
                                        <p className="font-bold text-sm">{new Date(sale.createdAt).toLocaleTimeString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-lg text-gray-800">${sale.total.toFixed(2)}</p>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${sale.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {sale.status === 'PAID' ? 'Pagado' : 'Consignación'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* DERECHA: TICKET */}
            <div className="w-[420px] bg-white rounded-[3rem] shadow-2xl border flex flex-col overflow-hidden">
                <div className="p-8 bg-gray-50 border-b flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-gray-800 text-lg">Ticket de Venta</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Atendido por: {userEmail}</p>
                    </div>
                    {cart.length > 0 && (
                        <button onClick={() => setCart([])} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={20} /></button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
                            <Package size={48} className="mb-2" />
                            <p className="font-black">Ticket vacío</p>
                        </div>
                    ) : (
                        cart.map((item, idx) => (
                            <div key={idx} className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 relative group">
                                <button onClick={() => removeItem(item.id)} className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm text-gray-300 hover:text-red-500"><X size={14} /></button>
                                <p className="font-black text-sm text-gray-800 mb-2">{item.name}</p>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-[#6E55A0] text-white w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black">x{item.quantity}</span>
                                        <span className="font-bold text-xs text-gray-400">${item.price} c/u</span>
                                    </div>
                                    <p className="font-black text-gray-800">${(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                                {/* Composición de sabores */}
                                <div className="mt-3 flex flex-wrap gap-1">
                                    {item.composition?.map((c: any, i: number) => (
                                        <span key={i} className="text-[9px] bg-white border border-gray-200 px-2 py-1 rounded-lg font-bold text-gray-500 shadow-sm">
                                            {c.quantity} {c.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* FOOTER: PAGOS */}
                <div className="p-8 bg-white border-t space-y-6">
                    <div className="flex justify-between items-end">
                        <span className="font-black text-xs text-gray-400 uppercase tracking-widest">Total a pagar</span>
                        <span className="text-5xl font-black text-[#6E55A0] tracking-tighter">${total.toFixed(2)}</span>
                    </div>

                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                disabled={isProcessing || cart.length === 0}
                                onClick={() => handleCheckout("CASH")}
                                className="bg-green-600 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase flex flex-col items-center gap-1 hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 active:scale-95"
                            >
                                <Banknote size={24} /> Efectivo (F1)
                            </button>
                            <button
                                disabled={isProcessing || cart.length === 0}
                                onClick={() => handleCheckout("CARD")}
                                className="bg-[#6E55A0] text-white py-5 rounded-[1.5rem] font-black text-xs uppercase flex flex-col items-center gap-1 hover:bg-[#5a448a] transition-all shadow-lg shadow-[#6E55A0]/20 active:scale-95"
                            >
                                <CreditCard size={24} /> Tarjeta (F2)
                            </button>
                        </div>
                        <button
                            disabled={isProcessing || cart.length === 0}
                            onClick={() => handleCheckout("CONSIGNMENT")}
                            className="w-full bg-orange-50 text-orange-600 py-4 rounded-[1.5rem] font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-orange-100 transition-all border-2 border-orange-100 active:scale-95"
                        >
                            <ClipboardList size={18} /> Dejar en Consignación (F3)
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL DE PERSONALIZACIÓN DE PACK */}
            {showPackModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[3.5rem] p-10 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="mb-8">
                            <h2 className="text-4xl font-black text-gray-800 leading-none mb-2">Armar Pack</h2>
                            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">{showPackModal.name}</p>
                        </div>

                        <div className="bg-[#6E55A0] p-6 rounded-3xl mb-6 text-white flex justify-between items-center shadow-lg shadow-[#6E55A0]/30">
                            <p className="font-bold uppercase text-xs tracking-tighter opacity-80">Capacidad total: {showPackModal.quantity}</p>
                            <p className="text-2xl font-black">
                                Faltan: {showPackModal.quantity - Object.values(packSelection).reduce((a, b) => a + b, 0)}
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 mb-8 pr-2">
                            {flavors.map((f: any) => {
                                const qty = packSelection[f.id] || 0;
                                return (
                                    <div key={f.id} className="flex justify-between items-center p-5 bg-gray-50 rounded-3xl border border-transparent hover:border-gray-200 transition-all">
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-800">{f.name}</span>
                                            <span className="text-[10px] font-bold text-gray-400">Stock: {f.locationStocks.find((s: any) => s.locationId === selectedLocation)?.quantity || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-5">
                                            <button
                                                onClick={() => setPackSelection({ ...packSelection, [f.id]: Math.max(0, qty - 1) })}
                                                className="w-10 h-10 bg-white border-2 rounded-2xl flex items-center justify-center font-black text-gray-400 hover:border-red-400 hover:text-red-500 transition-all"
                                            >
                                                <Minus size={16} strokeWidth={3} />
                                            </button>
                                            <span className="font-mono font-black text-xl w-6 text-center">{qty}</span>
                                            <button
                                                onClick={() => {
                                                    const currentTotal = Object.values(packSelection).reduce((a, b) => a + b, 0);
                                                    if (currentTotal < showPackModal.quantity) {
                                                        setPackSelection({ ...packSelection, [f.id]: qty + 1 });
                                                    }
                                                }}
                                                className="w-10 h-10 bg-white border-2 rounded-2xl flex items-center justify-center font-black text-[#6E55A0] hover:border-[#6E55A0] transition-all"
                                            >
                                                <Plus size={16} strokeWidth={3} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setShowPackModal(null)} className="flex-1 py-5 font-black text-gray-400 uppercase text-xs tracking-widest hover:text-gray-800 transition-colors">Cancelar</button>
                            <button
                                disabled={Object.values(packSelection).reduce((a, b) => a + b, 0) !== showPackModal.quantity}
                                onClick={confirmPackToCart}
                                className="flex-[2] bg-black text-white py-5 rounded-3xl font-black uppercase tracking-widest disabled:bg-gray-200 disabled:text-gray-400 shadow-xl active:scale-95 transition-all"
                            >
                                Confirmar y Añadir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}