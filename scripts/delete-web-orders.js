const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function getOrderCode(order) {
  return order.folio || `#${String(order.id).slice(-6).toUpperCase()}`;
}

async function syncClientCreditUsage(tx, clientId) {
  if (!clientId) return;

  const agg = await tx.credit.aggregate({
    where: {
      clientId,
      status: { in: ["PENDING", "OVERDUE"] },
    },
    _sum: { amount: true },
  });

  await tx.client.update({
    where: { id: clientId },
    data: { creditUsed: agg._sum.amount ?? 0 },
  });
}

async function main() {
  const webOrders = await prisma.order.findMany({
    where: { channel: "WEB" },
    include: {
      orderItems: {
        include: {
          composition: true,
        },
      },
      payments: true,
      edits: true,
      credit: true,
      replacements: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const summary = {
    ordersFound: webOrders.length,
    ordersDeleted: 0,
    stockRowsAdjusted: 0,
    inventoryMovementsDeleted: 0,
    paymentsDeleted: 0,
    editsDeleted: 0,
    creditsDeleted: 0,
    orderItemsDeleted: 0,
    compositionsDeleted: 0,
    replacementsDetached: 0,
    skippedCancelled: 0,
    skippedWithoutLocation: 0,
    affectedOrders: [],
  };

  for (const order of webOrders) {
    await prisma.$transaction(async (tx) => {
      const orderCode = getOrderCode(order);
      const stockUsage = new Map();

      if (order.status !== "CANCELLED" && order.locationId) {
        for (const item of order.orderItems) {
          for (const comp of item.composition) {
            const key = `${comp.flavorId}::${order.locationId}`;
            stockUsage.set(key, {
              flavorId: comp.flavorId,
              locationId: order.locationId,
              quantity: (stockUsage.get(key)?.quantity || 0) + Number(comp.quantity || 0) * Number(item.quantity || 0),
            });
          }
        }

        for (const adjustment of stockUsage.values()) {
          await tx.stock.upsert({
            where: {
              flavorId_locationId: {
                flavorId: adjustment.flavorId,
                locationId: adjustment.locationId,
              },
            },
            update: {
              quantity: { increment: adjustment.quantity },
            },
            create: {
              flavorId: adjustment.flavorId,
              locationId: adjustment.locationId,
              quantity: adjustment.quantity,
            },
          });
        }

        summary.stockRowsAdjusted += stockUsage.size;
      } else if (order.status === "CANCELLED") {
        summary.skippedCancelled += 1;
      } else if (!order.locationId) {
        summary.skippedWithoutLocation += 1;
      }

      const inventoryDelete = await tx.inventoryMovement.deleteMany({
        where: {
          reason: `Venta Web - Orden ${orderCode}`,
        },
      });

      if (order.replacements.length > 0) {
        const detached = await tx.order.updateMany({
          where: { replacesOrderId: order.id },
          data: { replacesOrderId: null },
        });
        summary.replacementsDetached += detached.count;
      }

      const paymentDelete = await tx.orderPayment.deleteMany({
        where: { orderId: order.id },
      });

      const editDelete = await tx.orderEdit.deleteMany({
        where: { orderId: order.id },
      });

      const creditDelete = await tx.credit.deleteMany({
        where: { orderId: order.id },
      });

      const orderItemIds = order.orderItems.map((item) => item.id);
      let compositionDeleteCount = 0;
      if (orderItemIds.length > 0) {
        const compositionDelete = await tx.orderItemComposition.deleteMany({
          where: { orderItemId: { in: orderItemIds } },
        });
        compositionDeleteCount = compositionDelete.count;
      }

      const orderItemDelete = await tx.orderItem.deleteMany({
        where: { orderId: order.id },
      });

      await tx.order.delete({
        where: { id: order.id },
      });

      if (order.clientId) {
        await syncClientCreditUsage(tx, order.clientId);
      }

      summary.inventoryMovementsDeleted += inventoryDelete.count;
      summary.paymentsDeleted += paymentDelete.count;
      summary.editsDeleted += editDelete.count;
      summary.creditsDeleted += creditDelete.count;
      summary.orderItemsDeleted += orderItemDelete.count;
      summary.compositionsDeleted += compositionDeleteCount;
      summary.ordersDeleted += 1;
      summary.affectedOrders.push({
        id: order.id,
        code: orderCode,
        status: order.status,
        fullName: order.fullName,
      });
    });
  }

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
