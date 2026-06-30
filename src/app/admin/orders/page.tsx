import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TabPedidos } from "@/components/admin/AdminDashboard";

export default async function OrdersPage() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;

  if (role !== "admin" && role !== "vendedor") {
    redirect("/perfil");
  }

  const orders = await db.order.findMany({
    include: {
      orderItems: { include: { product: true, flavor: true, composition: true } },
      replacements: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedOrders = orders.map((order: any) => ({
    ...order,
    total: Number(order.total || 0),
    subtotal: Number(order.subtotal || 0),
    shippingCost: Number(order.shippingCost || 0),
    amountPaid: Number(order.amountPaid || 0),
    createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: order.updatedAt?.toISOString() || new Date().toISOString(),
    cancelledAt: order.cancelledAt?.toISOString() || null,
    orderItems: order.orderItems?.map((item: any) => ({
      ...item,
      unitPrice: Number(item.unitPrice || 0),
      subtotal: Number(item.subtotal || 0),
      product: item.product ? {
        ...item.product,
        price: Number(item.product.price || 0),
        weight: Number(item.product.weight || 0),
        height: Number(item.product.height || 0),
        width: Number(item.product.width || 0),
        length: Number(item.product.length || 0),
      } : null,
      flavor: item.flavor ? {
        ...item.flavor,
        price: Number(item.flavor.price || 0),
        basePrice: Number(item.flavor.basePrice || 0),
        wholesalePrice: item.flavor.wholesalePrice ? Number(item.flavor.wholesalePrice) : null,
      } : null,
      composition: item.composition || [],
    })) || [],
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Ventas</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Pedidos</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Aquí están todas las funciones de gestión que ya existían: pagos, detalle, edición, cancelación y reimpresión.
        </p>
      </section>

      <TabPedidos orders={serializedOrders} />
    </div>
  );
}
