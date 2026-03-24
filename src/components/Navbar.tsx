// src/components/Navbar.tsx
"use client";
import { useState } from "react"; // <-- Importamos useState
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { ShoppingCart, Menu, X } from "lucide-react"; // <-- Importamos iconos de menú

export default function Navbar() {
  const { cart } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Estado para el móvil

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="sticky top-0 z-50 bg-[#F5F2EB]/80 backdrop-blur-md px-6 py-4 border-b border-gray-200/20">
      <div className="max-w-7xl mx-auto flex justify-between items-center">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-70 transition z-50">
          <Image
            src="/logo-white.png"
            alt="Logo Pormucha"
            width={150}
            height={40}
            priority
            className="h-8 w-auto object-contain"
          />
        </Link>

        {/* Contenedor Derecha */}
        <div className="flex items-center gap-4 md:gap-8 text-sm font-sans tracking-widest font-bold text-gray-800">

          {/* Menú Escritorio (Visible solo en md+) */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="hover:text-[#8B3A28] transition-colors">INICIO</Link>
            <Link href="/nosotros" className="hover:text-[#8B3A28] transition-colors">NOSOTROS</Link>
            <Link href="/tienda" className="hover:text-[#8B3A28] transition-colors">TIENDA</Link>
            <Link href="/suscripciones" className="hover:text-[#8B3A28] transition-colors">CLUB PORMUCHA</Link>
            <Link href="/contacto" className="hover:text-[#8B3A28] transition-colors">CONTACTO</Link>
            <div className="h-4 w-px bg-gray-300"></div>
          </div>

          {/* Carrito (Siempre visible) */}
          <Link href="/checkout" className="flex items-center gap-2 group">
            <div className="relative">
              <ShoppingCart size={20} className="text-gray-800 group-hover:text-[#8B3A28] transition-colors" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#8B3A28] text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full animate-in zoom-in font-bold">
                  {cart.length}
                </span>
              )}
            </div>
            <span className="group-hover:text-[#8B3A28] transition-colors hidden sm:inline">CARRITO</span>
          </Link>

          {/* Perfil */}
          <UserButton afterSignOutUrl="/" />

          {/* Botón Hamburguesa (Solo móvil) */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 text-gray-800 hover:text-[#8B3A28] transition-colors z-50"
            aria-label="Menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Menú Desplegable Móvil */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-[#F5F2EB] z-40 md:hidden flex flex-col items-center justify-center gap-8 animate-in slide-in-from-top duration-300">
          <Link href="/" onClick={toggleMenu} className="text-2xl hover:text-[#8B3A28]">INICIO</Link>
          <Link href="/nosotros" onClick={toggleMenu} className="text-2xl hover:text-[#8B3A28]">NOSOTROS</Link>
          <Link href="/tienda" onClick={toggleMenu} className="text-2xl hover:text-[#8B3A28]">TIENDA</Link>
          <Link href="/suscripciones" onClick={toggleMenu} className="text-2xl hover:text-[#8B3A28]">CLUB PORMUCHA</Link>
          <Link href="/contacto" onClick={toggleMenu} className="text-2xl hover:text-[#8B3A28]">CONTACTO</Link>
        </div>
      )}
    </nav>
  );
}