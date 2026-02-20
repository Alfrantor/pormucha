"use client";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import Navbar from "@/components/Navbar";

export default function CheckoutPage() {
  const { cart, total } = useCart();
  
  // Estados para el formulario y logística
  const [shippingCost, setShippingCost] = useState(0);
  const [loadingShipping, setLoadingShipping] = useState(false);
  
  // Estado de dirección con todos los campos obligatorios solicitados
  const [address, setAddress] = useState({
    name: "",
    email: "",
    phone: "",      // Teléfono Celular
    zip: "",        // Código Postal
    state: "",      // Estado
    city: "",       // Ciudad
    neighborhood: "", // Colonia
    street: "",     // Calle y Número
    reference: ""   // Referencia
  });

  // Función para cotizar con la API de Shipping
  const handleCalculateShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.zip) return alert("Por favor, ingresa un Código Postal.");

    setLoadingShipping(true);
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip: address.zip }),
      });
      const data = await res.json();
      
      // Actualizamos el costo de envío
      setShippingCost(data.rate || 150); 
    } catch (error) {
      console.error("Error cotizando envío:", error);
      alert("No se pudo obtener la cotización. Usando tarifa estándar.");
      setShippingCost(150);
    } finally {
      setLoadingShipping(false);
    }
  };

  // Función para procesar el pago con Mercado Pago
  const handlePayment = async () => {
    if (cart.length === 0) return alert("Tu carrito está vacío.");
    if (shippingCost === 0) return alert("Primero cotiza tu envío para continuar.");
    
    // Validación manual de que todos los campos obligatorios estén llenos
    const camposVacios = Object.values(address).some(val => val.trim() === "");
    if (camposVacios) return alert("Por favor, completa todos los datos de envío.");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items: cart, 
          shippingCost: shippingCost,
          customerAddress: address 
        }),
      });

      const data = await res.json();

      if (res.ok && data.id) {
        // Redirección oficial a la pasarela de Mercado Pago
        window.location.href = `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=${data.id}`;
      } else {
        // Alerta de error detallada para depuración
        console.error("Error detallado del servidor:", data);
        alert(`Error de Mercado Pago: ${data.details || data.error || "No se pudo generar el ID de pago"}`);
      }
    } catch (error) {
      console.error("Error al procesar pago:", error);
      alert("Hubo un error al conectar con el servidor de pagos.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-6xl mx-auto p-6 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* LADO IZQUIERDO: FORMULARIO DE ENVÍO */}
        <section className="space-y-8">
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none">Finalizar Compra</h2>
            <p className="text-gray-500 mt-3 font-medium text-lg">Todos los campos son obligatorios para garantizar tu entrega.</p>
          </div>

          <form onSubmit={handleCalculateShipping} className="grid grid-cols-1 gap-5">
            {/* Nombre y Teléfono */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Nombre Completo</label>
                <input required placeholder="Juan Pérez" className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                    onChange={(e) => setAddress({...address, name: e.target.value})} />
                </div>
                <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Teléfono Celular (10 dígitos)</label>
                <input required type="tel" placeholder="5512345678" className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                    onChange={(e) => setAddress({...address, phone: e.target.value})} />
                </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Correo Electrónico</label>
              <input required type="email" placeholder="tu@email.com" className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                onChange={(e) => setAddress({...address, email: e.target.value})} />
            </div>

            {/* CP, Estado y Ciudad */}
            <div className="grid grid-cols-3 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">C.P.</label>
                <input required placeholder="00000" className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all" 
                  onChange={(e) => setAddress({...address, zip: e.target.value})} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Estado</label>
                <input required placeholder="Ej: CDMX" className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all" 
                  onChange={(e) => setAddress({...address, state: e.target.value})} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Ciudad</label>
                <input required placeholder="Ciudad" className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all" 
                  onChange={(e) => setAddress({...address, city: e.target.value})} />
              </div>
            </div>

            {/* Colonia y Calle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Colonia</label>
                <input required placeholder="Ej: Roma Norte" className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                    onChange={(e) => setAddress({...address, neighborhood: e.target.value})} />
                </div>
                <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Calle y Número</label>
                <input required placeholder="Av. Juárez 456" className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                    onChange={(e) => setAddress({...address, street: e.target.value})} />
                </div>
            </div>

            {/* Referencia */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Referencia de entrega</label>
              <textarea required placeholder="Ej: Casa blanca con portón negro..." rows={2} className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all resize-none" 
                onChange={(e) => setAddress({...address, reference: e.target.value})} />
            </div>

            <button 
              type="submit" 
              disabled={loadingShipping} 
              className="bg-blue-600 text-white font-black p-5 rounded-2xl hover:bg-blue-700 transition-all active:scale-95 disabled:bg-gray-300 shadow-xl shadow-blue-100 mt-2"
            >
              {loadingShipping ? "OBTENIENDO TARIFAS..." : "COTIZAR ENVÍO"}
            </button>
          </form>
        </section>

        {/* LADO DERECHO: RESUMEN DE COMPRA */}
        <section className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl h-fit border border-gray-100 flex flex-col gap-6">
          <h2 className="text-2xl font-black mb-2 text-gray-900 tracking-tight">Tu Selección</h2>
          
          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 scrollbar-hide">
            {cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start border-b border-gray-50 pb-6">
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="font-black text-lg text-gray-900 leading-tight">{item.name}</p>
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-1">Pack Personalizado</p>
                  </div>
                  
                  {/* Desglose de Sabores dinámico */}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {Object.entries(item.flavors).map(([sabor, cant]) => (
                      cant > 0 && (
                        <span key={sabor} className="text-[9px] bg-gray-100 px-2 py-1 rounded-full text-gray-600 font-bold">
                          {cant} {sabor}
                        </span>
                      )
                    ))}
                  </div>
                </div>
                <span className="font-black text-xl text-gray-900">${item.price}</span>
              </div>
            ))}
          </div>

          {/* Cálculos Finales */}
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
                <p className="text-[9px] text-gray-400 font-bold uppercase">Pesos Mexicanos</p>
              </div>
            </div>
          </div>

          {/* Botón de Pago Final */}
          <button 
            onClick={handlePayment} 
            disabled={cart.length === 0 || shippingCost === 0}
            className={`w-full py-6 rounded-3xl font-black text-lg tracking-[0.2em] transition-all active:scale-[0.98] shadow-2xl ${
              shippingCost > 0 ? 'bg-black text-white hover:bg-zinc-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            PAGAR AHORA
          </button>
          
          <div className="flex justify-center gap-4 opacity-30 grayscale mt-2">
            <p className="text-[10px] font-bold">MERCADO PAGO SECURE</p>
            <p className="text-[10px] font-bold">SKYDROPX LOGISTICS</p>
          </div>
        </section>
      </main>
    </div>
  );
}