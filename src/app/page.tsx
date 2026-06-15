"use client";
import { Instagram } from "lucide-react";
import SubscriptionLanding from "@/components/SubscriptionLanding";

export default function PreLanzamientoPage() {
  return (
    <main className="min-h-screen bg-[#F5F2EB] font-sans overflow-x-hidden selection:bg-[#8B3A28] selection:text-white">

      {/* ── NAVBAR MÍNIMO ─────────────────────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5">
        <span className="font-serif text-[#F5F2EB] text-2xl tracking-tight select-none">
          P<span className="italic font-light">o</span>rmucha
        </span>
        <a
          href="https://instagram.com/pormuchakombucha"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[#F5F2EB]/80 hover:text-[#F5F2EB] transition-all"
        >
          <Instagram size={20} strokeWidth={1.5} />
          <span className="hidden sm:inline font-mono text-[10px] tracking-widest uppercase">@pormuchakombucha</span>
        </a>
      </header>

      {/* ── HERO: VIDEO + GRADIENTE ───────────────────────────────────────── */}
      <section className="relative min-h-screen w-full overflow-hidden flex items-center">

        {/* Video de fondo */}
        <div className="absolute inset-0 z-0 bg-black">
          <video
            src="/video-hero.mp4"
            autoPlay loop muted playsInline
            className="w-full h-full object-cover brightness-[0.65] grayscale-[0.15]"
          />
        </div>

        {/* Gradiente izquierdo: crema que se desvanece hacia el video */}
        <div className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: "linear-gradient(to right, rgba(245,242,235,0.82) 0%, rgba(245,242,235,0.45) 40%, transparent 70%)"
          }}
        />

        {/* Texto centrado-izquierda */}
        <div className="relative z-20 px-8 md:px-20 max-w-4xl">
          {/* Etiqueta superior */}
          <p className="font-mono text-[10px] tracking-[0.35em] text-[#8B3A18] uppercase mb-6 opacity-80">
            Pormucha · en vivo
          </p>

          {/* Título */}
          <h1 className="font-serif leading-[0.82] tracking-tighter text-[#1A1A1A]">
            <span className="block text-[4rem] sm:text-[6rem] md:text-[8rem]">
              P<span className="italic font-light">o</span>rmucha
            </span>
            <span className="block text-[3.2rem] sm:text-[5rem] md:text-[6.5rem] text-[#8B3A18] font-light">
              K<span className="italic font-light">o</span>mbucha
            </span>
          </h1>

          {/* Línea separadora */}
          <div className="w-16 h-[1px] bg-[#8B3A18]/40 my-8" />

          {/* Quote */}
          <p className="font-serif text-xl md:text-2xl text-[#1A1A1A]/70 italic leading-relaxed max-w-md">
            "Estamos fermentando algo increíble.<br />
            La frescura viva ahora en línea."
          </p>
        </div>

        {/* Texto vertical "DESLIZA" derecha */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col items-center gap-4">
          <div className="w-[1px] h-16 bg-[#F5F2EB]/30" />
          <span
            className="font-mono text-[9px] tracking-[0.35em] text-[#F5F2EB]/50 uppercase"
            style={{ writingMode: "vertical-rl" }}
          >
            DESLIZA
          </span>
          <div className="w-[1px] h-16 bg-[#F5F2EB]/30" />
        </div>
      </section>

      {/* ── SECCIÓN 2: BENEFICIO DE LANZAMIENTO ──────────────────────────── */}
      <section className="bg-[#F5F2EB] py-24 px-6 md:px-16 text-center border-b border-[#8B3A18]/10">
        <p className="font-mono text-[9px] tracking-[0.5em] text-[#8B3A18] uppercase mb-6">
          Beneficio de lanzamiento
        </p>
        <h2 className="font-serif text-[2.4rem] sm:text-[3.2rem] md:text-[4rem] leading-[1.05] tracking-tight text-[#1A1A1A] max-w-3xl mx-auto">
          Queremos que seas el primero<br className="hidden sm:block" /> en probar la frescura.
        </h2>
        <p className="mt-6 text-base md:text-lg text-gray-600 font-light max-w-xl mx-auto leading-relaxed">
          Registra tus datos y obtén un{" "}
          <span className="font-semibold text-[#8B3A18] underline underline-offset-4 decoration-[#8B3A18]/40">
            descuento especial
          </span>{" "}
          el día de nuestra apertura en línea oficial.
        </p>
      </section>

      {/* ── SECCIÓN 3: ÚNETE + FORMULARIO ────────────────────────────────── */}
      <SubscriptionLanding />

      {/* ── FOOTER MÍNIMO ────────────────────────────────────────────────── */}
      <footer className="bg-[#1A1A1A] text-[#F5F2EB]/50 py-8 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[9px] tracking-[0.25em] uppercase">
        <p>© {new Date().getFullYear()} Pormucha Kombucha — Fermentación real</p>
        <a
          href="https://instagram.com/pormuchakombucha"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:text-[#EBDAAB] transition-colors"
        >
          <Instagram size={14} strokeWidth={1.5} />
          Nuestra comunidad
        </a>
      </footer>
    </main>
  );
}
