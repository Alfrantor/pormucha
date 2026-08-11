"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FAQItem from "@/components/FAQItem";
import SubscribeButton from "@/components/SubscribeButton";
import { resolveWebCmsAssetUrl, type WebCmsBlock, type WebCmsPage } from "@/lib/web-cms";
import { HandHeart, Info, Leaf, RefreshCw } from "lucide-react";

type SubscriptionPlan = {
  id: string;
  name: string;
  description: string | null;
  price: unknown;
  interval: string;
  intervalCount: number;
  product: {
    name: string;
    quantity: number;
    price: unknown;
    clubDiscountPercent: unknown;
    image: string | null;
    subscriptionNote: string | null;
    subscriptionBenefit1: string | null;
    subscriptionBenefit2: string | null;
    subscriptionBenefit3: string | null;
  } | null;
};

function getPlanDisplayPrice(plan: {
  price?: unknown;
  product?: { price?: unknown; clubDiscountPercent?: unknown; image?: string | null } | null;
}) {
  const productPrice = Number(plan.product?.price ?? 0);
  const discountPercent = Number(plan.product?.clubDiscountPercent ?? 0);

  if (Number.isFinite(productPrice) && productPrice > 0) {
    return Math.max(0, productPrice * (1 - discountPercent / 100));
  }

  const planPrice = Number(plan.price ?? 0);
  return Number.isFinite(planPrice) ? planPrice : 0;
}

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

function getSubscriptionBenefits(plan: SubscriptionPlan) {
  const benefits = [
    `${plan.product?.quantity ?? 0} Botellas de kombucha fresca`,
    plan.product?.subscriptionBenefit1 || "Sabores 100% personalizables",
    plan.product?.subscriptionBenefit2 || "Cobertura nacional con envio seguro",
    plan.product?.subscriptionBenefit3 || "",
  ];

  return benefits.filter((item) => item.trim().length > 0);
}

