"use server";

import { db } from "@/lib/db";

interface GetSalesHistoryParams {
  startDate: string; // formato "YYYY-MM-DD"
  endDate: string;   // formato "YYYY-MM-DD"
  locationId?: string;
}

export async function getSalesHistory({ startDate, endDate, locationId }: GetSalesHistoryParams) {
  const start = new Date(`${startDate}T00:00:00.000`);
  const end = new Date(`${endDate}T23:59:59.999`);

  const where: any = {
    createdAt: {
      gte: start,
      lte: end,
    },
  };

  // Filter by location for POS sales, or by channel
  if (locationId && locationId !== "ALL") {
    where.locationId = locationId;
  }

  const sales = await db.order.findMany({
    where,
    include: {
      orderItems: true,
      location: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Sanitizar Decimal → number y Date → string
  return sales.map((sale) => ({
    id: sale.id,
    createdAt: sale.createdAt.toISOString(),
    total: sale.total.toNumber(),
    status: sale.status,
    paymentMethod: sale.paymentMethod,
    userId: sale.sellerId,
    locationName: sale.location?.name || "Online",
    items: sale.orderItems.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      price: item.unitPrice.toNumber(),
      subtotal: item.subtotal.toNumber(),
    })),
  }));
}
