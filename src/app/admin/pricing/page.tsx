import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PricingManager } from "@/components/admin/PricingManager";

interface PricingPageProps {
  searchParams: {
    flavor?: string;
  };
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;

  if (role !== "admin") {
    redirect("/perfil");
  }

  const resolvedParams = await searchParams;
  const flavorId = resolvedParams?.flavor;

  const flavors = await db.flavor.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
  });

  let selectedFlavor: any = null;
  if (flavorId) {
    selectedFlavor = await db.flavor.findUnique({
      where: { id: flavorId },
      include: {
        priceScales: { orderBy: { minQuantity: "asc" } },
        discounts: { orderBy: { createdAt: "desc" } },
        priceHistory: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Catálogo</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Precios</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Precio base, umbrales de mayoreo, escalas y descuentos con historial.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Sabores</h2>
          <div className="mt-4 space-y-2">
            {flavors.map((flavor: any) => (
              <a
                key={flavor.id}
                href={`?flavor=${flavor.id}`}
                className={`block rounded-2xl border p-4 transition ${
                  selectedFlavor?.id === flavor.id
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <p className="font-bold">{flavor.name}</p>
                <p className={`mt-1 text-xs ${selectedFlavor?.id === flavor.id ? "text-slate-300" : "text-slate-500"}`}>
                  {Number(flavor.basePrice || flavor.price || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                </p>
              </a>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          {selectedFlavor ? (
            <>
              <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-950">{selectedFlavor.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">Controles de precio e historial de descuentos</p>
                  </div>
                  {selectedFlavor.image && (
                    <img src={selectedFlavor.image} alt={selectedFlavor.name} className="h-20 w-20 rounded-2xl object-cover" />
                  )}
                </div>
              </div>

              <PricingManager flavor={selectedFlavor} />
            </>
          ) : (
            <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm">
              Selecciona un sabor para editar su precio.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
