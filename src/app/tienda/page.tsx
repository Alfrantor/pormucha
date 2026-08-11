import TiendaPageClient from "@/components/tienda/TiendaPageClient";
import { db } from "@/lib/db";
import { getWebCmsConfig } from "@/lib/web-cms";

export default async function TiendaPage() {
  const [config, packs, rawFlavors] = await Promise.all([
    getWebCmsConfig(),
    db.product.findMany({
      where: { isArchived: false },
      orderBy: { price: "asc" },
    }),
    db.flavor.findMany({
      where: { isArchived: false },
      include: { locationStocks: true },
    }),
  ]);

  const page = config.pages.find((entry) => entry.key === "tienda") ?? config.pages[0];

  const flavors = rawFlavors.map((f) => {
    const cleanName = f.name
      .toLowerCase()
      .replace("kombucha", "")
      .trim()
      .replace(/\s+/g, "-")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return {
      id: f.id,
      name: f.name,
      image: f.image || `/${cleanName}.jpeg`,
      imageEuro: f.imageEuro || null,
      stock: f.locationStocks.reduce((sum, s) => sum + s.quantity, 0),
    };
  });

  return (
    <TiendaPageClient
      page={page}
      packs={packs.map((pack) => ({
        id: pack.id,
        name: pack.name,
        quantity: pack.quantity,
        price: Number(pack.price),
        clubDiscountPercent: pack.clubDiscountPercent,
        image: pack.image || null,
      }))}
      flavors={flavors}
    />
  );
}
