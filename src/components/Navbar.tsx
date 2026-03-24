// src/components/Navbar.tsx
"use client";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { ShoppingCart, Menu, X } from "lucide-react";

export default function Navbar() {
  const { cart } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    // 1. Z-INDEX ALTO PARA EL NAVBAR (z-50)
    <nav className="sticky top-0 z-50 bg-[#F5F2EB]/80 backdrop-blur-md px-6 py-4 border-b border-gray-200/10">
      <div className="max-w-7xl mx-auto flex justify-between items-center">

        {/* Logo (z-50 para que el menú móvil lo tape si es necesario) */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-70 transition relative z-50">
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

          {/* Menú Escritorio (Solo md+) */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="hover:text-[#8B3A28] transition-colors">INICIO</Link>
            <Link href="/nosotros" className="hover:text-[#8B3A28] transition-colors">NOSOTROS</Link>
            <Link href="/tienda" className="hover:text-[#8B3A28] transition-colors">TIENDA</Link>
            <Link href="/suscripciones" className="hover:text-[#8B3A28] transition-colors">CLUB PORMUCHA</Link>
            <Link href="/contacto" className="hover:text-[#8B3A28] transition-colors">CONTACTO</Link>
            <div className="h-4 w-px bg-gray-300"></div>
          </div>

          {/* Carrito y Perfil (z-50 para que el menú móvil los tape si es necesario) */}
          <div className="flex items-center gap-3 relative z-50">
            <Link href="/checkout" className="flex items-center gap- group">
              <div className="relative">
                <ShoppingCart size={20} className="text-gray-800 group-hover:text-[#8B3A28] transition-colors" />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#8B3A28] text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                    {cart.length}
                  </span>
                )}
              </div>
              <span className="group-hover:text-[#8B3A28] transition-colors hidden sm:inline">CARRITO</span>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>

          {/* Botón Hamburguesa (Móvil) -> Z-INDEX ALTO (z-50) */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 text-gray-800 hover:text-[#8B3A28] transition-colors relative z-50"
            aria-label="Menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* 2. MENÚ MÓVIL CORREGIDO CON OVERLAY (z-100 para sobreponerse a todo) */}
      {isMenuOpen && (
        <>
          {/* FONDITO OSCURO DEGRADADO (Overlay) - z-90 */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-90 md:hidden animate-in fade-in" onClick={toggleMenu} />

          {/* MENÚ DESPLEGABLE CON Z-INDEX MÁS ALTO (z-100) */}
          <div className="fixed top-0 right-0 h-screen w-[85%] max-w-sm bg-[#F5F2EB] z-100 md:hidden p-10 flex flex-col gap-8 shadow-2xl animate-in slide-in-from-right duration-300">

            {/* Cabecera del menú (Logo y Botón X repetidos para UX) */}
            <div className="flex justify-between items-center mb-10 border-b pb-6">
              <Image
                src="/logo-white.png"
                alt="Logo Pormucha"
                width={100}
                height={30}
                className="h-6 w-auto object-contain"
              />
              <button onClick={toggleMenu} className="text-gray-800">
                <X size={28} />
              </button>
            </div>

            {/* Enlaces del menú (Textos grandes y oscuros para contraste) */}
            <div className="flex flex-col gap-6 font-sans tracking-widest font-bold text-gray-900 text-lg">
              <Link href="/" onClick={toggleMenu} className="hover:text-[#8B3A28]">INICIO</Link>
              <Link href="/nosotros" onClick={toggleMenu} className="hover:text-[#8B3A28]">NOSOTROS</Link>
              <Link href="/tienda" onClick={toggleMenu} className="hover:text-[#8B3A28]">TIENDA</Link>
              <Link href="/suscripciones" onClick={toggleMenu} className="hover:text-[#8B3A28]">CLUB PORMUCHA</Link>
              <Link href="/contacto" onClick={toggleMenu} className="hover:text-[#8B3A28]">CONTACTO</Link>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}