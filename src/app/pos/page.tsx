// src/app/pos/page.tsx
import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PosInterface } from "@/components/pos/pos-interface";

export default async function PosPage() {
  const user = await currentUser();
  if (!user) { redirect("/"); return null; }

  const locations = await db.location.findMany();
  const clients = await db.client.findMany({ orderBy: { fullName: 'asc' } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recentSales = await db.order.findMany({
    where: { channel: "POS", createdAt: { gte: today } },
    include: { orderItems: { include: { product: true, flavor: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  const rawProducts = await db.product.findMany({ where: { isArchived: false }, orderBy: { name: 'asc' } });
  const rawFlavors = await db.flavor.findMany({ where: { isArchived: false }, include: { locationStocks: true }, orderBy: { name: 'asc' } });

  // --- SANITIZACIÓN EXTREMA ---
  const products = rawProducts.map(p => ({
    id: p.id,
    name: p.name,
    quantity: p.quantity,
    price: Number(p.price),
    weight: p.weight ? Number(p.weight) : 0,
    height: p.height ? Number(p.height) : 0,
    width: p.width ? Number(p.width) : 0,
    length: p.length ? Number(p.length) : 0,
    clubDiscountPercent: p.clubDiscountPercent ? Number(p.clubDiscountPercent) : 0
  }));

  const flavors = rawFlavors.map(f => ({
    id: f.id,
    name: f.name,
    price: Number(f.price),
    unitCount: f.unitCount,
    locationStocks: f.locationStocks.map(s => ({
      ...s,
      quantity: Number(s.quantity)
    }))
  }));

  const sanitizedRecentSales = recentSales.map(sale => ({
    id: sale.id,
    total: Number(sale.total),
    status: sale.status,
    createdAt: sale.createdAt.toISOString(),
    orderItems: sale.orderItems.map(item => ({
      id: item.id,
      price: Number(item.unitPrice),
      quantity: item.quantity,
      productName: item.productName
    }))
  }));

  return (
    <div className="h-screen bg-gray-100 overflow-hidden">
      <PosInterface
        locations={locations}
        products={products}
        flavors={flavors}
        clients={clients} // <--- Pasamos los clientes
        recentSales={sanitizedRecentSales}
        userEmail={user.emailAddresses[0].emailAddress}
      />
    </div>
  );
}