export default function SuscripcionesPageClient({
  page,
  plans,
}: {
  page: WebCmsPage;
  plans: SubscriptionPlan[];
}) {
  const hero = pickBlock(page, 0, {
    type: "hero",
    label: "Hero suscripciones",
    title: "Suscripciones",
    subtitle: "Vitalidad en automatico",
    body: "Asegura tu dosis de probioticos sin preocuparte de volver a pedir. Tu kombucha favorita, entregada mes con mes.",
    imageUrl: "/hero-bg.JPG",
  });

  const habitTitle = pickBlock(page, 1, {
    type: "content",
    label: "Habito titulo",
    title: "El habito de la fermentacion",
    subtitle: "Por que de forma regular?",
  });
  const habitAutomatic = pickBlock(page, 2, { type: "content", label: "Habito automatico", title: "EN AUTOMATICO", body: "" });
  const habitResults = pickBlock(page, 3, { type: "content", label: "Habito resultados", title: "RESULTADOS REALES", body: "" });
  const habitPrice = pickBlock(page, 4, { type: "content", label: "Habito precio", title: "PRECIO ESPECIAL", body: "" });

  const clubTitle = pickBlock(page, 5, {
    type: "content",
    label: "Club titulo",
    title: "Beneficios de pertenecer al Club Pormucha",
    subtitle: "Tu inversion a largo plazo",
  });
  const singleTitle = pickBlock(page, 6, { type: "content", label: "Compra unica titulo", title: "Compra Unica" });
  const singleBullets = [
    pickBlock(page, 7, { type: "content", label: "Compra unica 1", title: "Descuento por volumen" }),
    pickBlock(page, 8, { type: "content", label: "Compra unica 2", title: "10% Descuento extra" }),
    pickBlock(page, 9, { type: "content", label: "Compra unica 3", title: "Sabores exclusivos" }),
    pickBlock(page, 10, { type: "content", label: "Compra unica 4", title: "Reposicion automatica" }),
  ];
  const clubCardTitle = pickBlock(page, 11, {
    type: "content",
    label: "Club pormucha titulo",
    title: "Membresia Club Pormucha",
    subtitle: "Mejor Valor",
  });
  const clubBullets = [
    pickBlock(page, 12, { type: "content", label: "Club pormucha 1", title: "Descuento por volumen" }),
    pickBlock(page, 13, { type: "content", label: "Club pormucha 2", title: "10% Descuento extra SIEMPRE" }),
    pickBlock(page, 14, { type: "content", label: "Club pormucha 3", title: "Sabores de temporada exclusivos" }),
    pickBlock(page, 15, { type: "content", label: "Club pormucha 4", title: "Reposicion totalmente automatica" }),
    pickBlock(page, 16, { type: "content", label: "Club pormucha 5", title: "Cancelacion libre de 1-clic" }),
  ];

  const faqTitle = pickBlock(page, 17, {
    type: "content",
    label: "FAQ suscripciones titulo",
    title: "Preguntas Frecuentes",
    subtitle: "Resuelve tus dudas",
  });
  const faqs = [
    pickBlock(page, 18, { type: "faq", label: "FAQ suscripciones 1", title: "", body: "" }),
    pickBlock(page, 19, { type: "faq", label: "FAQ suscripciones 2", title: "", body: "" }),
    pickBlock(page, 20, { type: "faq", label: "FAQ suscripciones 3", title: "", body: "" }),
    pickBlock(page, 21, { type: "faq", label: "FAQ suscripciones 4", title: "", body: "" }),
  ].filter((item) => item.title.trim() || item.body.trim());

  const cta = pickBlock(page, 22, {
    type: "cta",
    label: "CTA suscripciones",
    title: "Aun no estas decidido?",
    subtitle: "Una pequena probada",
    body: "Prueba nuestro Kit de Introduccion y dejanos convencerte con cada burbuja de nuestra fermentacion real.",
    buttonLabel: "Ver paquetes de tienda",
    buttonHref: "/tienda",
  });
  const heroImageUrl = resolveWebCmsAssetUrl(hero.imageUrl || "/hero-bg.JPG");

  const gridConfig =
    plans.length === 1
      ? "max-w-md mx-auto"
      : plans.length === 2
        ? "grid grid-cols-1 lg:grid-cols-2 max-w-5xl mx-auto gap-10"
        : plans.length === 3
          ? "grid grid-cols-1 lg:grid-cols-3 max-w-7xl mx-auto gap-8"
          : plans.length === 4
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 max-w-[1400px] mx-auto gap-6"
            : "flex flex-wrap justify-center gap-6 max-w-[1600px] mx-auto";

  return (
    <main className="min-h-screen bg-[#F5F2EB] selection:bg-[#8B3A28] selection:text-white font-sans">
      <div className="absolute top-0 z-50 w-full">
        <Navbar />
      </div>

      <section className="relative h-[80vh] w-full overflow-hidden text-[#F5F2EB]">
        <div className="absolute inset-0 z-0 bg-black">
          <div
            className="h-full w-full scale-105 bg-cover bg-center opacity-60"
            style={{ backgroundImage: `url('${heroImageUrl}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#F5F2EB]" />
        </div>

        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-6 text-center">
          <h1 className="mb-6 font-serif text-[3.5rem] leading-[0.9] tracking-tight text-[#EBDAAB] md:text-[6rem]">
            {hero.title}
            <br />
            <span className="text-[2.5rem] font-light md:text-[4.5rem]">{hero.subtitle}</span>
          </h1>
          <p className="max-w-2xl text-xl leading-relaxed text-[#D6D8CB] md:text-2xl">{hero.body}</p>
        </div>
      </section>

      <section className="border-b border-[#8B3A18]/10 bg-white py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-[#8B3A18]">{habitTitle.subtitle}</span>
            <h2 className="mt-6 font-serif text-4xl leading-tight text-[#1A1A1A] md:text-5xl">{habitTitle.title}</h2>
          </div>

          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            <div className="group flex flex-col items-center text-center">
              <div className="mb-6 rounded-full bg-[#EAE7DD] p-4 text-[#8B3A18] transition-transform group-hover:scale-110">
                <RefreshCw size={32} strokeWidth={1.5} />
              </div>
              <h3 className="mb-4 font-sans text-xl font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">{habitAutomatic.title}</h3>
              <p className="font-light leading-relaxed text-gray-600">{habitAutomatic.body}</p>
            </div>
            <div className="group flex flex-col items-center text-center">
              <div className="mb-6 rounded-full bg-[#EAE7DD] p-4 text-[#7D8B28] transition-transform group-hover:scale-110">
                <Leaf size={32} strokeWidth={1.5} />
              </div>
              <h3 className="mb-4 font-sans text-xl font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">{habitResults.title}</h3>
              <p className="font-light leading-relaxed text-gray-600">{habitResults.body}</p>
            </div>
            <div className="group flex flex-col items-center text-center">
              <div className="mb-6 rounded-full bg-[#EAE7DD] p-4 text-[#E6B800] transition-transform group-hover:scale-110">
                <HandHeart size={32} strokeWidth={1.5} />
              </div>
              <h3 className="mb-4 font-sans text-xl font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">{habitPrice.title}</h3>
              <p className="font-light leading-relaxed text-gray-600">{habitPrice.body}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#F5F2EB] py-24 px-6">
        <div className="pointer-events-none absolute top-0 right-0 h-full w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#8B3A18]/5 via-[#F5F2EB]/0 to-transparent" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <span className="mb-4 block font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-[#8B3A18] md:text-xs">{clubTitle.subtitle}</span>
            <h2 className="font-serif text-4xl text-[#1A1A1A] md:text-5xl lg:text-6xl">
              {clubTitle.title.split(" Club Pormucha")[0] || clubTitle.title}
              <br /> <span className="mt-2 inline-block italic text-[#8B3A18]">Club Pormucha</span>
            </h2>
          </div>

          <div className="flex flex-col items-center justify-center gap-8 md:flex-row md:items-stretch">
            <div className="relative mt-0 mb-0 flex w-full flex-col justify-between rounded-[2rem] border border-gray-100 bg-white p-8 opacity-90 shadow-sm transition-all hover:opacity-100 md:mt-8 md:mb-8 md:w-[45%] md:p-10">
              <div>
                <h3 className="mb-10 border-b border-gray-200 pb-6 text-center font-sans text-xl font-bold uppercase tracking-widest text-gray-700">
                  {singleTitle.title}
                </h3>
                <ul className="space-y-6 text-base font-normal text-gray-500 md:text-lg">
                  {singleBullets.map((item, index) => (
                    <li key={item.id} className={`flex items-center gap-4 ${index === 0 ? "text-gray-700" : ""}`}>
                      <span className={`${index === 0 ? "text-green-500" : "text-red-400"} w-6 text-center text-xl font-bold`}>
                        {index === 0 ? "✓" : "✕"}
                      </span>
                      {item.title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="group relative z-10 w-full overflow-hidden rounded-[2.2rem] p-1 shadow-2xl md:w-[55%] md:scale-110">
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#8B3A18] via-[#e2c17b] to-[#8B3A18] opacity-70 blur-md transition-opacity duration-1000 group-hover:opacity-100" />
              <div className="relative flex h-full flex-col justify-between rounded-[2rem] border border-[#8B3A18]/50 bg-[#1A1A1A] p-8 md:p-12">
                <div className="absolute top-0 right-0 mt-2 mr-2 p-5">
                  <span className="rounded-full bg-[#8B3A18] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg">
                    {clubCardTitle.subtitle}
                  </span>
                </div>

                <div>
                  <h3 className="mb-10 border-b border-white/10 pb-6 text-center font-serif text-3xl leading-tight text-[#EBDAAB] md:text-4xl">
                    {clubCardTitle.title.split(" Club Pormucha")[0] || "Membresia"}
                    <br />
                    <span className="font-light italic">Club Pormucha</span>
                  </h3>
                  <ul className="space-y-7 text-base font-light text-white md:text-lg">
                    {clubBullets.map((item) => (
                      <li key={item.id} className="flex items-center gap-4">
                        <span className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-[#EBDAAB] text-sm font-bold text-[#1A1A1A] shadow-[0_0_15px_rgba(235,218,171,0.4)]">
                          ✓
                        </span>
                        {item.title}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#EAE7DD] py-24 px-6">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#8B3A18] opacity-10 blur-[150px]" />
        <div className="relative z-10 w-full px-2 lg:px-6">
          <div className={gridConfig}>
            {plans.length > 0 ? (
              plans.map((plan, index) => {
                const isFeatured =
                  plans.length === 2 ? index === 1 : plans.length >= 3 ? index === Math.floor((plans.length - 1) / 2) : false;
                const bgImageURL =
                  plan.product?.image || (plan.name.includes("24") || plan.name.toLowerCase().includes("quincenal") ? "/pack-24.PNG" : "/pack-12.PNG");

                return (
                  <div
                    key={plan.id}
                    className={`${isFeatured ? "border border-[#8B3A18]/30 bg-[#1A1A1A] shadow-2xl" : "bg-white shadow-xl"} ${plans.length >= 5 ? "w-full sm:w-[320px]" : ""} group flex flex-col overflow-hidden rounded-2xl transition-transform duration-500 hover:-translate-y-2`}
                  >
                    {isFeatured ? (
                      <div className="bg-[#8B3A18] py-2 text-center text-xs font-bold uppercase tracking-[0.3em] text-white">
                        Mas Popular
                      </div>
                    ) : null}

                    <div className="relative h-64 shrink-0 overflow-hidden">
                      <div
                        className={`absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105 ${isFeatured ? "brightness-75 grayscale-[20%]" : ""}`}
                        style={{ backgroundImage: `url('${bgImageURL}')` }}
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t ${isFeatured ? "from-black/80" : "from-black/60"} to-transparent`} />
                      <h3 className={`absolute bottom-6 left-8 font-serif text-4xl ${isFeatured ? "text-[#EBDAAB]" : "text-white"}`}>{plan.name}</h3>
                    </div>

                    <div className="flex flex-grow flex-col p-8">
                      <div className={`mb-6 flex items-end gap-2 ${isFeatured ? "text-white" : ""}`}>
                        <span className={`font-sans text-4xl font-bold ${isFeatured ? "" : "text-[#1A1A1A]"}`}>
                          ${getPlanDisplayPrice(plan).toLocaleString("es-MX")}
                        </span>
                        <span className={`${isFeatured ? "text-white/50" : "text-gray-500"} mb-1 text-sm font-light uppercase tracking-widest`}>
                          MXN / {plan.intervalCount > 1 ? `${plan.intervalCount} ` : ""}
                          {plan.interval === "week" ? "Semana(s)" : "Mes(es)"}
                        </span>
                      </div>

                      {(plan.description || plan.product?.subscriptionNote || plan.product) ? (
                        <p className={`mb-6 text-sm italic ${isFeatured ? "text-gray-400" : "text-gray-500"}`}>
                          {plan.description || plan.product?.subscriptionNote || `Plan basado en entrega de ${plan.product?.name}`}
                        </p>
                      ) : null}

                      <ul className={`mb-8 flex-grow space-y-4 font-light ${isFeatured ? "text-gray-300" : "text-gray-700"}`}>
                        {getSubscriptionBenefits(plan).map((benefit) => (
                          <li key={`${plan.id}-${benefit}`} className="flex items-center gap-3">
                            <span className={isFeatured ? "text-[#EBDAAB]" : "text-[#8B3A18]"}>✓</span>
                            {benefit}
                          </li>
                        ))}
                      </ul>

                      <SubscribeButton planId={plan.id} isFeatured={isFeatured} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full flex flex-col items-center py-16 text-center font-light text-gray-500">
                <span className="mb-4 text-4xl">✨</span>
                <p className="font-serif text-2xl text-gray-700">Nuevos planes de suscripcion proximamente...</p>
                <p className="mt-3 text-sm opacity-70">Estamos afinando los ultimos detalles de la fermentacion para ti.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-[#8B3A18]/10 bg-white py-24 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 border-b pb-8 md:flex md:items-end md:justify-between">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-[#8B3A18]">{faqTitle.subtitle}</span>
              <h2 className="mt-4 font-serif text-4xl text-[#1A1A1A] md:text-5xl">{faqTitle.title}</h2>
            </div>
            <div className="mt-6 text-[#8B3A18] md:mt-0">
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

      <section className="relative overflow-hidden border-t-4 border-[#8B3A18] bg-[#1A1A1A] py-32 px-6 text-center text-[#F5F2EB]">
        <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-[#8B3A18]/20 blur-[120px]" />
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center">
          <span className="mb-4 block font-mono text-sm font-bold uppercase tracking-[0.4em] text-[#EBDAAB] drop-shadow-md">{cta.subtitle}</span>
          <h2 className="mb-8 font-serif text-5xl leading-tight text-white drop-shadow-lg md:text-7xl">{cta.title}</h2>
          <p className="mb-12 text-xl font-light text-gray-300 drop-shadow-md md:text-2xl">{cta.body}</p>
          {cta.buttonLabel ? (
            <a
              href={cta.buttonHref || "/tienda"}
              className="inline-block rounded-md border border-white/10 bg-[#8B3A18] px-12 py-5 text-xl font-bold uppercase tracking-widest text-[#EAE7DD] shadow-xl transition-all hover:scale-105 hover:bg-[#6c2d13] hover:shadow-2xl"
            >
              {cta.buttonLabel}
            </a>
          ) : null}
        </div>
      </section>

      <Footer />
    </main>
  );
}
