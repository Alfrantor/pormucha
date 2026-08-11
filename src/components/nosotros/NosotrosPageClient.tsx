"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FAQItem from "@/components/FAQItem";
import { resolveWebCmsAssetUrl, type WebCmsBlock, type WebCmsPage } from "@/lib/web-cms";
import { HandHeart, Leaf, RefreshCw, Send, Sparkles } from "lucide-react";

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

function renderParagraphs(content: string) {
  return content
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => (
      <p key={`${paragraph.slice(0, 20)}-${index}`} className="whitespace-pre-line">
        {paragraph}
      </p>
    ));
}

export default function NosotrosPageClient({ page }: { page: WebCmsPage }) {
  const hero = pickBlock(page, 0, {
    type: "hero",
    label: "Hero principal",
    title: "Nosotros",
    subtitle: "Nuestra Filosofía",
    body: "Fermentación viva, respeto por el tiempo y el compromiso de cuidar tu centro.",
    imageUrl: "/hero-nosotros.jpg",
  });
  const about = pickBlock(page, 1, {
    type: "content",
    label: "Que es Pormucha",
    title: "¿Qué es Pormucha?",
    body: "Pormucha no es solo una kombucha.",
  });
  const differenceTitle = pickBlock(page, 2, {
    type: "content",
    label: "Diferencia titulo",
    title: "La Diferencia Pormucha",
    subtitle: "Nuestra esencia",
  });
  const differenceNatural = pickBlock(page, 3, {
    type: "content",
    label: "Diferencia natural",
    title: "100% Natural",
    body: "Sin conservadores, sin azúcares refinadas ocultas, ni ingredientes que no puedas pronunciar.",
  });
  const differenceCultures = pickBlock(page, 4, {
    type: "content",
    label: "Diferencia cultivos",
    title: "Cultivos Vivos",
    body: "Respetamos los tiempos de fermentación.",
  });
  const differenceCenter = pickBlock(page, 5, {
    type: "content",
    label: "Diferencia centro",
    title: "Cuidamos tu Centro",
    body: "Creemos firmemente que una digestión saludable es la clave del bienestar emocional e inmunológico.",
  });
  const origin = pickBlock(page, 6, {
    type: "media",
    label: "Origen",
    title: "El Origen",
    subtitle: "¿Cómo empezó todo?",
    body: "Todo empezó en casa, en la cocina de mi mamá.",
    imageUrl: "/hero-bg.JPG",
  });
  const kombucha = pickBlock(page, 7, {
    type: "content",
    label: "Kombucha",
    title: "¿Qué es la Kombucha?",
    body: "La kombucha es un té fermentado milenario.",
  });
  const faqTitle = pickBlock(page, 8, {
    type: "content",
    label: "FAQ titulo",
    title: "Preguntas Frecuentes",
  });
  const faqs = [
    pickBlock(page, 9, { type: "faq", label: "FAQ 1", title: "", body: "" }),
    pickBlock(page, 10, { type: "faq", label: "FAQ 2", title: "", body: "" }),
    pickBlock(page, 11, { type: "faq", label: "FAQ 3", title: "", body: "" }),
    pickBlock(page, 12, { type: "faq", label: "FAQ 4", title: "", body: "" }),
  ].filter((item) => item.title.trim() || item.body.trim());
  const cta = pickBlock(page, 13, {
    type: "cta",
    label: "CTA tienda",
    title: "¿Estás listo para darle a tu cuerpo lo que necesita?",
    subtitle: "Haz la prueba",
    body: "Si todavía dudas, empieza a cuidar tu centro con nuestro \"Kit de Introducción\" directo a la puerta de tu casa.",
    imageUrl: "/section-call-action-buy.jpg",
    buttonLabel: "Ir a la Tienda",
    buttonHref: "/tienda",
  });
  const contact = pickBlock(page, 14, {
    type: "content",
    label: "Contacto final",
    title: "¿Quieres charlar más?",
    body: "Si tienes dudas especiales, te interesa convertirte en un distribuidor, o simplemente quieres dejarnos algún comentario, envíanos un DM en Instagram o acércate a nuestra página de contacto.",
  });
  const contactInstagram = pickBlock(page, 15, {
    type: "cta",
    label: "Contacto Instagram",
    buttonLabel: "@pormuchakombucha",
    buttonHref: "https://instagram.com/pormuchakombucha",
  });
  const contactForm = pickBlock(page, 16, {
    type: "cta",
    label: "Contacto formulario",
    buttonLabel: "Formulario Web",
    buttonHref: "/contacto",
  });
  const heroImageUrl = resolveWebCmsAssetUrl(hero.imageUrl || "/hero-nosotros.jpg");
  const originImageUrl = resolveWebCmsAssetUrl(origin.imageUrl || "/hero-bg.JPG");
  const ctaImageUrl = resolveWebCmsAssetUrl(cta.imageUrl || "/section-call-action-buy.jpg");

  return (
    <main className="min-h-screen bg-[#F5F2EB] font-sans selection:bg-[#8B3A28] selection:text-white flex flex-col">
      <div className="absolute top-0 w-full z-50">
        <Navbar />
      </div>

      <section className="relative h-[80vh] min-h-[600px] w-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-black">
          <div
            className="w-full h-full bg-cover bg-center bg-no-repeat opacity-60 scale-105"
            style={{ backgroundImage: `url('${heroImageUrl}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#F5F2EB]" />
        </div>

        <div className="relative z-10 text-center px-6 mt-20 max-w-4xl">
          <span className="font-mono text-xs md:text-sm tracking-[0.4em] text-[#EBDAAB] uppercase font-bold mb-4 block drop-shadow-md">
            {hero.subtitle || "Nuestra Filosofía"}
          </span>
          <h1 className="font-serif text-6xl md:text-8xl lg:text-[9rem] text-white leading-[0.85] tracking-tighter mb-6 drop-shadow-xl">
            {hero.title || "Nosotros"}
          </h1>
          <p className="font-roboto text-xl md:text-2xl font-light text-[#F5F2EB] max-w-2xl mx-auto drop-shadow-md">
            {hero.body || "Fermentación viva, respeto por el tiempo y el compromiso de cuidar tu centro."}
          </p>
        </div>
      </section>

      <section className="py-24 px-6 bg-[#F5F2EB] text-[#1A1A1A] relative z-20 -mt-10 rounded-t-3xl">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-8 leading-tight text-[#8B3A18]">
            {about.title || "¿Qué es Pormucha?"}
          </h2>
          <div className="text-xl md:text-2xl font-light leading-relaxed text-gray-700 space-y-6">
            {renderParagraphs(about.body)}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white border-y border-[#8B3A18]/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#8B3A18] font-bold">
              {differenceTitle.subtitle || "Nuestra esencia"}
            </span>
            <h2 className="font-serif text-4xl mt-4">{differenceTitle.title || "La Diferencia Pormucha"}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-[#F5F2EB] flex items-center justify-center text-[#8B3A18] mb-6">
                <Leaf size={32} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-2xl mb-3">{differenceNatural.title || "100% Natural"}</h3>
              <p className="font-light text-gray-600 leading-relaxed">{differenceNatural.body}</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-[#F5F2EB] flex items-center justify-center text-[#8B3A18] mb-6">
                <RefreshCw size={32} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-2xl mb-3">{differenceCultures.title || "Cultivos Vivos"}</h3>
              <p className="font-light text-gray-600 leading-relaxed">{differenceCultures.body}</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-[#F5F2EB] flex items-center justify-center text-[#8B3A18] mb-6">
                <HandHeart size={32} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-2xl mb-3">{differenceCenter.title || "Cuidamos tu Centro"}</h3>
              <p className="font-light text-gray-600 leading-relaxed">{differenceCenter.body}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-[#1A1A1A] text-[#F5F2EB]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="w-full md:w-1/2">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl relative bg-gray-800">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-80"
                style={{ backgroundImage: `url('${originImageUrl}')` }}
              />
            </div>
          </div>
          <div className="w-full md:w-1/2 flex flex-col items-start text-left">
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#EBDAAB] font-bold mb-4">
              {origin.subtitle || "¿Cómo empezó todo?"}
            </span>
            <h2 className="font-serif text-5xl md:text-6xl mb-6">{origin.title || "El Origen"}</h2>
            <div className="space-y-6 font-light text-lg md:text-xl text-gray-300 leading-relaxed">
              {renderParagraphs(origin.body)}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-[#F5F2EB] text-[#1A1A1A]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6 text-[#8B3A18]">
            <Sparkles size={40} className="animate-pulse" />
          </div>
          <h2 className="font-serif text-5xl md:text-6xl mb-8">{kombucha.title || "¿Qué es la Kombucha?"}</h2>
          <div className="text-xl font-light leading-relaxed text-gray-700 space-y-8">
            {renderParagraphs(kombucha.body)}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-white border-y border-[#8B3A18]/10">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl text-[#1A1A1A]">{faqTitle.title || "Preguntas Frecuentes"}</h2>
          </div>
          <div className="border border-[#8B3A18]/20 rounded-xl bg-[#F5F2EB]/50 overflow-hidden">
            {faqs.map((item) => (
              <FAQItem key={item.id} question={item.title} answer={item.body} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-40 px-6 text-[#F5F2EB] text-center bg-black overflow-hidden">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 scale-105 transition-transform duration-1000 hover:scale-100"
          style={{ backgroundImage: `url('${ctaImageUrl}')` }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#1A1A1A]/90 via-black/50 to-[#1A1A1A]/90 pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
          <span className="font-mono text-sm tracking-[0.4em] uppercase font-bold text-[#EBDAAB] mb-4 block drop-shadow-md">
            {cta.subtitle || "Haz la prueba"}
          </span>
          <h2 className="font-serif text-5xl md:text-7xl mb-8 leading-tight drop-shadow-lg text-white">
            {cta.title || "¿Estás listo para darle a tu cuerpo lo que necesita?"}
          </h2>
          <p className="text-xl md:text-2xl font-light opacity-90 mb-12 drop-shadow-md text-gray-200 max-w-2xl">
            {cta.body}
          </p>

          {cta.buttonLabel ? (
            <a
              href={cta.buttonHref || "/tienda"}
              className="inline-block bg-[#EBDAAB] text-[#1A1A1A] px-12 py-5 rounded-md text-xl font-bold tracking-widest hover:bg-white hover:scale-105 transition-all shadow-xl hover:shadow-2xl uppercase border border-white/50"
            >
              {cta.buttonLabel}
            </a>
          ) : null}
        </div>
      </section>

      <section className="py-24 px-6 bg-[#1A1A1A] text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#EBDAAB] mb-6">
            <Send size={28} />
          </div>
          <h2 className="font-serif text-4xl md:text-5xl text-white mb-6">{contact.title || "¿Quieres charlar más?"}</h2>
          <p className="text-lg text-gray-400 font-light mb-10 leading-relaxed">{contact.body}</p>
          <div className="flex gap-6 justify-center">
            {contactInstagram.buttonLabel ? (
              <a
                href={contactInstagram.buttonHref || "https://instagram.com/pormuchakombucha"}
                target="_blank"
                rel="noreferrer"
                className="text-[#EBDAAB] uppercase font-mono tracking-widest text-sm hover:text-white transition-colors border-b border-[#EBDAAB] pb-1"
              >
                {contactInstagram.buttonLabel}
              </a>
            ) : null}
            {contactForm.buttonLabel ? (
              <a
                href={contactForm.buttonHref || "/contacto"}
                className="text-[#EBDAAB] uppercase font-mono tracking-widest text-sm hover:text-white transition-colors border-b border-[#EBDAAB] pb-1"
              >
                {contactForm.buttonLabel}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
