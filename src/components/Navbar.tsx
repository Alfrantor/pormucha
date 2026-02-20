// src/components/Navbar.tsx
"use client";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ShoppingCart } from "lucide-react";

export default function Navbar() {
  const { cart } = useCart();

  return (
    // Puedes quitar 'bg-[#F5F2EB]/80' si quieres que sea totalmente transparente al inicio,
    // o dejarlo así para que tenga ese fondo semitransparente siempre.
    <nav className="sticky top-0 z-50 bg-[#F5F2EB]/80 backdrop-blur-md px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">

        {/* Logo minimalista alineado a la izquierda */}
        <Link href="/" className="text-xl font-serif tracking-widest hover:opacity-70 transition text-[#1A1A1A]">
          PORMUCHA KOMBUCHA
        </Link>

        <div className="flex items-center gap-8 text-sm font-sans tracking-widest font-bold text-gray-800">

          {/* LINK INICIO: Lleva al tope de la página home */}
          <Link href="/" className="hidden md:block hover:text-[#8B3A28] transition-colors">
            INICIO
          </Link>

          {/* LINK TIENDA: Lleva a la sección con id="packs" en la home */}
          <Link href="/#packs" className="hidden md:block hover:text-[#8B3A28] transition-colors">
            TIENDA
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