import { RawMaterialsCatalogManager } from "@/components/admin/RawMaterialsCatalogManager";
import { db } from "@/lib/db";

export default async function CatalogRawMaterialsPage() {
  const rawMaterials = await db.rawMaterial.findMany({
    include: {
      stocks: {
        select: {
          quantity: true,
        },
      },
    },
    orderBy: [{ name: "asc" }],
  });

  const serializedRawMaterials = rawMaterials.map((material) => ({
    id: material.id,
    name: material.name,
    unit: material.unit,
    category: material.category,
    description: material.description,
    minStock: Number(material.minStock || 0),
    cost: material.cost != null ? Number(material.cost) : null,
    isArchived: material.isArchived,
    stockTotal: material.stocks.reduce((sum, stock) => sum + Number(stock.quantity || 0), 0),
  }));

  return <RawMaterialsCatalogManager rawMaterials={serializedRawMaterials} />;
}
