import Link from "next/link";
import { db } from "@/lib/db";
import { CatalogSectionPage } from "../_components/CatalogSectionPage";
import { Box, Droplets } from "lucide-react";

export default async function CatalogRawMaterialsPage() {
  const rawMaterials = await db.rawMaterial.findMany({
    where: { isArchived: false },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const categories = [...new Set(rawMaterials.map((material) => material.category || "Sin categoría"))];

  return (
    <div className="space-y-6">
      <CatalogSectionPage
        eyebrow="Catalogo"
        title="Materias primas y consumibles"
        description="Aquí concentramos insumos operativos, clasificados por tipo y unidad para producción, recepción e inventario."
        stats={[
          { label: "Insumos activos", value: rawMaterials.length },
          { label: "Categorías", value: categories.length },
          { label: "Con stock mínimo", value: rawMaterials.filter((material) => Number(material.minStock ?? 0) > 0).length },
        ]}
        cards={[
          { href: "/admin/inventory/raw-materials", title: "Inventario de materia prima", desc: "Stock, movimientos y control por ubicación", icon: <Box size={18} />, meta: "Control operativo" },
          { href: "/admin/production?tab=formulas", title: "Recetas", desc: "Consume insumos desde las fórmulas de producción", icon: <Droplets size={18} />, meta: "Uso en procesos" },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const items = rawMaterials.filter((material) => (material.category || "Sin categoría") === category);
          return (
            <article key={category} className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black tracking-tight text-slate-950">{category}</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {items.length}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {items.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="font-bold text-slate-950">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.unit || "unidad"} · mínimo {Number(item.minStock ?? 0)} · costo {Number(item.cost ?? 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <div className="flex justify-start">
        <Link href="/admin/inventory/raw-materials" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
          Ir al inventario de insumos
        </Link>
      </div>
    </div>
  );
}
