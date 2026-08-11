"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import type { WebCmsBlock, WebCmsPage } from "@/lib/web-cms";
import { Instagram, Mail, MessageCircle, Send } from "lucide-react";

function sortBlocks(blocks: WebCmsBlock[]) {
  return [...blocks].sort((a, b) => a.order - b.order);
}

function pickBlock(page: WebCmsPage | undefined, index: number, fallback: Partial<WebCmsBlock>): WebCmsBlock {
  const block = sortBlocks(page?.blocks ?? [])[index];
  return {
    id: block?.id ?? `contacto-${index}`,
    type: block?.type ?? (fallback.type as WebCmsBlock["type"]) ?? "content",
    label: block?.label ?? String(fallback.label ?? ""),
    title: block?.title ?? String(fallback.title ?? ""),
    subtitle: block?.subtitle ?? String(fallback.subtitle ?? ""),
    body: block?.body ?? String(fallback.body ?? ""),
    imageUrl: block?.imageUrl ?? String(fallback.imageUrl ?? ""),
    videoUrl: block?.videoUrl ?? String(fallback.videoUrl ?? ""),
    buttonLabel: block?.buttonLabel ?? String(fallback.buttonLabel ?? ""),
    buttonHref: block?.buttonHref ?? String(fallback.buttonHref ?? ""),
    isVisible: block?.isVisible ?? true,
    order: block?.order ?? index + 1,
  };
}

