import { LocationsCatalogManager } from "@/components/admin/LocationsCatalogManager";
import { db } from "@/lib/db";

export default async function CatalogLocationsPage() {
  const locations = await db.location.findMany({
    include: {
      stocks: {
        select: {
          quantity: true,
          flavor: { select: { name: true } },
        },
        orderBy: { flavor: { name: "asc" } },
      },
      rawMaterialStocks: {
        select: {
          quantity: true,
          rawMaterial: { select: { name: true, unit: true } },
        },
        orderBy: { rawMaterial: { name: "asc" } },
      },
      orders: {
        select: {
          id: true,
          folio: true,
          channel: true,
          status: true,
          total: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      transfersFrom: {
        select: {
          id: true,
          status: true,
          quantitySent: true,
          quantityReceived: true,
          createdAt: true,
          flavor: { select: { name: true } },
          toLocation: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      transfersTo: {
        select: {
          id: true,
          status: true,
          quantitySent: true,
          quantityReceived: true,
          createdAt: true,
          flavor: { select: { name: true } },
          fromLocation: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      _count: {
        select: {
          orders: true,
          transfersFrom: true,
          transfersTo: true,
        },
      },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  const locationsWithUsage = await Promise.all(
    locations.map(async (location) => {
      const [openProductions, openGasification, openLabeling] = await Promise.all([
        db.production.count({
          where: {
            status: "IN_PROGRESS",
            OR: [
              { ingredients: { some: { locationId: location.id } } },
              { additions: { some: { locationId: location.id } } },
            ],
          },
        }),
        db.gasificationBatch.count({ where: { locationId: location.id, status: "IN_PROGRESS" } }),
        db.labelingBatch.count({ where: { locationId: location.id, status: "IN_PROGRESS" } }),
      ]);

      return {
        id: location.id,
        name: location.name,
        address: location.address,
        isDefault: location.isDefault,
        isArchived: location.isArchived,
        productStockTotal: location.stocks.reduce((sum, stock) => sum + Number(stock.quantity || 0), 0),
        rawMaterialStockTotal: location.rawMaterialStocks.reduce((sum, stock) => sum + Number(stock.quantity || 0), 0),
        orderCount: location._count.orders,
        incomingTransferCount: location._count.transfersTo,
        outgoingTransferCount: location._count.transfersFrom,
        openProcessCount: openProductions + openGasification + openLabeling,
        productStocks: location.stocks
          .filter((stock) => Number(stock.quantity || 0) > 0)
          .map((stock) => ({
            name: stock.flavor.name,
            quantity: Number(stock.quantity || 0),
          })),
        rawMaterialStocks: location.rawMaterialStocks
          .filter((stock) => Number(stock.quantity || 0) > 0)
          .map((stock) => ({
            name: stock.rawMaterial.name,
            unit: stock.rawMaterial.unit,
            quantity: Number(stock.quantity || 0),
          })),
        recentOrders: location.orders.map((order) => ({
          id: order.id,
          folio: order.folio,
          channel: order.channel,
          status: order.status,
          total: Number(order.total || 0),
          createdAt: order.createdAt.toISOString(),
        })),
        outgoingTransfers: location.transfersFrom.map((transfer) => ({
          id: transfer.id,
          status: transfer.status,
          quantitySent: transfer.quantitySent,
          quantityReceived: transfer.quantityReceived,
          flavorName: transfer.flavor.name,
          relatedLocationName: transfer.toLocation.name,
          createdAt: transfer.createdAt.toISOString(),
        })),
        incomingTransfers: location.transfersTo.map((transfer) => ({
          id: transfer.id,
          status: transfer.status,
          quantitySent: transfer.quantitySent,
          quantityReceived: transfer.quantityReceived,
          flavorName: transfer.flavor.name,
          relatedLocationName: transfer.fromLocation.name,
          createdAt: transfer.createdAt.toISOString(),
        })),
        openProcesses: [
          { label: "Producción", count: openProductions },
          { label: "Gasificado", count: openGasification },
          { label: "Etiquetado", count: openLabeling },
        ].filter((item) => item.count > 0),
      };
    }),
  );

  return <LocationsCatalogManager locations={locationsWithUsage} />;
}
