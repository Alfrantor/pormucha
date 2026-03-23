// src/components/Navbar.tsx
"use client";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import Image from "next/image"; // <-- 1. Importamos Image de Next.js
import { UserButton } from "@clerk/nextjs";
import { ShoppingCart } from "lucide-react";

export default function Navbar() {
  const { cart } = useCart();

  return (
    // Nota sobre el fondo: bg-[#F5F2EB]/80 es un color crema claro.
    <nav className="sticky top-0 z-50 bg-[#F5F2EB]/80 backdrop-blur-md px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">

        {/* 2. Logo con Imagen + Texto alineado a la izquierda */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-70 transition">
          <Image
            src="/logo-white.png"
            alt="Logo Pormucha"
            width={150} // Puedes ajustar este ancho si lo quieres más grande o pequeño
            height={40}
            priority // Carga la imagen de inmediato porque es el logo (LCP)
            className="h-8 w-auto object-contain" // h-8 asegura que no rompa el diseño del navbar
          />
        </Link>

        <div className="flex items-center gap-8 text-sm font-sans tracking-widest font-bold text-gray-800">

          <Link href="/" className="hidden md:block hover:text-[#8B3A28] transition-colors">
            INICIO
          </Link>

          <Link href="/nosotros" className="hidden md:block hover:text-[#8B3A28] transition-colors">
            NOSOTROS
          </Link>

          <Link href="/tienda" className="hidden md:block hover:text-[#8B3A28] transition-colors">
            TIENDA
          </Link>

          <Link href="/suscripciones" className="hidden md:block hover:text-[#8B3A28] transition-colors">
            CLUB PORMUCHA
          </Link>

          <Link href="/contacto" className="hidden md:block hover:text-[#8B3A28] transition-colors">
            CONTACTO
          </Link>

          {/* Separador */}
          <div className="h-4 w-px bg-gray-300 hidden md:block"></div>

          {/* Carrito */}
          <Link href="/checkout" className="flex items-center gap-2 group">
            <div className="relative">
              <ShoppingCart size={20} className="text-gray-800 group-hover:text-[#8B3A28] transition-colors" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#8B3A28] text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full animate-in zoom-in font-bold">
                  {cart.length}
                </span>
              )}
            </div>
            <span className="group-hover:text-[#8B3A28] transition-colors">CARRITO</span>
          </Link>

          {/* Botón de Perfil de Clerk */}
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </nav>
  );
}