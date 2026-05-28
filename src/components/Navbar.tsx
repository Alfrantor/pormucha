"use client";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import Image from "next/image";
import { UserButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { ShoppingCart, Menu, X } from "lucide-react";

export default function Navbar() {
  const { cart } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="sticky top-0 z-50 bg-[#F5F2EB]/80 backdrop-blur-md px-6 py-4 border-b border-gray-200/10">
      <div className="max-w-7xl mx-auto flex justify-between items-center">

        {/* Logo */}
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

          {/* Carrito y Perfil */}
          <div className="flex items-center gap-3 relative z-50">
            <Link href="/checkout" className="flex items-center gap-2 group">
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

            {/* Usuario logueado: avatar con menú */}
            <SignedIn>
              <UserButton afterSignOutUrl="/">
                <UserButton.MenuItems>
                  <UserButton.Action
                    label="Mi Perfil"
                    labelIcon={<div className="text-xs">👤</div>}
                    onClick={() => window.location.href = '/perfil'}
                  />
                </UserButton.MenuItems>
              </UserButton>
            </SignedIn>

            {/* Sin sesión: botón de iniciar sesión */}
            <SignedOut>
              <Link
                href="/sign-in"
                className="text-xs font-bold uppercase tracking-widest text-[#8B3A28] border border-[#8B3A28]/30 px-4 py-2 rounded-full hover:bg-[#8B3A28] hover:text-white transition-all"
              >
                Iniciar Sesión
              </Link>
            </SignedOut>
          </div>

          {/* Botón Hamburguesa (Solo móvil) */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 text-gray-800 hover:text-[#8B3A28] transition-colors relative z-50"
            aria-label="Menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Menú Móvil con Overlay */}
      {isMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-90 md:hidden animate-in fade-in" onClick={toggleMenu} />
          <div className="fixed top-0 right-0 h-screen w-[85%] max-w-sm bg-[#F5F2EB] z-100 md:hidden p-10 flex flex-col gap-8 shadow-2xl animate-in slide-in-from-right duration-300">
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
            <div className="flex flex-col gap-6 font-sans tracking-widest font-bold text-gray-900 text-lg">
              <Link href="/" onClick={toggleMenu} className="hover:text-[#8B3A28]">INICIO</Link>
              <Link href="/nosotros" onClick={toggleMenu} className="hover:text-[#8B3A28]">NOSOTROS</Link>
              <Link href="/tienda" onClick={toggleMenu} className="hover:text-[#8B3A28]">TIENDA</Link>
              <Link href="/suscripciones" onClick={toggleMenu} className="hover:text-[#8B3A28]">CLUB PORMUCHA</Link>
              <Link href="/contacto" onClick={toggleMenu} className="hover:text-[#8B3A28]">CONTACTO</Link>
              <SignedOut>
                <Link href="/sign-in" onClick={toggleMenu} className="text-[#8B3A28]">INICIAR SESIÓN</Link>
              </SignedOut>
              <SignedIn>
                <Link href="/perfil" onClick={toggleMenu} className="hover:text-[#8B3A28]">MI PERFIL</Link>
              </SignedIn>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}