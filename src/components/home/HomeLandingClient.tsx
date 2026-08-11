"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SubscriptionLanding from "@/components/SubscriptionLanding";
import { isWebCmsProxyUrl, resolveWebCmsAssetUrl, type WebCmsBlock, type WebCmsPage } from "@/lib/web-cms";
import { Leaf, Waves, Sun, Zap, ShieldCheck, Sparkles, Truck } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";

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

export default function HomeLandingClient({ page }: { page: WebCmsPage }) {
  const hero = pickBlock(page, 0, {
    type: "hero",
    label: "Hero principal",
    title: "Pormucha",
    subtitle: "Kombucha",
    body: "Bebida fermentada naturalmente con probióticos vivos, ligera y refrescante.",
    buttonLabel: "Ir a la tienda",
    buttonHref: "/tienda",
    imageUrl: "/hero-bg.JPG",
    videoUrl: "/video-hero.mp4",
  });

  const benefitsTitle = pickBlock(page, 1, {
    type: "content",
    label: "Beneficios titulo",
    title: "Más que deliciosa, beneficiosa",
  });

  const benefitEnergy = pickBlock(page, 2, {
    type: "content",
    label: "Beneficio energia",
    title: "¡Aumenta tu energía!",
    body: "Con nutrientes orgánicos que revitalizan tu cuerpo y te mantienen en movimiento todo el día.",
  });

  const benefitDefense = pickBlock(page, 3, {
    type: "content",
    label: "Beneficio defensas",
    title: "Fortalece tus defensas",
    body: "Repleta de antioxidantes que ayudan a proteger y fortalecer el sistema inmunológico natural.",
  });

  const benefitBalance = pickBlock(page, 4, {
    type: "content",
    label: "Beneficio equilibrio",
    title: "Equilibra tu cuerpo",
    body: "Probióticos vivos que favorecen una digestión saludable y mantienen tu interior en sintonía.",
  });

  const benefitShipping = pickBlock(page, 5, {
    type: "content",
    label: "Beneficio envios",
    title: "Envíos a todo México",
    body: "Llevamos el bienestar desde Campeche hasta la puerta de tu casa, de forma rápida y segura.",
  });

  const flavorsTitle = pickBlock(page, 6, {
    type: "media",
    label: "Sabores titulo",
    title: "Sabores Regulares",
    imageUrl: "/flavor-side.JPG",
    buttonLabel: "Ir a la tienda",
    buttonHref: "/tienda",
  });

  const flavorJamaica = pickBlock(page, 7, {
    type: "content",
    label: "Sabor Jamaica",
    title: "Jamaica",
    body: "Vibrante y refrescante. El sabor floral que amamos con el boost de probióticos.",
  });

  const flavorGreenTea = pickBlock(page, 8, {
    type: "content",
    label: "Sabor Te Verde",
    title: "Té Verde",
    body: "Antioxidantes poderosos en cada sorbo. Suave, refrescante y lleno de beneficios.",
  });

  const flavorPineapple = pickBlock(page, 9, {
    type: "content",
    label: "Sabor Pina",
    title: "Piña",
    body: "Tropical y dulce natural. El sabor del paraíso en una botella fermentada con maestría.",
  });

  const flavorBlackTea = pickBlock(page, 10, {
    type: "content",
    label: "Sabor Te Negro",
    title: "Té Negro",
    body: "Intenso y tradicional. Para los que buscan un sabor robusto con toda la potencia.",
  });

  const instagramTitle = pickBlock(page, 11, {
    type: "content",
    label: "Instagram titulo",
    title: "Pormucha en Instagram",
    body: "Fermentación real. Bienestar cotidiano.",
  });

  const reelOne = pickBlock(page, 12, {
    type: "media",
    label: "Instagram reel 1",
    title: "HECHA CON TIEMPO",
    body: "Pequeños lotes, procesos reales y respeto por la fermentación.",
    videoUrl: "/reel-1.mp4",
  });

  const reelTwo = pickBlock(page, 13, {
    type: "media",
    label: "Instagram reel 2",
    title: "VIVA POR DENTRO",
    body: "Fermentada naturalmente con cultivos vivos que acompañan tu digestión.",
    videoUrl: "/reel-2.mp4",
  });

  const reelThree = pickBlock(page, 14, {
    type: "media",
    label: "Instagram reel 3",
    title: "LIGERA Y REFRESCANTE",
    body: "Bebida burbujeante, libre de sellos, sin azúcar añadida.",
    videoUrl: "/reel-3.mp4",
  });

  const cta = pickBlock(page, 15, {
    type: "cta",
    label: "CTA final",
    title: "El ritual diario de",
    subtitle: "cuidar tu centro.",
    body: "Un estilo de vida",
    buttonLabel: "Conoce más sobre nosotros",
    buttonHref: "/nosotros",
  });

  const subscription = pickBlock(page, 16, {
    type: "cta",
    label: "Suscripcion",
    title: "Pormucha",
    subtitle: "Comunidad",
    body: "Pormuchos momentos compartidos",
    buttonLabel: "Suscribirme ahora",
    buttonHref: "#suscripcion",
  });

  const heroWords = hero.title.split(" ").filter(Boolean);
  const heroPrimary = heroWords[0] || "Pormucha";
  const heroSecondary = heroWords.slice(1).join(" ") || hero.subtitle || "Kombucha";
  const heroImageUrl = resolveWebCmsAssetUrl(hero.imageUrl || "/hero-bg.JPG");
  const heroVideoUrl = resolveWebCmsAssetUrl(hero.videoUrl || "/video-hero.mp4");
  const flavorsImageUrl = resolveWebCmsAssetUrl(flavorsTitle.imageUrl || "/flavor-side.JPG");
  const heroImageUnoptimized = isWebCmsProxyUrl(heroImageUrl);
  const flavorsImageUnoptimized = isWebCmsProxyUrl(flavorsImageUrl);
  const reelOneUrl = resolveWebCmsAssetUrl(reelOne.videoUrl || "/reel-1.mp4");
  const reelTwoUrl = resolveWebCmsAssetUrl(reelTwo.videoUrl || "/reel-2.mp4");
  const reelThreeUrl = resolveWebCmsAssetUrl(reelThree.videoUrl || "/reel-3.mp4");

  return (
    <main className="min-h-screen bg-[#F5F2EB] selection:bg-[#8B3A28] selection:text-white font-sans overflow-x-hidden">
      <div className="absolute top-0 w-full z-50">
        <Navbar />
      </div>

      <section className="relative min-h-screen w-full overflow-hidden text-[#F5F2EB] flex flex-col justify-between pt-32 pb-12 md:pb-16 px-6 md:px-16 lg:px-24">
        <div className="absolute inset-0 z-0 bg-black">
          <Image
            src={heroImageUrl}
            alt={hero.label || "Pormucha Kombucha"}
            fill
            priority
            sizes="100vw"
            unoptimized={heroImageUnoptimized}
            className="object-cover brightness-[0.6] grayscale-[0.2]"
          />
          <video
            src={heroVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster={heroImageUrl}
            className="w-full h-full object-cover brightness-[0.60] grayscale-[0.2]"
          />
        </div>

        <div className="relative z-10 flex flex-col items-start transition-all md:max-w-4xl">
          <div className="text-left mb-6">
            <h1 className="font-serif text-[3.8rem] sm:text-[5rem] md:text-[6.5rem] leading-[0.8] tracking-tighter text-[#EBDAAB]">
              {heroPrimary}
              <br />
              <span className="font-light text-[3.2rem] sm:text-[4.2rem] md:text-[5.5rem]">{heroSecondary}</span>
            </h1>
          </div>
          <div className="text-left">
            <p className="text-lg md:text-[1.6rem] font-roboto leading-relaxed text-[#D6D8CB] max-w-2xl font-light">
              {hero.body || "Bebida fermentada naturalmente con probióticos vivos, ligera y refrescante."}
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center md:items-end gap-10 md:gap-12 mt-16 md:mt-0 ml-auto w-fit">
          <div className="hidden md:block font-mono text-[0.85rem] tracking-[0.2em] space-y-2.5 text-[#EBDAAB]" style={{ opacity: 0.8 }}>
            <div className="flex justify-end gap-10 border-b border-white/10 pb-2.5 mb-2.5">
              <span>100% Fresco</span>
              <span>&</span>
              <span>Natural</span>
            </div>
            <div className="flex justify-end gap-10">
              <span>Vida en Equilibrio</span>
              <span>MX</span>
            </div>
            <p className="opacity-60 pt-1 tracking-[0.15em] text-right text-[0.75rem]">Pormuchos momentos compartidos</p>
          </div>
          {hero.buttonLabel ? (
            <a
              href={hero.buttonHref || "/tienda"}
              className="bg-[#8B3A18] text-[#F5F2EB] px-10 py-4 sm:px-12 sm:py-5 rounded-md text-lg sm:text-xl font-sans font-bold tracking-widest hover:bg-[#6c2d13] transition-all hover:scale-105 shadow-xl border border-white/10 uppercase"
            >
              {hero.buttonLabel}
            </a>
          ) : null}
        </div>
      </section>

      <section className="bg-white py-20 px-6 md:px-12 z-20 relative shadow-sm">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center font-sans tracking-[0.15em] text-[#8B3A18] uppercase font-bold text-xl md:text-2xl mb-16">
            {benefitsTitle.title || "Más que deliciosa, beneficiosa"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8">
            <div className="flex flex-col items-center text-center group cursor-default">
              <div className="mb-6 p-4 rounded-full bg-[#F5F2EB] text-[#1A1A1A] group-hover:bg-[#8B3A18] group-hover:text-white transition-colors duration-300">
                <Zap size={36} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-2xl mb-3 text-[#1A1A1A]">{benefitEnergy.title || "¡Aumenta tu energía!"}</h3>
              <p className="font-light text-gray-600 text-sm md:text-base leading-relaxed max-w-[250px]">
                {benefitEnergy.body || "Con nutrientes orgánicos que revitalizan tu cuerpo y te mantienen en movimiento todo el día."}
              </p>
            </div>
            <div className="flex flex-col items-center text-center group cursor-default">
              <div className="mb-6 p-4 rounded-full bg-[#F5F2EB] text-[#1A1A1A] group-hover:bg-[#8B3A18] group-hover:text-white transition-colors duration-300">
                <ShieldCheck size={36} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-2xl mb-3 text-[#1A1A1A]">{benefitDefense.title || "Fortalece tus defensas"}</h3>
              <p className="font-light text-gray-600 text-sm md:text-base leading-relaxed max-w-[250px]">
                {benefitDefense.body || "Repleta de antioxidantes que ayudan a proteger y fortalecer el sistema inmunológico natural."}
              </p>
            </div>
            <div className="flex flex-col items-center text-center group cursor-default">
              <div className="mb-6 p-4 rounded-full bg-[#F5F2EB] text-[#1A1A1A] group-hover:bg-[#8B3A18] group-hover:text-white transition-colors duration-300">
                <Sparkles size={36} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-2xl mb-3 text-[#1A1A1A]">{benefitBalance.title || "Equilibra tu cuerpo"}</h3>
              <p className="font-light text-gray-600 text-sm md:text-base leading-relaxed max-w-[250px]">
                {benefitBalance.body || "Probióticos vivos que favorecen una digestión saludable y mantienen tu interior en sintonía."}
              </p>
            </div>
            <div className="flex flex-col items-center text-center group cursor-default">
              <div className="mb-6 p-4 rounded-full bg-[#F5F2EB] text-[#1A1A1A] group-hover:bg-[#8B3A18] group-hover:text-white transition-colors duration-300">
                <Truck size={36} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-2xl mb-3 text-[#1A1A1A]">{benefitShipping.title || "Envíos a todo México"}</h3>
              <p className="font-light text-gray-600 text-sm md:text-base leading-relaxed max-w-[250px]">
                {benefitShipping.body || "Llevamos el bienestar desde Campeche hasta la puerta de tu casa, de forma rápida y segura."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-24 border-t border-[#8B3A18]/10">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="hidden lg:block relative h-[650px] bg-gray-100 rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src={flavorsImageUrl}
              alt="Botellas de sabores regulares"
              fill
              sizes="(max-width: 1024px) 0px, 50vw"
              unoptimized={flavorsImageUnoptimized}
              className="object-cover object-center hover:scale-105 transition-transform duration-1000"
            />
          </div>
          <div>
            <h2 className="text-5xl md:text-6xl font-serif mb-12 underline decoration-[#8B3A18] decoration-2 underline-offset-8">
              {flavorsTitle.title || "Sabores Regulares"}
            </h2>
            <div className="space-y-12">
              <div className="flex gap-6 group cursor-default">
                <div className="pt-1 text-[#8B3A18] transition-transform group-hover:scale-110"><Waves size={40} strokeWidth={1} /></div>
                <div><h3 className="text-3xl font-serif mb-2 text-gray-900 group-hover:text-[#8B3A18] transition-colors">{flavorJamaica.title || "Jamaica"}</h3><p className="text-gray-600 font-light text-base leading-relaxed max-w-sm">{flavorJamaica.body || "Vibrante y refrescante. El sabor floral que amamos con el boost de probióticos."}</p></div>
              </div>
              <div className="flex gap-6 group cursor-default">
                <div className="pt-1 text-[#7D8B28] transition-transform group-hover:scale-110"><Leaf size={40} strokeWidth={1} /></div>
                <div><h3 className="text-3xl font-serif mb-2 text-gray-900 group-hover:text-[#7D8B28] transition-colors">{flavorGreenTea.title || "Té Verde"}</h3><p className="text-gray-600 font-light text-base leading-relaxed max-w-sm">{flavorGreenTea.body || "Antioxidantes poderosos en cada sorbo. Suave, refrescante y lleno de beneficios."}</p></div>
              </div>
              <div className="flex gap-6 group cursor-default">
                <div className="pt-1 text-[#E6B800] transition-transform group-hover:scale-110"><Sun size={40} strokeWidth={1} /></div>
                <div><h3 className="text-3xl font-serif mb-2 text-gray-900 group-hover:text-[#E6B800] transition-colors">{flavorPineapple.title || "Piña"}</h3><p className="text-gray-600 font-light text-base leading-relaxed max-w-sm">{flavorPineapple.body || "Tropical y dulce natural. El sabor del paraíso en una botella fermentada con maestría."}</p></div>
              </div>
              <div className="flex gap-6 group cursor-default">
                <div className="pt-1 text-[#2C2C2C] transition-transform group-hover:scale-110"><Leaf size={40} strokeWidth={1} /></div>
                <div><h3 className="text-3xl font-serif mb-2 text-gray-900 group-hover:text-[#2C2C2C] transition-colors">{flavorBlackTea.title || "Té Negro"}</h3><p className="text-gray-600 font-light text-base leading-relaxed max-w-sm">{flavorBlackTea.body || "Intenso y tradicional. Para los que buscan un sabor robusto con toda la potencia."}</p></div>
              </div>
            </div>

            {flavorsTitle.buttonLabel ? (
              <div className="mt-14">
                <a href={flavorsTitle.buttonHref || "/tienda"} className="inline-block bg-[#1A1A1A] text-white px-10 py-4 rounded-md text-lg font-sans font-bold tracking-widest hover:bg-[#8B3A18] transition-colors shadow-xl uppercase">
                  {flavorsTitle.buttonLabel}
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="bg-[#EAE7DD] py-24 px-6 md:px-12 text-[#1A1A1A]">
        <div className="text-center mb-16 space-y-4">
          <h2 className="font-serif text-[3.5rem] md:text-[5.5rem] leading-[0.85] tracking-tighter text-[#1A1A1A]">
            P<span className="italic font-light">o</span>rmucha<span className="text-sm align-top">®</span> <br />
            <span className="font-light text-[2.5rem] md:text-[4rem]">{instagramTitle.title.replace(/^Pormucha\s*/i, "") || "en Instagram"}</span>
          </h2>
          <p className="text-xl md:text-2xl font-light tracking-wide text-gray-800 pt-4">
            {instagramTitle.body || "Fermentación real. Bienestar cotidiano."}
          </p>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <a href="https://www.instagram.com/pormuchakombucha/" target="_blank" className="group flex flex-col text-center">
            <div className="aspect-[4/5] bg-gray-300 overflow-hidden mb-8 relative rounded-2xl shadow-xl">
              <video src={reelOneUrl} autoPlay loop muted playsInline preload="none" className="object-cover w-full h-full transform transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
            </div>
            <h3 className="font-sans text-xl tracking-[0.2em] uppercase mb-4 font-bold">{reelOne.title || "HECHA CON TIEMPO"}</h3>
            <p className="text-gray-600 font-light leading-relaxed px-4">{reelOne.body || "Pequeños lotes, procesos reales y respeto por la fermentación."}</p>
          </a>
          <a href="https://www.instagram.com/pormuchakombucha/" target="_blank" className="group flex flex-col text-center">
            <div className="aspect-[4/5] bg-gray-300 overflow-hidden mb-8 relative rounded-2xl shadow-xl">
              <video src={reelTwoUrl} autoPlay loop muted playsInline preload="none" className="object-cover w-full h-full transform transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
            </div>
            <h3 className="font-sans text-xl tracking-[0.2em] uppercase mb-4 font-bold">{reelTwo.title || "VIVA POR DENTRO"}</h3>
            <p className="text-gray-600 font-light leading-relaxed px-4">{reelTwo.body || "Fermentada naturalmente con cultivos vivos que acompañan tu digestión."}</p>
          </a>
          <a href="https://www.instagram.com/pormuchakombucha/" target="_blank" className="group flex flex-col text-center">
            <div className="aspect-[4/5] bg-gray-300 overflow-hidden mb-8 relative rounded-2xl shadow-xl">
              <video src={reelThreeUrl} autoPlay loop muted playsInline preload="none" className="object-cover w-full h-full transform transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
            </div>
            <h3 className="font-sans text-xl tracking-[0.2em] uppercase mb-4 font-bold">{reelThree.title || "LIGERA Y REFRESCANTE"}</h3>
            <p className="text-gray-600 font-light leading-relaxed px-4">{reelThree.body || "Bebida burbujeante, libre de sellos, sin azúcar añadida."}</p>
          </a>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#F5F2EB] py-32 flex flex-col items-center justify-center border-t border-[#8B3A18]/5">
        <motion.div
          animate={{ x: [0, -2000] }}
          transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
          className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap opacity-[0.03] pointer-events-none select-none"
        >
          <span className="text-[12rem] font-serif font-bold tracking-tighter">
            CUIDA TU CENTRO • VIVE PORMUCHA • FERMENTACIÓN REAL • CUIDA TU CENTRO • VIVE PORMUCHA • FERMENTACIÓN REAL •
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, margin: "-100px" }}
          className="relative z-10 text-center px-6 flex flex-col items-center"
        >
          <span className="font-mono text-[10px] sm:text-xs tracking-[0.4em] text-[#8B3A18] uppercase font-bold">
            {cta.body || "Un estilo de vida"}
          </span>
          <h3 className="font-serif text-4xl sm:text-5xl md:text-6xl text-[#1A1A1A] mt-6 max-w-3xl mx-auto leading-tight">
            {cta.title || "El ritual diario de"} <br className="hidden md:block" />
            <span className="italic text-[#8B3A18]">{cta.subtitle || "cuidar tu centro."}</span>
          </h3>

          {cta.buttonLabel ? (
            <div className="mt-12">
              <a href={cta.buttonHref || "/nosotros"} className="inline-block border border-[#8B3A18] text-[#8B3A18] px-8 py-3.5 rounded-md text-sm sm:text-base font-sans font-bold tracking-widest hover:bg-[#8B3A18] hover:text-[#F5F2EB] transition-colors shadow-sm hover:shadow-md uppercase">
                {cta.buttonLabel}
              </a>
            </div>
          ) : null}
        </motion.div>
      </section>

      <section className="relative z-30 bg-[#F5F2EB] pb-16 md:pb-24">
        <SubscriptionLanding
          eyebrow={subscription.label || "Pormuchos momentos compartidos"}
          titleLine1="Suscríbete a"
          titleLine2={subscription.title || "Pormucha"}
          highlightLine={subscription.subtitle || "Comunidad"}
          quote={subscription.body || "\"Pormuchos momentos compartidos\""}
          description="Sé el primero en enterarte de nuevos sabores estacionales, beneficios para la salud y promociones exclusivas."
          anchorId={subscription.buttonHref?.replace("#", "") || "suscripcion"}
        />
      </section>

      <Footer />
    </main>
  );
}
