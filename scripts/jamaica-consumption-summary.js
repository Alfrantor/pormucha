const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const FLAVOR_ID = "cmndgthxh0004ra6odukx3avi";
const LOCATION_ID = "cmndgpho10000ra6o7deka1y5";

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      locationId: LOCATION_ID,
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
      createdAt: true,
      fullName: true,
      orderItems: {
        select: {
          quantity: true,
          composition: {
            where: { flavorId: FLAVOR_ID },
            select: { quantity: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const summary = new Map();

  for (const order of orders) {
    const units = order.orderItems.reduce((sum, item) => {
      const perItem = item.composition.reduce((inner, comp) => inner + Number(comp.quantity || 0), 0);
      return sum + perItem * Number(item.quantity || 0);
    }, 0);

    const current = summary.get(order.status) || { orders: 0, units: 0 };
    current.orders += 1;
    current.units += units;
    summary.set(order.status, current);
  }

  console.log(JSON.stringify({
    byStatus: Object.fromEntries(summary),
    recent: orders.slice(0, 25).map((order) => ({
      id: order.id,
      folio: order.folio,
      channel: order.channel,
      status: order.status,
      createdAt: order.createdAt,
      fullName: order.fullName,
      units: order.orderItems.reduce((sum, item) => {
        const perItem = item.composition.reduce((inner, comp) => inner + Number(comp.quantity || 0), 0);
        return sum + perItem * Number(item.quantity || 0);
      }, 0),
    })),
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
