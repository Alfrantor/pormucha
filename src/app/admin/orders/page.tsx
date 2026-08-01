import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TabPedidos } from "@/components/admin/AdminDashboard";
import { saveShippingConfig } from "@/app/_actions/settings";
import { getShippingConfig } from "@/lib/shipping-config";

export default async function OrdersPage() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;

  if (role !== "admin" && role !== "vendedor") {
    redirect("/perfil");
  }

  const shippingConfig = await getShippingConfig();

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
    orderItems:
      order.orderItems?.map((item: any) => ({
        ...item,
        unitPrice: Number(item.unitPrice || 0),
        subtotal: Number(item.subtotal || 0),
        product: item.product
          ? {
              ...item.product,
              price: Number(item.product.price || 0),
              weight: Number(item.product.weight || 0),
              height: Number(item.product.height || 0),
              width: Number(item.product.width || 0),
              length: Number(item.product.length || 0),
            }
          : null,
        flavor: item.flavor
          ? {
              ...item.flavor,
              price: Number(item.flavor.price || 0),
              basePrice: Number(item.flavor.basePrice || 0),
              wholesalePrice: item.flavor.wholesalePrice ? Number(item.flavor.wholesalePrice) : null,
            }
          : null,
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

      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Logística</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Configuración de paquetería</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Aquí definimos el proveedor y la dirección origen que usa la tienda para cotizar y generar guías, sin dejar datos hardcodeados.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            Proveedor activo:{" "}
            <span className="font-black text-slate-950">
              {shippingConfig.provider === "enviosperros" ? "EnvíosPerros" : "Skydropx"}
            </span>
          </div>
        </div>

        <form action={saveShippingConfig} className="mt-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Proveedor
              <select
                name="provider"
                defaultValue={shippingConfig.provider}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none"
              >
                <option value="skydropx">Skydropx</option>
                <option value="enviosperros">EnvíosPerros</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Empresa
              <input name="companyName" defaultValue={shippingConfig.origin.companyName} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Contacto
              <input name="contactName" defaultValue={shippingConfig.origin.contactName} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Token API
              <input
                name="apiToken"
                defaultValue={shippingConfig.apiToken || ""}
                placeholder="Bearer token de EnvíosPerros"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Correo
              <input name="email" defaultValue={shippingConfig.origin.email} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Teléfono
              <input name="phone" defaultValue={shippingConfig.origin.phone} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              País
              <input name="countryCode" defaultValue={shippingConfig.origin.countryCode} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Código postal
              <input name="postalCode" defaultValue={shippingConfig.origin.postalCode} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none" />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Estado
              <input name="state" defaultValue={shippingConfig.origin.state} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Ciudad
              <input name="city" defaultValue={shippingConfig.origin.city} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Colonia
              <input name="neighborhood" defaultValue={shippingConfig.origin.neighborhood} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Calle
              <input name="street1" defaultValue={shippingConfig.origin.street1} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none" />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-[0.4fr_1fr_auto]">
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Número
              <input name="apartmentNumber" defaultValue={shippingConfig.origin.apartmentNumber} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Referencia
              <input name="reference" defaultValue={shippingConfig.origin.reference} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none" />
            </label>
            <div className="flex items-end">
              <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                Guardar logística
              </button>
            </div>
          </div>
        </form>
      </section>

      <TabPedidos orders={serializedOrders} />
    </div>
  );
}