export default function ContactoPageClient({ page }: { page: WebCmsPage }) {
  const hero = pickBlock(page, 0, {
    type: "hero",
    label: "Hero contacto",
    title: "Tienes dudas?",
    subtitle: "Contactanos.",
    body: "Estamos para ayudarte para cualquier duda sobre el producto, tu suscripcion y tu compra.",
  });

  const instagram = pickBlock(page, 1, {
    type: "content",
    label: "Instagram contacto",
    title: "Instagram",
    subtitle: "@pormuchakombucha",
    buttonHref: "https://instagram.com/pormuchakombucha",
  });

  const whatsapp = pickBlock(page, 2, {
    type: "content",
    label: "WhatsApp contacto",
    title: "WhatsApp de soporte",
    subtitle: "Haz clic para chatear",
    buttonHref: "https://wa.me/529810000000",
  });

  const email = pickBlock(page, 3, {
    type: "content",
    label: "Correo contacto",
    title: "Correo electronico",
    subtitle: "ventas@pormuchakombucha.com",
    buttonHref: "mailto:ventas@pormuchakombucha.com",
  });

  const formCopy = pickBlock(page, 4, {
    type: "content",
    label: "Formulario contacto",
    title: "Enviar mensaje",
    body: "Te responderemos lo mas pronto posible.",
  });

  return (
    <main className="flex min-h-screen flex-col bg-[#F5F2EB] font-sans selection:bg-[#8B3A28] selection:text-white">
      <div className="absolute top-0 z-50 w-full">
        <Navbar />
      </div>

      <section className="relative z-10 flex flex-grow items-center justify-center px-6 pt-40 pb-24">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-16 lg:grid-cols-2 lg:gap-24">
          <div className="flex max-w-xl flex-col text-[#1A1A1A]">
            <span className="mb-4 block font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-[#8B3A18] md:text-xs">
              Atencion en linea
            </span>

            <h1 className="mb-6 font-serif text-5xl leading-tight md:text-6xl lg:text-7xl">
              {hero.title}
              <br />
              <span className="font-light italic text-[#8B3A18]">{hero.subtitle}</span>
            </h1>

            <p className="mb-12 text-lg font-light leading-relaxed text-gray-700 md:text-xl">{hero.body}</p>

            <div className="mt-4 space-y-8">
              <a
                href={instagram.buttonHref || "https://instagram.com/pormuchakombucha"}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-6 rounded-xl border border-transparent p-4 transition-colors hover:border-[#8B3A18]/10 hover:bg-white/60"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#8B3A18] text-[#F5F2EB] shadow-md transition-transform group-hover:scale-110">
                  <Instagram strokeWidth={1.5} size={26} />
                </div>
                <div className="flex flex-col">
                  <span className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{instagram.title}</span>
                  <span className="font-serif text-xl text-[#1A1A1A]">{instagram.subtitle}</span>
                </div>
              </a>

              <a
                href={whatsapp.buttonHref || "https://wa.me/529810000000"}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-6 rounded-xl border border-transparent p-4 transition-colors hover:border-[#8B3A18]/10 hover:bg-white/60"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#8B3A18] text-[#F5F2EB] shadow-md transition-transform group-hover:scale-110">
                  <MessageCircle strokeWidth={1.5} size={26} />
                </div>
                <div className="flex flex-col">
                  <span className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{whatsapp.title}</span>
                  <span className="font-serif text-xl text-[#1A1A1A]">{whatsapp.subtitle}</span>
                </div>
              </a>

              <a
                href={email.buttonHref || "mailto:ventas@pormuchakombucha.com"}
                className="group flex items-center gap-6 rounded-xl border border-transparent p-4 transition-colors hover:border-[#8B3A18]/10 hover:bg-white/60"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#8B3A18] text-[#F5F2EB] shadow-md transition-transform group-hover:scale-110">
                  <Mail strokeWidth={1.5} size={26} />
                </div>
                <div className="flex flex-col">
                  <span className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{email.title}</span>
                  <span className="font-serif text-xl text-[#1A1A1A]">{email.subtitle}</span>
                </div>
              </a>
            </div>
          </div>

          <div className="group relative w-full overflow-hidden rounded-3xl border border-[#8B3A18]/5 bg-white p-8 shadow-[0_20px_40px_rgba(0,0,0,0.05)] md:p-12">
            <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#F5F2EB] opacity-50 blur-3xl transition-colors duration-1000 group-hover:bg-[#EBDAAB]/30" />

            <form className="relative z-10 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B3A18]">Nombre completo</label>
                <input
                  type="text"
                  placeholder="Ej. Ana Garcia"
                  className="w-full rounded-t-lg border-b-2 border-transparent border-b-[#8B3A18]/20 bg-[#F5F2EB]/50 px-4 py-4 outline-none transition-all focus:border-b-[#8B3A18] focus:bg-[#F5F2EB]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B3A18]">Telefono</label>
                <input
                  type="tel"
                  placeholder="Ej. +52 123 456 7890"
                  className="w-full rounded-t-lg border-b-2 border-transparent border-b-[#8B3A18]/20 bg-[#F5F2EB]/50 px-4 py-4 outline-none transition-all focus:border-b-[#8B3A18] focus:bg-[#F5F2EB]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B3A18]">Correo electronico</label>
                <input
                  type="email"
                  placeholder="tucorreo@ejemplo.com"
                  className="w-full rounded-t-lg border-b-2 border-transparent border-b-[#8B3A18]/20 bg-[#F5F2EB]/50 px-4 py-4 outline-none transition-all focus:border-b-[#8B3A18] focus:bg-[#F5F2EB]"
                />
              </div>

              <div className="mb-4 flex flex-col gap-2">
                <label className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B3A18]">En que te podemos ayudar?</label>
                <textarea
                  rows={4}
                  placeholder="Escribe aqui todas tus dudas o comentarios..."
                  className="w-full resize-none rounded-t-lg border-b-2 border-transparent border-b-[#8B3A18]/20 bg-[#F5F2EB]/50 px-4 py-4 outline-none transition-all focus:border-b-[#8B3A18] focus:bg-[#F5F2EB]"
                />
              </div>

              <button
                type="button"
                className="group/btn flex w-full items-center justify-center gap-3 rounded-lg bg-[#1A1A1A] py-5 text-[#F5F2EB] transition-all duration-300 hover:-translate-y-1 hover:bg-[#8B3A18] hover:shadow-xl"
              >
                <span className="font-sans text-sm font-bold uppercase tracking-widest">{formCopy.title}</span>
                <Send size={18} className="transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />
              </button>

              <p className="mt-2 text-center text-xs font-light text-gray-400">{formCopy.body}</p>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
