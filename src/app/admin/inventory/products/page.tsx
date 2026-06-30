import { db } from "@/lib/db";
import { Package2, Beer } from "lucide-react";

export default async function InventoryProductsPage() {
  const [flavors, products, locations] = await Promise.all([
    db.flavor.findMany({
      where: { isArchived: false },
      include: { locationStocks: { include: { location: true } } },
      orderBy: { name: "asc" },
    }),
    db.product.findMany({
      where: { isArchived: false },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.location.findMany({ where: { isArchived: false }, orderBy: { isDefault: "desc" } }),
  ]);

  const totalFlavorStock = flavors.reduce((sum, flavor: any) => sum + flavor.locationStocks.reduce((s: number, stock: any) => s + Number(stock.quantity), 0), 0);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Inventario</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Inventario de productos</h1>
        <p className="mt-2 text-sm text-slate-500">Producto terminado y botellas etiquetadas por ubicación.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Sabores activos" value={flavors.length} />
        <Metric label="Unidades de sabor" value={totalFlavorStock} />
        <Metric label="Packs" value={products.length} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Beer size={18} className="text-slate-500" />
            <h2 className="text-xl font-black text-slate-950">Botellas</h2>
          </div>
          <div className="mt-4 space-y-3">
            {flavors.map((flavor: any) => {
              const total = flavor.locationStocks.reduce((s: number, stock: any) => s + Number(stock.quantity), 0);
              return (
                <div key={flavor.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-slate-950">{flavor.name}</p>
                      <p className="text-xs text-slate-400">{flavor.slug}</p>
                    </div>
                    <p className="text-xl font-black text-slate-950">{total}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {flavor.locationStocks.map((stock: any) => (
                      <span key={stock.id} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                        {stock.location?.name}: {Number(stock.quantity)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Package2 size={18} className="text-slate-500" />
            <h2 className="text-xl font-black text-slate-950">Packs</h2>
          </div>
          <div className="mt-4 space-y-3">
            {products.map((product: any) => (
              <div key={product.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-black text-slate-950">{product.name}</p>
                    <p className="text-xs text-slate-400">{product.quantity} botellas por pack</p>
                  </div>
                  <p className="text-lg font-black text-slate-950">
                    {Number(product.price).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Esta sección es el puente entre el catálogo y el stock. Úsala para mantener alineados los packs y el inventario de sabores con lo que realmente hay disponible.
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-lg">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/65">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}
