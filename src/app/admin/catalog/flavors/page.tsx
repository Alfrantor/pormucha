import Link from "next/link";
import { db } from "@/lib/db";
import { CatalogSectionPage } from "../_components/CatalogSectionPage";
import { Sparkles, Tag } from "lucide-react";

export default async function CatalogFlavorsPage() {
  const flavors = await db.flavor.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: 24,
  });

  const activeFlavors = flavors.filter((flavor) => !flavor.isArchived);
  const archivedFlavors = flavors.filter((flavor) => flavor.isArchived);

  return (
    <div className="space-y-6">
      <CatalogSectionPage
        eyebrow="Catalogo"
        title="Sabores"
        description="Aquí quedan los sabores regulares, euro y cualquier variante comercial que se use en POS, tienda o suscripciones."
        stats={[
          { label: "Sabores activos", value: activeFlavors.length },
          { label: "Sabores ocultos", value: archivedFlavors.length },
          { label: "Con imagen", value: activeFlavors.filter((flavor) => Boolean(flavor.image || flavor.imageEuro)).length },
        ]}
        cards={[
          { href: "/admin/catalog/products?scope=web", title: "Packs y suscripciones", desc: "Usa los sabores en tienda y en el checkout web", icon: <Tag size={18} />, meta: "Ver catálogo comercial" },
          { href: "/admin/pricing", title: "Precios", desc: "Ajusta precios base, descuentos y escalas", icon: <Sparkles size={18} />, meta: "Control de precio" },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {flavors.map((flavor) => {
          const resolvedPrice = Number(flavor.basePrice ?? flavor.price ?? 0);
          return (
            <article
              key={flavor.id}
              className={`rounded-[1.6rem] border p-5 shadow-sm ${flavor.isArchived ? "border-amber-200 bg-amber-50/70 opacity-80" : "border-slate-200 bg-white"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Sabor</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{flavor.name}</h2>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                    flavor.isArchived ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {flavor.isArchived ? "Oculto" : "Visible"}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-500">Precio actual: <span className="font-black text-slate-950">{resolvedPrice.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</span></p>
              <p className="mt-1 text-xs text-slate-400">Unidad: {flavor.unitCount ?? 6} botellas por pack equivalente</p>
              <div className="mt-4 flex gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                <span className="rounded-full bg-slate-100 px-3 py-1">POS</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Web</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Inventario</span>
              </div>
              {flavor.image || flavor.imageEuro ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {flavor.image ? <img src={flavor.image} alt={flavor.name} className="h-28 w-full rounded-2xl object-cover" /> : null}
                  {flavor.imageEuro ? <img src={flavor.imageEuro} alt={`${flavor.name} euro`} className="h-28 w-full rounded-2xl object-cover" /> : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <div className="flex justify-start">
        <Link href="/admin/catalog/products" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
          Ir a edición comercial
        </Link>
      </div>
    </div>
  );
}
