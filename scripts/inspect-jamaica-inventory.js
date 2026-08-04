const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const FLAVOR_ID = "cmndgthxh0004ra6odukx3avi";

async function main() {
  const [flavor, stocks, movements, orderItems, recentOrders] = await Promise.all([
    prisma.flavor.findUnique({
      where: { id: FLAVOR_ID },
      select: { id: true, name: true, isArchived: true },
    }),
    prisma.stock.findMany({
      where: { flavorId: FLAVOR_ID },
      include: {
        location: {
          select: { id: true, name: true, isArchived: true },
        },
      },
      orderBy: { location: { name: "asc" } },
    }),
    prisma.inventoryMovement.findMany({
      where: { flavorId: FLAVOR_ID },
      include: {
        location: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.orderItemComposition.findMany({
      where: { flavorId: FLAVOR_ID },
      include: {
        orderItem: {
          include: {
            order: {
              select: {
                id: true,
                folio: true,
                channel: true,
                status: true,
                locationId: true,
                fullName: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        orderItem: {
          order: {
            createdAt: "desc",
          },
        },
      },
      take: 80,
    }),
    prisma.order.findMany({
      where: {
        orderItems: {
          some: {
            composition: {
              some: { flavorId: FLAVOR_ID },
            },
          },
        },
      },
      select: {
        id: true,
        folio: true,
        channel: true,
        status: true,
        locationId: true,
        fullName: true,
        createdAt: true,
        orderItems: {
          select: {
            id: true,
            productName: true,
            quantity: true,
            composition: {
              where: { flavorId: FLAVOR_ID },
              select: { quantity: true, flavorId: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  const consumptionByOrder = recentOrders.map((order) => {
    const jamaicaUnits = order.orderItems.reduce((sum, item) => {
      const perItem = item.composition.reduce((inner, comp) => inner + Number(comp.quantity || 0), 0);
      return sum + perItem * Number(item.quantity || 0);
    }, 0);

    return {
      id: order.id,
      folio: order.folio,
      channel: order.channel,
      status: order.status,
      locationId: order.locationId,
      fullName: order.fullName,
      createdAt: order.createdAt,
      jamaicaUnits,
    };
  });

  console.log(JSON.stringify({
    flavor,
    stocks: stocks.map((row) => ({
      locationId: row.locationId,
      locationName: row.location?.name,
      quantity: Number(row.quantity || 0),
    })),
    recentMovements: movements.map((row) => ({
      id: row.id,
      type: row.type,
      quantity: row.quantity,
      reason: row.reason,
      locationName: row.location?.name || null,
      createdAt: row.createdAt,
    })),
    compositionRows: orderItems.map((row) => ({
      orderId: row.orderItem.order.id,
      folio: row.orderItem.order.folio,
      channel: row.orderItem.order.channel,
      status: row.orderItem.order.status,
      quantityPerItem: Number(row.quantity || 0),
      itemQuantity: Number(row.orderItem.quantity || 0),
      totalUnits: Number(row.quantity || 0) * Number(row.orderItem.quantity || 0),
      fullName: row.orderItem.order.fullName,
      createdAt: row.orderItem.order.createdAt,
    })),
    consumptionByOrder,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
