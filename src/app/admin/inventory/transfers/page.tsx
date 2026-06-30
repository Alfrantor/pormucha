import { db } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TabEnvios } from "@/components/admin/TabEnvios";

export default async function TransfersInventoryPage() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;
  const user = await currentUser();

  if (role !== "admin" && role !== "vendedor") {
    redirect("/perfil");
  }

  const [activeFlavors, activeLocations, transfers] = await Promise.all([
    db.flavor.findMany({
      where: { isArchived: false },
      include: { locationStocks: true },
      orderBy: { name: "asc" },
    }),
    db.location.findMany({ where: { isArchived: false }, orderBy: { isDefault: "desc" } }),
    db.transfer.findMany({
      include: { flavor: true, fromLocation: true, toLocation: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const flavors = activeFlavors.map((f: any) => ({
    ...f,
    price: Number(f.price || 0),
    basePrice: Number(f.basePrice || 0),
    wholesalePrice: f.wholesalePrice ? Number(f.wholesalePrice) : null,
    locationStocks: f.locationStocks.map((s: any) => ({ ...s, quantity: Number(s.quantity) })),
  }));

  const locationList = activeLocations.map((loc: any) => ({ ...loc }));
  const transferList = transfers.map((t: any) => ({
    ...t,
    flavor: t.flavor ? {
      ...t.flavor,
      price: Number(t.flavor.price || 0),
      basePrice: Number(t.flavor.basePrice || 0),
      wholesalePrice: t.flavor.wholesalePrice ? Number(t.flavor.wholesalePrice) : null,
    } : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Inventario</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Traspasos</h1>
      </section>
      <TabEnvios activeFlavors={flavors} activeLocations={locationList} transfers={transferList} userEmail={user?.emailAddresses[0]?.emailAddress || ""} />
    </div>
  );
}
