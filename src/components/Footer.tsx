// src/components/Footer.tsx
import Link from 'next/link';
import Image from 'next/image'; // <-- 1. Importamos Image
import { Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#1A1A1A] text-[#F5F2EB] py-20 px-6 font-sans border-t-4 border-[#8B3A18]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12 lg:gap-24">
        {/* Marca y redes */}
        <div className="md:w-1/3 flex flex-col items-start">

          {/* 2. Reemplazamos el texto por el logo .png */}
          <Link href="/" className="mb-6 hover:opacity-80 transition-opacity">
            <Image
              src="/logo-black.png"
              alt="Logo Pormucha Kombucha"
              width={200} // Ajusta este ancho a tu gusto
              height={60}
              className="w-auto h-12 object-contain"
            />
          </Link>

          <p className="font-mono text-[10px] tracking-[0.2em] opacity-60 uppercase mb-8 leading-relaxed max-w-xs">
            "Pormuchos momentos compartidos". <br /> Fermentación real, viva y con propósito.
          </p>
          <a
            href="https://instagram.com/pormuchakombucha"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-[#EBDAAB] opacity-80 hover:opacity-100 hover:scale-105 transition-all"
          >
            <Instagram strokeWidth={1.5} size={28} />
            <span className="font-mono text-[10px] tracking-widest uppercase font-bold">@pormuchakombucha</span>
          </a>
        </div>

        {/* Links principales */}
        <div className="md:w-1/4 flex flex-col">
          <h3 className="font-mono text-[10px] tracking-[0.3em] text-[#EBDAAB] uppercase font-bold mb-6 opacity-60">
            Navegación
          </h3>
          <div className="flex flex-col gap-4 text-sm font-light opacity-80">
            <Link href="/" className="hover:text-white hover:translate-x-1 transition-all w-fit">Inicio</Link>
            <Link href="/nosotros" className="hover:text-white hover:translate-x-1 transition-all w-fit">Nosotros</Link>
            <Link href="/tienda" className="hover:text-white hover:translate-x-1 transition-all w-fit">Tienda</Link>
            <Link href="/suscripciones" className="hover:text-white hover:translate-x-1 transition-all w-fit">Suscripciones</Link>
            <Link href="/contacto" className="hover:text-white hover:translate-x-1 transition-all w-fit">Contacto</Link>
          </div>
        </div>

        {/* Políticas y Legal */}
        <div className="md:w-1/3 flex flex-col">
          <h3 className="font-mono text-[10px] tracking-[0.3em] text-[#EBDAAB] uppercase font-bold mb-6 opacity-60">
            Soporte y Legal
          </h3>
          <div className="flex flex-col gap-4 text-sm font-light opacity-80">
            <Link href="/politica-de-privacidad" className="hover:text-white hover:translate-x-1 transition-all w-fit">Política de Privacidad</Link>
            <Link href="/politica-de-reembolso" className="hover:text-white hover:translate-x-1 transition-all w-fit">Política de Reembolso</Link>
            <Link href="/politica-de-envio" className="hover:text-white hover:translate-x-1 transition-all w-fit">Política de Envío</Link>
            <Link href="/politica-de-cancelacion" className="hover:text-white hover:translate-x-1 transition-all w-fit">Política de Cancelación</Link>
            <Link href="/terminos-del-servicio" className="hover:text-white hover:translate-x-1 transition-all w-fit">Términos del Servicio</Link>
            <Link href="/contacto" className="hover:text-white hover:translate-x-1 transition-all w-fit">Información de Contacto</Link>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/10 text-center flex flex-col items-center justify-center">
        <p className="font-mono text-[10px] tracking-[0.3em] opacity-40 uppercase">
          © {new Date().getFullYear()} PORMUCHA KOMBUCHA — FERMENTACIÓN REAL. TODOS LOS DERECHOS RESERVADOS.
        </p>
      </div>
    </footer>
  );
}