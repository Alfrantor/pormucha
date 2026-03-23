"use client";
import { useState } from "react";
import { processPosSale } from "@/actions/pos-sales";
import { SalesHistory } from "@/components/pos/sales-history";
import { printTicket } from "@/components/pos/ticket-receipt";

// Formateador de precios con separador de miles
const formatMoney = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const PosInterface = ({ locations, products, flavors, userEmail }: any) => {
  // Estado
  const [selectedLocation, setSelectedLocation] = useState(locations[0]?.id);
  const [cart, setCart] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");

  // Calcular Total
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // Agregar al carrito
  const addToCart = (item: any, type: "PACK" | "BOTTLE") => {
    // Si es botella, verificar stock en esta ubicación
    if (type === "BOTTLE") {
        const stockEntry = item.locationStocks.find((s: any) => s.locationId === selectedLocation);
        const currentInCart = cart.find(c => c.id === item.id)?.quantity || 0;
        
        if (!stockEntry || (stockEntry.quantity - currentInCart) <= 0) {
            alert("⚠️ Sin stock suficiente en esta sucursal");
            return;
        }
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.type === type);
      if (existing) {
        return prev.map(i => i.id === item.id && i.type === type ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, type, quantity: 1 }];
    });
  };

  // Eliminar del carrito (resta 1, si llega a 0 lo quita)
  const removeFromCart = (itemId: string, type: "PACK" | "BOTTLE") => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId && i.type === type);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter(i => !(i.id === itemId && i.type === type));
      }
      return prev.map(i =>
        i.id === itemId && i.type === type ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  // Procesar Venta
  const handleCheckout = async (method: "CASH" | "CARD") => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    // Guardar datos del ticket ANTES de limpiar el carrito
    const ticketData = {
      locationName: locations.find((l: any) => l.id === selectedLocation)?.name || "Sucursal",
      items: cart.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      })),
      total,
      paymentMethod: method,
      vendedor: userEmail,
      fecha: new Date(),
    };

    try {
        // Llamamos al Server Action
        await processPosSale({
            locationId: selectedLocation,
            cart,
            total,
            method,
            userEmail
        });
        
        // Imprimir ticket térmico
        printTicket(ticketData);

        setCart([]); // Limpiar carrito
    } catch (error) {
        alert("Error al procesar venta");
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* TABS DE NAVEGACIÓN */}
      <div className="flex bg-white border-b px-4 gap-1 pt-2 shrink-0">
        <button
          onClick={() => setActiveTab("pos")}
          className={`px-5 py-2.5 rounded-t-lg font-bold text-sm transition-all ${
            activeTab === "pos"
              ? "bg-gray-900 text-white"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          🛒 Punto de Venta
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-5 py-2.5 rounded-t-lg font-bold text-sm transition-all ${
            activeTab === "history"
              ? "bg-gray-900 text-white"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          📋 Historial de Ventas
        </button>
      </div>

      {/* CONTENIDO SEGÚN TAB ACTIVO */}
      {activeTab === "history" ? (
        <SalesHistory locations={locations} />
      ) : (
        <div className="flex flex-1 overflow-hidden">
      
      {/* IZQUIERDA: CATÁLOGO DE PRODUCTOS */}
      <div className="w-2/3 p-6 overflow-y-auto">
        <header className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-black">Punto de Venta (POS)</h1>
            <select 
                value={selectedLocation} 
                onChange={(e) => { setCart([]); setSelectedLocation(e.target.value); }}
                className="p-2 border rounded-lg font-bold bg-white shadow-sm"
            >
                {locations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
            </select>
        </header>

        {/* SECCIÓN BOTELLAS (INVENTARIO REAL) */}
        <h2 className="font-bold text-gray-500 uppercase text-sm mb-3">Botellas Individuales (Stock Físico)</h2>
        <div className="grid grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {flavors.map((flavor: any) => {
                // Buscar stock de la tienda seleccionada
                const stock = flavor.locationStocks.find((s: any) => s.locationId === selectedLocation)?.quantity || 0;
                return (
                    <button 
                        key={flavor.id} 
                        onClick={() => addToCart(flavor, "BOTTLE")}
                        disabled={stock <= 0}
                        className={`p-4 rounded-xl border text-left transition-all ${stock > 0 ? 'bg-white hover:border-blue-500 shadow-sm' : 'bg-gray-200 opacity-50 cursor-not-allowed'}`}
                    >
                        <h3 className="font-bold text-gray-900">{flavor.name}</h3>
                        <p className="text-sm font-mono text-gray-500">${formatMoney(Number(flavor.price))}</p>
                        <div className={`mt-2 text-xs font-bold px-2 py-1 rounded w-fit ${stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            Stock: {stock}
                        </div>
                    </button>
                )
            })}
        </div>

        {/* SECCIÓN PACKS (PRODUCTOS COMERCIALES) */}
        <h2 className="font-bold text-gray-500 uppercase text-sm mb-3">Packs Comerciales (Armados)</h2>
        <div className="grid grid-cols-3 gap-4">
            {products.map((prod: any) => (
                <button 
                    key={prod.id} 
                    onClick={() => addToCart(prod, "PACK")}
                    className="p-4 rounded-xl bg-gray-800 text-white hover:bg-black transition-all shadow-lg"
                >
                    <h3 className="font-bold">{prod.name}</h3>
                    <p className="text-sm opacity-80">${formatMoney(Number(prod.price))}</p>
                </button>
            ))}
        </div>
      </div>

      {/* DERECHA: TICKET / CARRITO */}
      <div className="w-1/3 bg-white border-l shadow-xl flex flex-col h-full">
        <div className="p-6 bg-gray-50 border-b">
            <h2 className="font-black text-xl">Ticket de Venta</h2>
            <p className="text-sm text-gray-400">Usuario: {userEmail}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                    <p className="text-4xl">🛒</p>
                    <p>Carrito vacío</p>
                </div>
            )}
            {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-white border rounded-lg shadow-sm">
                    <div>
                        <p className="font-bold text-sm">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.type === "PACK" ? "Pack" : "Unidad"} x {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="font-mono font-bold">${formatMoney(item.price * item.quantity)}</p>
                        <button
                            onClick={() => removeFromCart(item.id, item.type)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-1.5 transition-all"
                            title="Eliminar"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            ))}
        </div>

        <div className="p-6 bg-gray-900 text-white mt-auto">
            <div className="flex justify-between text-xl font-bold mb-6">
                <span>Total</span>
                <span>${formatMoney(total)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => handleCheckout("CASH")}
                    disabled={isProcessing || cart.length === 0}
                    className="bg-green-600 p-4 rounded-xl font-bold hover:bg-green-500 disabled:opacity-50"
                >
                    💵 EFECTIVO
                </button>
                <button 
                    onClick={() => handleCheckout("CARD")}
                    disabled={isProcessing || cart.length === 0}
                    className="bg-blue-600 p-4 rounded-xl font-bold hover:bg-blue-500 disabled:opacity-50"
                >
                    💳 TARJETA
                </button>
            </div>
        </div>
        </div>
        </div>
      )}
    </div>
  );
};