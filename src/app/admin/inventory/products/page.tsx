import { db } from "@/lib/db";
import { ProductInventoryManager } from "@/components/admin/ProductInventoryManager";

export default async function InventoryProductsPage() {
  const [flavors, products, locations] = await Promise.all([
    db.flavor.findMany({
      where: { isArchived: false },
      include: {
        locationStocks: { include: { location: true } },
        movements: {
          orderBy: { createdAt: "desc" },
          take: 12,
          include: {
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.product.findMany({
      where: { isArchived: false },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.location.findMany({ where: { isArchived: false }, orderBy: { isDefault: "desc" } }),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Inventario</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Inventario de productos</h1>
        <p className="mt-2 text-sm text-slate-500">Producto terminado y botellas etiquetadas por ubicación.</p>
      </section>

      <ProductInventoryManager
        flavors={flavors.map((flavor: any) => ({
          ...flavor,
          locationStocks: flavor.locationStocks.map((stock: any) => ({
            ...stock,
            quantity: Number(stock.quantity),
          })),
          movements: flavor.movements.map((movement: any) => ({
            ...movement,
            quantity: Number(movement.quantity),
            createdAt: movement.createdAt.toISOString(),
          })),
        }))}
        products={products.map((product: any) => ({
          ...product,
          price: Number(product.price || 0),
        }))}
        locations={locations}
      />
    </div>
  );
}
