"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { useCart } from "@/context/CartContext";

export default function CheckoutPage() {
  const { cart, total } = useCart();

  const [shippingCost, setShippingCost] = useState(0);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<any>(null);

  const [address, setAddress] = useState({
    name: "",
    email: "",
    phone: "",
    zip: "",
    state: "",
    city: "",
    neighborhood: "",
    street: "",
    number: "",
    reference: "",
  });

  const handleCalculateShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.zip) return alert("Por favor, ingresa un código postal.");

    setLoadingShipping(true);
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zip: address.zip,
          productIds: cart.map((item) => item.id),
        }),
      });
      const data = await res.json();

      if (data.rates && data.rates.length > 0) {
        setShippingOptions(data.rates);
        setSelectedShipping(data.rates[0]);
        setShippingCost(data.rates[0].rate);
      } else {
        alert("No se encontraron tarifas de paquetería para este código postal.");
        setShippingCost(0);
      }
    } catch (error) {
      console.error("Error cotizando envío:", error);
      alert("Error al contactar con paquetería.");
      setShippingCost(0);
    } finally {
      setLoadingShipping(false);
    }
  };

  const handlePayment = async () => {
    if (cart.length === 0) return alert("Tu carrito está vacío.");
    if (shippingCost === 0 || !selectedShipping) return alert("Primero cotiza tu envío para continuar.");

    const emptyFields = Object.values(address).some((value) => value.trim() === "");
    if (emptyFields) return alert("Por favor, completa todos los datos de envío.");

    setLoadingPayment(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          shippingCost,
          customerAddress: address,
          shippingProvider: selectedShipping.provider,
          shippingRateId: selectedShipping.id,
        }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        console.error("Error detallado del servidor:", data);
        alert(`Error de Stripe: ${data.details || data.error || "No se pudo iniciar el pago"}`);
        setLoadingPayment(false);
      }
    } catch (error) {
      console.error("Error al procesar pago:", error);
      alert("Hubo un error al conectar con el servidor de pagos.");
      setLoadingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto p-6 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <section className="space-y-8">
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none">Finalizar compra</h2>
            <p className="text-gray-500 mt-3 font-medium text-lg">Todos los campos son obligatorios para garantizar tu entrega.</p>
          </div>

          <form onSubmit={handleCalculateShipping} className="grid grid-cols-1 gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Nombre completo</label>
                <input
                  required
                  placeholder="Juan Pérez"
                  className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Teléfono celular</label>
                <input
                  required
                  type="tel"
                  placeholder="5512345678"
                  className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Correo electrónico</label>
              <input
                required
                type="email"
                placeholder="tu@email.com"
                className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                onChange={(e) => setAddress({ ...address, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">C.P.</label>
                <input
                  required
                  placeholder="00000"
                  className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                  onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Estado</label>
                <input
                  required
                  placeholder="Ej: CDMX"
                  className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Ciudad</label>
                <input
                  required
                  placeholder="Ciudad"
                  className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Colonia</label>
                <input
                  required
                  placeholder="Ej: Roma Norte"
                  className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                  onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Calle</label>
                <input
                  required
                  placeholder="Av. Juárez"
                  className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Número</label>
                <input
                  required
                  placeholder="456"
                  className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                  onChange={(e) => setAddress({ ...address, number: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Referencia de entrega</label>
              <textarea
                required
                placeholder="Ej: Casa blanca con portón negro..."
                rows={2}
                className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all resize-none"
                onChange={(e) => setAddress({ ...address, reference: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loadingShipping}
              className="bg-blue-600 text-white font-black p-5 rounded-2xl hover:bg-blue-700 transition-all active:scale-95 disabled:bg-gray-300 shadow-xl shadow-blue-100 mt-2"
            >
              {loadingShipping ? "OBTENIENDO TARIFAS..." : "COTIZAR ENVÍO"}
            </button>

            {shippingOptions.length > 0 ? (
              <div className="flex flex-col gap-3 mt-4 border-t pt-6 border-gray-100">
                <label className="text-[10px] items-center flex justify-between font-black uppercase text-gray-400">
                  <span>Selecciona tu envío</span>
                  <span className="text-blue-500 bg-blue-50 px-2 py-1 rounded">Skydropx</span>
                </label>

                {shippingOptions.map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => {
                      setSelectedShipping(opt);
                      setShippingCost(opt.rate);
                    }}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedShipping?.id === opt.id ? "border-blue-600 bg-blue-50 shadow-md" : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedShipping?.id === opt.id ? "border-blue-600" : "border-gray-300"}`}>
                        {selectedShipping?.id === opt.id ? <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" /> : null}
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-bold ${selectedShipping?.id === opt.id ? "text-blue-900" : "text-gray-900"}`}>{opt.provider}</span>
                        <span className="text-xs text-gray-500 font-medium">Entrega estimada: {opt.days} días</span>
                      </div>
                    </div>
                    <span className="font-black text-blue-700 text-lg">${opt.rate}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </form>
        </section>

        <section className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl h-fit border border-gray-100 flex flex-col gap-6">
          <h2 className="text-2xl font-black mb-2 text-gray-900 tracking-tight">Tu selección</h2>

          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 scrollbar-hide">
            {cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start border-b border-gray-50 pb-6">
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="font-black text-lg text-gray-900 leading-tight">{item.name}</p>
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-1">Pack personalizado</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {item.composition && item.composition.length > 0
                      ? item.composition.map((comp) =>
                          comp.quantity > 0 ? (
                            <span key={comp.flavorId} className="text-[9px] bg-gray-100 px-2 py-1 rounded-full text-gray-600 font-bold">
                              {comp.quantity} {comp.name}
                            </span>
                          ) : null,
                        )
                      : Object.entries(item.flavors).map(([sabor, cant]) =>
                          cant > 0 ? (
                            <span key={sabor} className="text-[9px] bg-gray-100 px-2 py-1 rounded-full text-gray-600 font-bold">
                              {cant} {sabor}
                            </span>
                          ) : null,
                        )}
                  </div>
                </div>
                <span className="font-black text-xl text-gray-900">${item.price}</span>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 p-6 rounded-[2rem] space-y-3">
            <div className="flex justify-between text-gray-500 font-bold text-sm uppercase tracking-widest">
              <span>Subtotal</span>
              <span>${total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-bold text-sm uppercase tracking-widest">Envío</span>
              <span className={shippingCost > 0 ? "text-green-600 font-black" : "text-gray-400 italic text-xs"}>
                {shippingCost > 0 ? `$${shippingCost}` : "Cotiza para ver costo"}
              </span>
            </div>
            <div className="pt-4 mt-2 border-t border-gray-200 flex justify-between items-baseline">
              <span className="text-2xl font-black text-gray-900">TOTAL</span>
              <div className="text-right">
                <p className="text-4xl font-black text-gray-900">${total + shippingCost}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase">Pesos mexicanos</p>
              </div>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={cart.length === 0 || shippingCost === 0 || loadingPayment}
            className={`w-full py-6 rounded-3xl font-black text-lg tracking-[0.2em] transition-all active:scale-[0.98] shadow-2xl ${
              shippingCost > 0 && !loadingPayment ? "bg-black text-white hover:bg-zinc-800" : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {loadingPayment ? "CONECTANDO A STRIPE..." : "PAGAR AHORA"}
          </button>

          <div className="flex justify-center gap-4 opacity-30 grayscale mt-2">
            <p className="text-[10px] font-bold">STRIPE SECURE CHECKOUT</p>
            <p className="text-[10px] font-bold">SKYDROPX LOGISTICS</p>
          </div>
        </section>
      </main>
    </div>
  );
}
