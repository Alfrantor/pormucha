"use client";

import { Instagram } from "lucide-react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import SubscriptionLanding from "@/components/SubscriptionLanding";
import { isWebCmsProxyUrl, resolveWebCmsAssetUrl, type WebCmsBlock, type WebCmsPage } from "@/lib/web-cms";

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

export default function PrelaunchLandingClient({ page }: { page: WebCmsPage }) {
  const hero = pickBlock(page, 0, {
    type: "hero",
    label: "Hero pre-lanzamiento",
    title: "Pormucha Kombucha",
    subtitle: "Pormucha · en vivo",
    body: "Estamos fermentando algo increíble. La frescura viva ahora en línea.",
    imageUrl: "/hero-bg.JPG",
    videoUrl: "/video-hero.mp4",
  });
  const launch = pickBlock(page, 1, {
    type: "content",
    label: "Beneficio de lanzamiento",
    title: "Queremos que seas el primero en probar la frescura.",
    body: "Registra tus datos y obtén un descuento especial el día de nuestra apertura en línea oficial.",
  });
  const subscription = pickBlock(page, 2, {
    type: "cta",
    label: "Formulario",
    title: "Suscríbete a Pormucha",
    subtitle: "Pormucha Comunidad",
    body: "Sé el primero en enterarte de nuevos sabores estacionales, beneficios para la salud y promociones exclusivas.",
  });

  const [titleLine1, ...restTitle] = hero.title.split(" ");
  const titleLine2 = restTitle.join(" ") || "Kombucha";
  const heroImageUrl = resolveWebCmsAssetUrl(hero.imageUrl || "/hero-bg.JPG");
  const heroVideoUrl = resolveWebCmsAssetUrl(hero.videoUrl || "/video-hero.mp4");
  const heroImageUnoptimized = isWebCmsProxyUrl(heroImageUrl);

  return (
    <main className="min-h-screen bg-[#F5F2EB] font-sans overflow-x-hidden selection:bg-[#8B3A28] selection:text-white">
      <div className="absolute top-0 w-full z-50">
        <Navbar />
      </div>

      <section className="relative min-h-screen w-full overflow-hidden flex items-center">
        <div className="absolute inset-0 z-0 bg-black">
          <Image
            src={heroImageUrl}
            alt={hero.label || "Pormucha Kombucha"}
            fill
            priority
            sizes="100vw"
            unoptimized={heroImageUnoptimized}
            className="object-cover brightness-[0.65] grayscale-[0.15]"
          />
          <video
            src={heroVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster={heroImageUrl}
            className="w-full h-full object-cover brightness-[0.65] grayscale-[0.15]"
          />
        </div>

        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: "linear-gradient(to right, rgba(245,242,235,0.82) 0%, rgba(245,242,235,0.45) 40%, transparent 70%)",
          }}
        />

        <div className="relative z-20 px-8 md:px-20 max-w-4xl">
          <p className="font-mono text-[10px] tracking-[0.35em] text-[#8B3A18] uppercase mb-6 opacity-80">
            {hero.subtitle || "Pormucha · en vivo"}
          </p>

          <h1 className="font-serif leading-[0.82] tracking-tighter text-[#1A1A1A]">
            <span className="block text-[4rem] sm:text-[6rem] md:text-[8rem]">
              {titleLine1}
            </span>
            <span className="block text-[3.2rem] sm:text-[5rem] md:text-[6.5rem] text-[#8B3A18] font-light">
              {titleLine2}
            </span>
          </h1>

          <div className="w-16 h-[1px] bg-[#8B3A18]/40 my-8" />

          <p className="font-serif text-xl md:text-2xl text-[#1A1A1A]/70 italic leading-relaxed max-w-md">
            {hero.body || "Estamos fermentando algo increíble. La frescura viva ahora en línea."}
          </p>

          {hero.buttonLabel ? (
            <a
              href={hero.buttonHref || "/tienda"}
              className="inline-flex mt-10 bg-[#8B3A18] text-[#F5F2EB] px-8 py-4 rounded-md text-sm sm:text-base font-sans font-bold tracking-widest hover:bg-[#6c2d13] transition-all hover:scale-105 shadow-xl border border-white/10 uppercase"
            >
              {hero.buttonLabel}
            </a>
          ) : null}
        </div>

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

      <section className="bg-[#F5F2EB] py-24 px-6 md:px-16 text-center border-b border-[#8B3A18]/10">
        <p className="font-mono text-[9px] tracking-[0.5em] text-[#8B3A18] uppercase mb-6">
          {launch.label || "Beneficio de lanzamiento"}
        </p>
        <h2 className="font-serif text-[2.4rem] sm:text-[3.2rem] md:text-[4rem] leading-[1.05] tracking-tight text-[#1A1A1A] max-w-3xl mx-auto">
          {launch.title || "Queremos que seas el primero en probar la frescura."}
        </h2>
        <p className="mt-6 text-base md:text-lg text-gray-600 font-light max-w-xl mx-auto leading-relaxed">
          {launch.body || "Registra tus datos y obtén un descuento especial el día de nuestra apertura en línea oficial."}
        </p>
      </section>

      <SubscriptionLanding
        eyebrow={subscription.label || "Pormuchos momentos compartidos"}
        titleLine1="Suscríbete a"
        titleLine2={subscription.subtitle || "Pormucha"}
        highlightLine={subscription.title || "Comunidad"}
        quote={subscription.body || "\"Pormuchos momentos compartidos\""}
        description="Sé el primero en enterarte de nuevos sabores estacionales, beneficios para la salud y promociones exclusivas."
        anchorId={subscription.buttonHref?.replace("#", "") || "suscripcion"}
      />

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
