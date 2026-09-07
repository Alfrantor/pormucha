import TiendaPageClient from "@/components/tienda/TiendaPageClient";
import { db } from "@/lib/db";
import { ensureProductImageEuroSchema } from "@/lib/product-schema";
import { getWebCmsConfig } from "@/lib/web-cms";

export default async function TiendaPage() {
  await ensureProductImageEuroSchema();

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
  const productImageEuroRows = await db.$queryRaw<Array<{ id: string; imageEuro: string | null }>>`
    SELECT "id", "imageEuro"
    FROM "Product"
  `;
  const productImageEuroById = new Map(productImageEuroRows.map((row) => [row.id, row.imageEuro]));

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
        imageEuro: productImageEuroById.get(pack.id) || null,
      }))}
      flavors={flavors}
    />
  );
}
