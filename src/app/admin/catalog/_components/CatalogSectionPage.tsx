import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export type CatalogCard = {
  href: string;
  title: string;
  desc: string;
  icon: ReactNode;
  meta?: string;
};

export function CatalogSectionPage({
  eyebrow,
  title,
  description,
  stats,
  cards,
}: {
  eyebrow: string;
  title: string;
  description: string;
  stats: Array<{ label: string; value: string | number }>;
  cards: CatalogCard[];
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="rounded-[1.4rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-lg">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/65">{item.label}</p>
            <p className="mt-3 text-3xl font-black">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-2xl bg-slate-950 p-3 text-white shadow-lg shadow-slate-950/10">
                {card.icon}
              </div>
              <ArrowRight
                size={16}
                className="mt-2 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-700"
              />
            </div>
            <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{card.desc}</p>
            {card.meta ? <p className="mt-3 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">{card.meta}</p> : null}
          </Link>
        ))}
      </section>
    </div>
  );
}
