"use client";
import { useEffect } from "react";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function SuccessPage() {
  const { clearCart } = useCart();

  // Limpiamos el carrito al cargar la página de éxito
  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-3xl mx-auto flex flex-col items-center justify-center pt-20 px-6 text-center">
        {/* Icono de éxito animado o grande */}
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-5xl mb-8 animate-bounce">
          ✓
        </div>

        <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-4">
          ¡PEDIDO CONFIRMADO!
        </h1>
        
        <p className="text-gray-500 text-xl font-medium max-w-md mb-12">
          Gracias por tu compra. Estamos preparando tus bebidas artesanales para que lleguen frescas a tu puerta.
        </p>

        <div className="bg-gray-50 p-8 rounded-[2.5rem] w-full border border-gray-100 mb-12">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">Próximos pasos</h2>
          <ul className="text-left space-y-4 text-gray-700 font-medium">
            <li className="flex gap-3">
              <span className="text-green-500">●</span> 
              Recibirás un correo de confirmación de Mercado Pago.
            </li>
            <li className="flex gap-3">
              <span className="text-green-500">●</span> 
              En menos de 24 horas recibirás tu guía de rastreo de Skydropx.
            </li>
            <li className="flex gap-3">
              <span className="text-green-500">●</span> 
              Tus bebidas llegarán en un periodo de 3 a 5 días hábiles.
            </li>
          </ul>
        </div>

        <Link 
          href="/" 
          className="bg-black text-white px-10 py-5 rounded-2xl font-black tracking-widest hover:scale-105 transition-all shadow-2xl shadow-zinc-300"
        >
          VOLVER A LA TIENDA
        </Link>
      </main>
    </div>
  );
}