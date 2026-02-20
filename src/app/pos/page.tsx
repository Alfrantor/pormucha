import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PosInterface } from "@/components/pos/pos-interface";

export default async function PosPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  // 1. Obtener Ubicaciones
  const locations = await db.location.findMany();
  
  if (locations.length === 0) {
    await db.location.createMany({
      data: [
        { name: "Bodega General", isDefault: true },
        { name: "Sucursal Centro (POS)", isDefault: false }
      ]
    });
    redirect("/pos"); 
  }

  // 2. Obtener Datos Crudos de la Base de Datos
  const rawProducts = await db.product.findMany();
  const rawFlavors = await db.flavor.findMany({
    include: { locationStocks: true } 
  });

  // 3. SANITIZACIÓN (El truco para arreglar el error)
  // Convertimos el objeto 'Decimal' a un número normal de JavaScript
  
  const products = rawProducts.map(product => ({
    ...product,
    price: product.price.toNumber() // <--- ESTO SOLUCIONA EL ERROR
  }));

  const flavors = rawFlavors.map(flavor => ({
    ...flavor,
    price: flavor.price.toNumber(), // <--- ESTO TAMBIÉN
    // Aseguramos que los stocks anidados no den problemas
    locationStocks: flavor.locationStocks.map(stock => ({
      ...stock
    }))
  }));

  return (
    <div className="h-screen bg-gray-100 overflow-hidden">
      <PosInterface 
        locations={locations} 
        products={products} 
        flavors={flavors} 
        userEmail={user.emailAddresses[0].emailAddress}
      />
    </div>
  );
}