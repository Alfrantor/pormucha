"use client";

import { useState, useSyncExternalStore } from "react";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import Image from "next/image";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Menu, ShoppingCart, X } from "lucide-react";

export default function Navbar() {
  const { cart } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const toggleMenu = () => setIsMenuOpen((current) => !current);

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200/10 bg-[#F5F2EB]/80 px-6 py-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="relative z-50 flex items-center gap-3 transition hover:opacity-70">
          <Image
            src="/logo-white.png"
            alt="Logo Pormucha"
            width={150}
            height={40}
            priority
            className="h-8 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-4 text-sm font-bold tracking-widest text-gray-800 md:gap-8">
          <div className="hidden items-center gap-8 md:flex">
            <Link href="/" className="transition-colors hover:text-[#8B3A28]">INICIO</Link>
            <Link href="/nosotros" className="transition-colors hover:text-[#8B3A28]">NOSOTROS</Link>
            <Link href="/tienda" className="transition-colors hover:text-[#8B3A28]">TIENDA</Link>
            <Link href="/suscripciones" className="transition-colors hover:text-[#8B3A28]">CLUB PORMUCHA</Link>
            <Link href="/contacto" className="transition-colors hover:text-[#8B3A28]">CONTACTO</Link>
            <div className="h-4 w-px bg-gray-300" />
          </div>

          <div className="relative z-50 flex items-center gap-3">
            <Link href="/checkout" className="group flex items-center gap-2">
              <div className="relative">
                <ShoppingCart size={20} className="text-gray-800 transition-colors group-hover:text-[#8B3A28]" />
                {isMounted && cart.length > 0 ? (
                  <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#8B3A28] text-[10px] font-bold text-white">
                    {cart.length}
                  </span>
                ) : null}
              </div>
              <span className="hidden transition-colors group-hover:text-[#8B3A28] sm:inline">CARRITO</span>
            </Link>

            {isMounted ? (
              <>
                <SignedIn>
                  <UserButton afterSignOutUrl="/">
                    <UserButton.MenuItems>
                      <UserButton.Action
                        label="Mi Perfil"
                        labelIcon={<div className="text-xs">Perfil</div>}
                        onClick={() => {
                          window.location.href = "/perfil";
                        }}
                      />
                    </UserButton.MenuItems>
                  </UserButton>
                </SignedIn>

                <SignedOut>
                  <Link
                    href="/sign-in"
                    className="rounded-full border border-[#8B3A28]/30 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#8B3A28] transition-all hover:bg-[#8B3A28] hover:text-white"
                  >
                    Iniciar Sesion
                  </Link>
                </SignedOut>
              </>
            ) : (
              <div className="h-10 w-10 rounded-full border border-[#8B3A28]/20 bg-white/60" aria-hidden="true" />
            )}
          </div>

          <button
            onClick={toggleMenu}
            className="relative z-50 p-2 text-gray-800 transition-colors hover:text-[#8B3A28] md:hidden"
            aria-label="Menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={toggleMenu} />
          <div className="fixed top-0 right-0 z-50 flex h-screen w-[85%] max-w-sm flex-col gap-8 bg-[#F5F2EB] p-10 shadow-2xl md:hidden">
            <div className="mb-10 flex items-center justify-between border-b pb-6">
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

            <div className="flex flex-col gap-6 text-lg font-bold tracking-widest text-gray-900">
              <Link href="/" onClick={toggleMenu} className="hover:text-[#8B3A28]">INICIO</Link>
              <Link href="/nosotros" onClick={toggleMenu} className="hover:text-[#8B3A28]">NOSOTROS</Link>
              <Link href="/tienda" onClick={toggleMenu} className="hover:text-[#8B3A28]">TIENDA</Link>
              <Link href="/suscripciones" onClick={toggleMenu} className="hover:text-[#8B3A28]">CLUB PORMUCHA</Link>
              <Link href="/contacto" onClick={toggleMenu} className="hover:text-[#8B3A28]">CONTACTO</Link>
              {isMounted ? (
                <>
                  <SignedOut>
                    <Link href="/sign-in" onClick={toggleMenu} className="text-[#8B3A28]">INICIAR SESION</Link>
                  </SignedOut>
                  <SignedIn>
                    <Link href="/perfil" onClick={toggleMenu} className="hover:text-[#8B3A28]">MI PERFIL</Link>
                  </SignedIn>
                </>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </nav>
  );
}
