import Link from "next/link";
import { db } from "@/lib/db";
import { CatalogSectionPage } from "../_components/CatalogSectionPage";
import { MapPinned, Warehouse } from "lucide-react";

export default async function CatalogLocationsPage() {
  const locations = await db.location.findMany({
    where: { isArchived: false },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <CatalogSectionPage
        eyebrow="Catalogo"
        title="Almacenes / plantas"
        description="Aquí están las ubicaciones operativas del ERP. Hoy deberían vivir Lerma, Mérida y cualquier otra planta o almacén futuro."
        stats={[
          { label: "Ubicaciones activas", value: locations.length },
          { label: "Planta principal", value: locations.find((loc) => loc.isDefault)?.name ?? "Sin definir" },
          { label: "Con dirección", value: locations.filter((loc) => Boolean(loc.address)).length },
        ]}
        cards={[
          { href: "/admin/inventory", title: "Inventarios", desc: "Stock por ubicación, materia prima y traspasos", icon: <Warehouse size={18} />, meta: "Uso por planta" },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {locations.map((location) => (
          <article
            key={location.id}
            className={`rounded-[1.6rem] border p-5 shadow-sm ${location.isDefault ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[0.35em] ${location.isDefault ? "text-white/60" : "text-slate-400"}`}>Planta / almacén</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">{location.name}</h2>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                  location.isDefault ? "bg-white/15 text-white" : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {location.isDefault ? "Principal" : "Secundaria"}
              </span>
            </div>
            <p className={`mt-3 text-sm ${location.isDefault ? "text-slate-200" : "text-slate-500"}`}>
              {location.address || "Sin dirección registrada"}
            </p>
          </article>
        ))}
      </section>

      <div className="flex justify-start">
        <Link href="/admin/inventory" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
          Ir a inventarios
        </Link>
      </div>
    </div>
  );
}
