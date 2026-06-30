import { db } from "@/lib/db";
import { Package2 } from "lucide-react";

export default async function CatalogProductsPage() {
  const [products, flavors] = await Promise.all([
    db.product.findMany({
      where: { isArchived: false },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.flavor.findMany({
      where: { isArchived: false },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Catálogo</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Productos</h1>
        <p className="mt-2 text-sm text-slate-500">Packs, sabores y su organización dentro del catálogo.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Packs" value={products.length} />
        <Metric label="Sabores" value={flavors.length} />
        <Metric label="Elementos en catálogo" value={products.length + flavors.length} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
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
                  <p className="font-black text-slate-950">{Number(product.price || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Package2 size={18} className="text-slate-500" />
            <h2 className="text-xl font-black text-slate-950">Sabores</h2>
          </div>
          <div className="mt-4 space-y-3">
            {flavors.map((flavor: any) => (
              <div key={flavor.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-black text-slate-950">{flavor.name}</p>
                    <p className="text-xs text-slate-400">{flavor.slug}</p>
                  </div>
                  <p className="font-black text-slate-950">{Number(flavor.basePrice || flavor.price || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</p>
                </div>
              </div>
            ))}
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
