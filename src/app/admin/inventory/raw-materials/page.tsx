import { db } from "@/lib/db";
import { TabMateriasPrimas } from "@/components/admin/TabMateriasPrimas";

export default async function RawMaterialsInventoryPage() {
  const [rawMaterials, locations] = await Promise.all([
    db.rawMaterial.findMany({
      include: {
        stocks: { include: { location: { select: { id: true, name: true } } } },
        movements: { orderBy: { createdAt: "desc" }, take: 50 },
      },
      orderBy: { name: "asc" },
    }).then((rows) => rows.map((m: any) => ({
      ...m,
      minStock: Number(m.minStock || 0),
      cost: m.cost != null ? Number(m.cost) : null,
      stocks: m.stocks.map((s: any) => ({ ...s, quantity: Number(s.quantity) })),
      movements: m.movements.map((mv: any) => ({ ...mv, quantity: Number(mv.quantity), createdAt: mv.createdAt.toISOString() })),
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }))),
    db.location.findMany({ where: { isArchived: false }, orderBy: { isDefault: "desc" } }),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Inventario</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Materia prima</h1>
      </section>
      <TabMateriasPrimas rawMaterials={rawMaterials} locations={locations} />
    </div>
  );
}
