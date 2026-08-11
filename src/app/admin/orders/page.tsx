import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { TabPedidos } from "@/components/admin/AdminDashboard";
import { saveShippingConfig } from "@/app/_actions/settings";
import { getShippingConfig } from "@/lib/shipping-config";

type AdminClaims = {
  metadata?: {
    role?: string;
  };
};

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    orderItems: {
      include: {
        product: true;
        flavor: true;
        composition: true;
      };
    };
    replacements: {
      select: {
        id: true;
        status: true;
      };
    };
  };
}>;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ channel?: string }>;
}) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims as AdminClaims | null | undefined)?.metadata?.role;
  const params = (await searchParams) || {};
  const channel = params.channel === "POS" ? "POS" : "WEB";

  if (role !== "admin" && role !== "vendedor") {
    redirect("/perfil");
  }

  const shippingConfig = await getShippingConfig();

  const orders: OrderWithRelations[] = await db.order.findMany({
    where: channel === "POS" ? { channel: "POS" } : { NOT: { channel: "POS" } },
    include: {
      orderItems: { include: { product: true, flavor: true, composition: true } },
      replacements: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedOrders = orders.map((order) => ({
    ...order,
    total: Number(order.total || 0),
    subtotal: Number(order.subtotal || 0),
    shippingCost: Number(order.shippingCost || 0),
    amountPaid: Number(order.amountPaid || 0),
    createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: order.updatedAt?.toISOString() || new Date().toISOString(),
    cancelledAt: order.cancelledAt?.toISOString() || null,
    orderItems:
      order.orderItems?.map((item) => ({
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
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          {channel === "POS" ? "Pedidos POS" : "Pedidos Web"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          {channel === "POS"
            ? "Aquí se muestran los pedidos generados en caja, con pagos, detalle, edición, cancelación y reimpresión."
            : "Aquí se muestran los pedidos creados en la tienda web, con pagos, detalle, edición, cancelación y reimpresión."}
        </p>
      </section>

      {channel === "WEB" ? (
        <details className="group rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Logistica</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Configuracion de paqueteria</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Define el proveedor y la direccion origen que usa la tienda para cotizar y generar guias.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
              Proveedor activo:{" "}
              <span className="font-black text-slate-950">
                {shippingConfig.provider === "enviosperros" ? "EnviosPerros" : "Skydropx"}
              </span>
            </div>
          </summary>

          <div className="mt-6 border-t border-slate-100 pt-6">
            <form action={saveShippingConfig} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Proveedor
                  <select
                    name="provider"
                    defaultValue={shippingConfig.provider}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none"
                  >
                    <option value="skydropx">Skydropx</option>
                    <option value="enviosperros">EnviosPerros</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Empresa
                  <input
                    name="companyName"
                    defaultValue={shippingConfig.origin.companyName}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Contacto
                  <input
                    name="contactName"
                    defaultValue={shippingConfig.origin.contactName}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Token API
                  <input
                    name="apiToken"
                    defaultValue={shippingConfig.apiToken || ""}
                    placeholder="Bearer token de EnviosPerros"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Correo
                  <input
                    name="email"
                    defaultValue={shippingConfig.origin.email}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Telefono
                  <input
                    name="phone"
                    defaultValue={shippingConfig.origin.phone}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Pais
                  <input
                    name="countryCode"
                    defaultValue={shippingConfig.origin.countryCode}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Codigo postal
                  <input
                    name="postalCode"
                    defaultValue={shippingConfig.origin.postalCode}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Estado
                  <input
                    name="state"
                    defaultValue={shippingConfig.origin.state}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Ciudad
                  <input
                    name="city"
                    defaultValue={shippingConfig.origin.city}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Colonia
                  <input
                    name="neighborhood"
                    defaultValue={shippingConfig.origin.neighborhood}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Calle
                  <input
                    name="street1"
                    defaultValue={shippingConfig.origin.street1}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[0.4fr_1fr_auto]">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Numero
                  <input
                    name="apartmentNumber"
                    defaultValue={shippingConfig.origin.apartmentNumber}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Referencia
                  <input
                    name="reference"
                    defaultValue={shippingConfig.origin.reference}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>
                <div className="flex items-end">
                  <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                    Guardar logistica
                  </button>
                </div>
              </div>
            </form>
          </div>
        </details>
      ) : null}

      <TabPedidos orders={serializedOrders} initialChannelFilter={channel} />
    </div>
  );
}
