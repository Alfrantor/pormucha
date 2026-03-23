"use client";

import { useState } from "react";
import { toast } from "sonner";

interface PosProps {
    locations: any[];
    products: any[];
    flavors: any[];
    recentSales: any[];
    userEmail: string;
}

export function PosInterface({ locations, products, flavors, recentSales, userEmail }: PosProps) {
    const [cart, setCart] = useState<any[]>([]);
    const [selectedLocation, setSelectedLocation] = useState(locations[0]?.id || "");
    const [isProcessing, setIsProcessing] = useState(false);
    const [showHistory, setShowHistory] = useState(false); // Estado para el modal de historial

    // --- LÓGICA DEL CARRITO ---
    const addToCart = (item: any) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.id === item.id);
            if (existing) {
                return prev.map((i) => i.id === item.id ? { ...i, quantity: (i.quantity || 1) + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const removeItem = (id: string) => {
        setCart((prev) => prev.filter((item) => item.id !== id));
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart((prev) => prev.map((item) => {
            if (item.id === id) {
                const newQty = (item.quantity || 1) + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }));
    };

    const total = cart.reduce((acc, item) => acc + item.price * (item.quantity || 1), 0);

    // --- FUNCIÓN DE IMPRESIÓN ---
    const printTicket = (data: any) => {
        const w = window.open("", "_blank");
        if (!w) return;
        w.document.write(`
      <html>
        <body style="font-family:monospace; width:80mm; padding:20px;">
          <center><h2>PORMUCHA KOMBUCHA</h2><p>Ticket de Venta</p></center>
          <hr/>
          ${cart.map(i => `<div style="display:flex; justify-content:space-between;">
            <span>${i.name} x${i.quantity}</span>
            <span>$${(i.price * i.quantity).toFixed(2)}</span>
          </div>`).join("")}
          <hr/>
          <h3 style="text-align:right;">TOTAL: $${total.toFixed(2)}</h3>
          <center><p>¡Gracias por tu compra!</p></center>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
        w.document.close();
    };

    return (
        <div className="flex h-full gap-4 p-4 bg-gray-100">
            {/* COLUMNA IZQUIERDA: PRODUCTOS */}
            <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border">
                    <h2 className="font-black text-xl tracking-tight">Menú POS</h2>
                    <div className="flex gap-2">
                        {/* BOTÓN DE HISTORIAL */}
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="p-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold transition-colors"
                        >
                            {showHistory ? "← Volver a Menú" : "🕒 Ver Ventas de Hoy"}
                        </button>
                        <select
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="p-2 border rounded-lg text-xs font-bold bg-gray-50 outline-none"
                        >
                            {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                        </select>
                    </div>
                </div>

                {!showHistory ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {products.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => addToCart(p)}
                                className="bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-[#6E55A0] transition-all shadow-sm text-left group active:scale-95"
                            >
                                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Pack</p>
                                <p className="font-black text-gray-800 leading-tight mb-2 h-10 overflow-hidden">{p.name}</p>
                                <p className="text-[#6E55A0] font-black text-lg">${p.price}</p>
                            </button>
                        ))}
                    </div>
                ) : (
                    /* VISTA DE HISTORIAL */
                    <div className="bg-white rounded-[2rem] border shadow-sm p-6 overflow-hidden flex flex-col h-[70vh]">
                        <h3 className="font-black text-gray-400 uppercase text-xs tracking-widest mb-4">Ventas Recientes</h3>
                        <div className="overflow-y-auto space-y-2">
                            {recentSales.map((sale) => (
                                <div key={sale.id} className="p-4 border rounded-2xl flex justify-between items-center hover:bg-gray-50 transition-colors">
                                    <div>
                                        <p className="text-xs font-mono text-gray-400">ID: {sale.id.slice(-6)}</p>
                                        <p className="font-bold text-sm">{new Date(sale.createdAt).toLocaleTimeString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-[#6E55A0]">${sale.total.toFixed(2)}</p>
                                        <button
                                            onClick={() => toast.info("Funcionalidad de re-impresión en desarrollo")}
                                            className="text-[10px] uppercase font-bold text-gray-400 hover:text-black"
                                        >Re-imprimir</button>
                                    </div>
                                </div>
                            ))}
                            {recentSales.length === 0 && <p className="text-center text-gray-400 italic py-10">No hay ventas registradas hoy.</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* COLUMNA DERECHA: TICKET / CARRITO */}
            <div className="w-96 bg-white rounded-[2.5rem] shadow-xl border flex flex-col overflow-hidden">
                <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-black text-gray-400 uppercase text-xs tracking-widest">Ticket Actual</h3>
                    {cart.length > 0 && (
                        <button
                            onClick={() => setCart([])}
                            className="text-[10px] font-black text-red-400 uppercase hover:text-red-600 transition-colors"
                        >
                            Vaciar Carrito
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 italic text-sm">
                            <p>Ticket vacío</p>
                        </div>
                    )}
                    {cart.map((item) => (
                        <div key={item.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 relative group hover:bg-white hover:shadow-md transition-all">
                            {/* BOTÓN ELIMINAR ITEM (Visible al pasar el mouse o fijo para cajeros) */}
                            <button
                                onClick={() => removeItem(item.id)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white w-6 h-6 rounded-full text-[10px] flex items-center justify-center shadow-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                title="Eliminar"
                            >✕</button>

                            <p className="font-bold text-sm mb-2 pr-4">{item.name}</p>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3 bg-white border rounded-xl px-2 py-1">
                                    <button onClick={() => updateQuantity(item.id, -1)} className="font-black text-lg text-[#6E55A0] hover:scale-125 transition-transform">-</button>
                                    <span className="font-black text-xs w-4 text-center">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, 1)} className="font-black text-lg text-[#6E55A0] hover:scale-125 transition-transform">+</button>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-sm text-gray-800">${(item.price * item.quantity).toFixed(2)}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">u: ${item.price}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-white border-t space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-400 uppercase text-xs">Total a pagar</span>
                        <span className="text-4xl font-black text-[#6E55A0] tracking-tighter">${total.toFixed(2)}</span>
                    </div>

                    <button
                        disabled={cart.length === 0 || isProcessing}
                        onClick={() => {
                            setIsProcessing(true);
                            printTicket(cart);
                            toast.success("Venta procesada con éxito");
                            setCart([]);
                            setIsProcessing(false);
                        }}
                        className="w-full bg-black text-white py-5 rounded-2xl font-black text-xl hover:bg-[#6E55A0] transition-colors disabled:bg-gray-200 disabled:text-gray-400 shadow-lg active:scale-95 transition-all"
                    >
                        {isProcessing ? "PROCESANDO..." : "COBRAR (F1)"}
                    </button>
                </div>
            </div>
        </div>
    );
}