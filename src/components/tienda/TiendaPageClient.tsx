"use client";

import Footer from "@/components/Footer";
import FAQItem from "@/components/FAQItem";
import Navbar from "@/components/Navbar";
import StoreGrid from "@/components/StoreGrid";
import TiendaHero from "@/components/TiendaHero";
import type { WebCmsBlock, WebCmsPage } from "@/lib/web-cms";
import { CheckCircle2, Info } from "lucide-react";

type PackItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  clubDiscountPercent: number | null;
};

type FlavorItem = {
  id: string;
  name: string;
  image: string;
  stock: number;
};

function sortBlocks(blocks: WebCmsBlock[]) {
  return [...blocks].sort((a, b) => a.order - b.order);
}

function pickBlock(page: WebCmsPage | undefined, index: number, fallback: Partial<WebCmsBlock>): WebCmsBlock {
  const block = sortBlocks(page?.blocks ?? [])[index];
  return {
    id: block?.id ?? `fallback-${index}`,
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

export default function TiendaPageClient({
  page,
  packs,
  flavors,
}: {
  page: WebCmsPage;
  packs: PackItem[];
  flavors: FlavorItem[];
}) {
  const hero = pickBlock(page, 0, {
    type: "hero",
    label: "Portada tienda",
    title: "Arma tu Pack.",
    subtitle: "Exclusivo Online",
    body: "Selecciona desde 6 hasta 24 botellas del sabor de tu preferencia y llévalo directo a tu puerta.",
    imageUrl: "/hero-tienda.jpg",
    buttonLabel: "Ver opciones",
    buttonHref: "#packs",
  });
  const guaranteeHeader = pickBlock(page, 1, {
    type: "content",
    label: "Garantia titulo",
    title: "Garantía Pormucha",
    subtitle: "Comunidad Pormucha",
    body: "\"Pormuchos momentos compartidos\"",
  });
  const guaranteeText = pickBlock(page, 2, {
    type: "content",
    label: "Garantia texto",
    title: "100% Satisfacción",
    body: "Únete a nuestros clientes frecuentes. Si es tu primera vez probando Pormucha y no fue lo que esperabas, te damos un reembolso total.",
  });
  const guaranteePoints = [
    pickBlock(page, 3, { type: "content", label: "Garantia punto 1", title: "Válido en tu primera compra." }),
    pickBlock(page, 4, { type: "content", label: "Garantia punto 2", title: "Máximo una garantía por cliente registrado." }),
    pickBlock(page, 5, { type: "content", label: "Garantia punto 3", title: "Aplica únicamente en el Pack de 6 (Degustación)." }),
  ].filter((item) => item.title.trim());
  const faqTitle = pickBlock(page, 6, {
    type: "content",
    label: "FAQ tienda titulo",
    title: "Sobre tu Orden",
    subtitle: "Resuelve tus dudas",
  });
  const faqs = [
    pickBlock(page, 7, { type: "faq", label: "FAQ tienda 1", title: "", body: "" }),
    pickBlock(page, 8, { type: "faq", label: "FAQ tienda 2", title: "", body: "" }),
    pickBlock(page, 9, { type: "faq", label: "FAQ tienda 3", title: "", body: "" }),
    pickBlock(page, 10, { type: "faq", label: "FAQ tienda 4", title: "", body: "" }),
  ].filter((item) => item.title.trim() || item.body.trim());
  const normalizedPacks = packs.map((pack) => ({
    ...pack,
    clubDiscountPercent: pack.clubDiscountPercent ?? 0,
  }));

  return (
    <main className="min-h-screen bg-[#F5F2EB] selection:bg-[#8B3A28] selection:text-white font-sans">
      <div className="absolute top-0 w-full z-50">
        <Navbar />
      </div>

      <TiendaHero
        eyebrow={hero.subtitle}
        title={hero.title}
        description={hero.body}
        imageUrl={hero.imageUrl}
        buttonLabel={hero.buttonLabel}
        buttonHref={hero.buttonHref}
      />

      <StoreGrid packs={normalizedPacks} flavors={flavors} />

      <section className="bg-[#EAE7DD] py-20 px-6 border-t border-[#8B3A18]/20 relative overflow-hidden">
        <div className="absolute top-10 -left-16 w-64 bg-[#9B1C1C] text-white text-xs font-bold tracking-[0.2em] transform -rotate-45 text-center py-2 shadow-2xl border-b-4 border-[#EBDAAB] z-10 hidden lg:block">
          {guaranteeText.title}
        </div>

        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-20 relative z-20">
          <div className="md:w-1/3 flex justify-center">
            <div className="w-56 h-56 rounded-full border border-[#8B3A18]/20 flex flex-col items-center justify-center bg-white shadow-[0_20px_40px_rgba(139,58,24,0.15)] relative">
              <div className="w-52 h-52 rounded-full border border-dashed border-[#8B3A18]/40 flex flex-col items-center justify-center bg-[#F5F2EB]">
                <span className="text-[#8B3A18] font-serif text-[4rem] leading-none mb-1">100%</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#1A1A1A] font-bold">Satisfacción</span>
              </div>
              <div className="absolute -bottom-4 bg-[#1A1A1A] text-[#EBDAAB] font-sans text-xs tracking-[0.25em] font-bold uppercase px-6 py-2 rounded-full shadow-lg">
                REEMBOLSO
              </div>
            </div>
          </div>

          <div className="md:w-2/3 text-center md:text-left flex flex-col items-center md:items-start">
            <span className="font-mono text-[10px] tracking-[0.4em] text-[#8B3A18] uppercase font-bold mb-3">{guaranteeHeader.subtitle}</span>
            <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] leading-tight mb-4">{guaranteeHeader.title}</h2>
            <p className="text-lg md:text-xl text-gray-500 font-light italic mb-6">{guaranteeHeader.body}</p>
            <p className="text-gray-700 font-light leading-relaxed mb-10 md:text-lg max-w-xl">{guaranteeText.body}</p>

            <ul className="space-y-4 text-left w-full max-w-md">
              {guaranteePoints.map((item) => (
                <li key={item.id} className="flex items-start gap-4">
                  <CheckCircle2 className="text-[#7D8B28] mt-0.5 flex-shrink-0" size={20} strokeWidth={2.5} />
                  <span className="text-gray-800 font-light">{item.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white py-24 px-6 border-t border-[#8B3A18]/10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-16 md:flex md:justify-between md:items-end border-b pb-8">
            <div>
              <span className="font-mono text-[10px] tracking-[0.4em] text-[#8B3A18] uppercase font-bold">{faqTitle.subtitle}</span>
              <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] mt-4">{faqTitle.title}</h2>
            </div>
            <div className="mt-6 md:mt-0 text-[#8B3A18]">
              <Info size={40} strokeWidth={1} />
            </div>
          </div>

          <div className="space-y-6">
            {faqs.map((item) => (
              <FAQItem key={item.id} question={item.title} answer={item.body} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
