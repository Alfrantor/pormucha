// src/app/pos/page.tsx
import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PosInterface } from "@/components/pos/pos-interface";

export default async function PosPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/");
    return null;
  }

  // 1. Obtener Ubicaciones
  const locations = await db.location.findMany();

  // Si no hay ubicaciones, crear las default
  if (locations.length === 0) {
    await db.location.createMany({
      data: [
        { name: "Bodega General", isDefault: true, address: "" },
        { name: "Sucursal Centro (POS)", isDefault: false, address: "" }
      ]
    });
    redirect("/pos");
    return null;
  }

  // 2. Obtener ventas del día (últimas 10) para el historial rápido
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recentSales = await db.order.findMany({
    where: {
      channel: "POS",
      createdAt: {
        gte: today
      }
    },
    include: {
      orderItems: { include: { product: true, flavor: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  // 3. Obtener Datos Crudos de la Base de Datos
  const rawProducts = await db.product.findMany({
    where: {
      isArchived: false
    },
    orderBy: {
      name: 'asc'
    }
  });

  const rawFlavors = await db.flavor.findMany({
    where: {
      isArchived: false
    },
    include: {
      locationStocks: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  // 4. SANITIZACIÓN - Convertir Decimal a Number
  const products = rawProducts.map(product => ({
    ...product,
    price: product.price.toNumber()
  }));

  const flavors = rawFlavors.map(flavor => ({
    ...flavor,
    price: flavor.price.toNumber(),
    locationStocks: flavor.locationStocks.map(stock => ({
      ...stock
    }))
  }));

  // 5. Sanitizar ventas recientes
  const sanitizedRecentSales = recentSales.map(sale => ({
    id: sale.id,
    total: sale.total.toNumber(),
    createdAt: sale.createdAt.toISOString(),
    orderItems: sale.orderItems.map(item => ({
      id: item.id,
      price: item.unitPrice.toNumber(),
      quantity: item.quantity,
      product: {
        id: item.productId || item.flavorId || item.id,
        name: item.productName
      }
    }))
  }));

  return (
    <div className="h-screen bg-gray-100 overflow-hidden">
      <PosInterface
        locations={locations}
        products={products}
        flavors={flavors}
        recentSales={sanitizedRecentSales}
        userEmail={user.emailAddresses[0].emailAddress}
      />
    </div>
  );
}