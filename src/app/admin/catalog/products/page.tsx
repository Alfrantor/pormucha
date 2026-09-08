import { currentUser } from "@clerk/nextjs/server";
import { ProductsCatalogManager } from "@/components/admin/ProductsCatalogManager";
import { WebPacksManager } from "@/components/admin/WebPacksManager";
import { db } from "@/lib/db";
import { ensureProductImageEuroSchema } from "@/lib/product-schema";
import { ensureFlavorPresentationSchema } from "@/lib/flavor-presentation-schema";
import { parseFlavorPresentations } from "@/lib/flavor-presentations";

export default async function CatalogProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ scope?: string }>;
}) {
  const params = (await searchParams) || {};
  const webScope = params.scope === "web";
  const user = await currentUser();
  const adminEmail = user?.emailAddresses[0]?.emailAddress || "system";

  await Promise.all([ensureProductImageEuroSchema(), ensureFlavorPresentationSchema()]);

  const [products, flavors] = await Promise.all([
    db.product.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.flavor.findMany({
      include: { locationStocks: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const productImageEuroRows = await db.$queryRaw<Array<{ id: string; imageEuro: string | null }>>`
    SELECT "id", "imageEuro"
    FROM "Product"
  `;
  const productImageEuroById = new Map(productImageEuroRows.map((row) => [row.id, row.imageEuro]));

  const catalogPacks = products.map((product) => ({
    id: product.id,
    name: product.name,
    quantity: product.quantity,
    price: Number(product.price || 0),
    clubDiscountPercent: product.clubDiscountPercent,
    isArchived: product.isArchived,
  }));

  const catalogFlavors = flavors.map((flavor) => ({
    id: flavor.id,
    name: flavor.name,
    slug: flavor.slug,
    price: Number(flavor.price || 0),
    basePrice: Number(flavor.basePrice || flavor.price || 0),
    presentations: parseFlavorPresentations(flavor.presentations),
    stockTotal: flavor.locationStocks.reduce((sum, stock) => sum + Number(stock.quantity || 0), 0),
    isArchived: flavor.isArchived,
  }));

  const webProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    quantity: product.quantity,
    price: Number(product.price || 0),
    clubDiscountPercent: product.clubDiscountPercent,
    image: product.image,
    imageEuro: productImageEuroById.get(product.id) || null,
    description: product.description,
    subscriptionNote: product.subscriptionNote,
    subscriptionBenefit1: product.subscriptionBenefit1,
    subscriptionBenefit2: product.subscriptionBenefit2,
    subscriptionBenefit3: product.subscriptionBenefit3,
    isArchived: product.isArchived,
  }));

  const webFlavors = flavors.map((flavor) => ({
    id: flavor.id,
    name: flavor.name,
    slug: flavor.slug,
    image: flavor.image,
    imageEuro: flavor.imageEuro,
    isArchived: flavor.isArchived,
  }));

  return webScope ? (
    <WebPacksManager products={webProducts} flavors={webFlavors} adminEmail={adminEmail} />
  ) : (
    <ProductsCatalogManager packs={catalogPacks} flavors={catalogFlavors} adminEmail={adminEmail} />
  );
}
