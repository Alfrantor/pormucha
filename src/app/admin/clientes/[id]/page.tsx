import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowLeft, MapPin, CreditCard, MessageSquare } from "lucide-react";
import Link from "next/link";

interface ClientDetailPageProps {
  params: {
    id: string;
  };
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  // Verificar acceso
  const { sessionClaims } = await auth();
  const userRole = (sessionClaims?.metadata as any)?.role;

  if (userRole !== "admin") {
    redirect("/perfil");
  }

  const client = await db.client.findUnique({
    where: { id: params.id },
    include: {
      addresses: true,
      orders: { orderBy: { createdAt: "desc" }, take: 10 },
      credits: { orderBy: { createdAt: "desc" }, take: 10 },
      interactions: { orderBy: { createdAt: "desc" }, take: 20 },
      flavorDiscounts: true,
    },
  });

  if (!client) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Cliente no encontrado
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/clientes"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{client.fullName}</h1>
          {client.businessName && <p className="text-gray-600">{client.businessName}</p>}
        </div>
      </div>

      {/* Grid de información */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Datos principales */}
        <div className="md:col-span-2 space-y-6">
          {/* Información General */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Información General</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Tipo</p>
                <p className="font-semibold text-gray-900">
                  {client.type === "FISICA" ? "Persona Física" : "Persona Jurídica"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Clasificación</p>
                <p className="font-semibold text-gray-900">{client.classification}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold text-gray-900">{client.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <p className="font-semibold text-gray-900">{client.phone || "-"}</p>
              </div>
              {client.rfc && (
                <div>
                  <p className="text-sm text-gray-600">RFC</p>
                  <p className="font-mono text-gray-900">{client.rfc}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Estado</p>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold ${
                    client.status === "ACTIVO"
                      ? "bg-green-100 text-green-700"
                      : client.status === "INACTIVO"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {client.status}
                </span>
              </div>
            </div>
          </div>

          {/* Información Comercial */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Información Comercial</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Límite de Crédito</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${Number(client.creditLimit).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Crédito Utilizado</p>
                <p className="text-2xl font-bold text-red-600">
                  ${Number(client.creditUsed).toFixed(2)}
                </p>
              </div>
              {Number(client.creditLimit) > 0 && (
                <div className="col-span-2">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        Number(client.creditUsed) / Number(client.creditLimit) > 0.8
                          ? "bg-red-500"
                          : Number(client.creditUsed) / Number(client.creditLimit) > 0.5
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                      style={{
                        width: `${Math.min((Number(client.creditUsed) / Number(client.creditLimit)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Días de Pago</p>
                <p className="font-semibold text-gray-900">
                  {client.paymentTerms ? `${client.paymentTerms} días` : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Descuento Global</p>
                <p className="font-semibold text-gray-900">
                  {client.globalDiscount ? `${client.globalDiscount}%` : "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Direcciones */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MapPin size={20} />
                Direcciones
              </h2>
            </div>
            {client.addresses.length > 0 ? (
              <div className="space-y-3">
                {client.addresses.map((addr: any) => (
                  <div key={addr.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-semibold text-blue-600 uppercase">
                        {addr.type}
                      </span>
                      {addr.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Predeterminada
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 font-medium">
                      {addr.street} {addr.number}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {addr.city}, {addr.state} {addr.zipCode}
                    </p>
                    {addr.reference && (
                      <p className="text-gray-500 text-sm">Ref: {addr.reference}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Sin direcciones registradas</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Órdenes */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Órdenes Recientes</h3>
            {client.orders.length > 0 ? (
              <div className="space-y-2">
                {client.orders.slice(0, 5).map((order: any) => (
                  <div
                    key={order.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      ${Number(order.total).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                <p className="text-xs text-gray-500 mt-3">
                  Total de órdenes: {client.orders.length}
                </p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Sin órdenes</p>
            )}
          </div>

          {/* Créditos Pendientes */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard size={18} />
              Créditos Pendientes
            </h3>
            {client.credits.filter((c) => c.status === "PENDING").length > 0 ? (
              <div className="space-y-2">
                {client.credits
                  .filter((c) => c.status === "PENDING")
                  .slice(0, 5)
                  .map((credit: any) => (
                    <div
                      key={credit.id}
                      className="p-3 bg-red-50 rounded-lg border border-red-200"
                    >
                      <p className="text-sm font-semibold text-red-900">
                        ${Number(credit.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-red-700">
                        Vence:{" "}
                        {new Date(credit.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Sin créditos pendientes</p>
            )}
          </div>

          {/* Interacciones */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare size={18} />
              Notas Recientes
            </h3>
            {client.interactions.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {client.interactions.slice(0, 5).map((interaction: any) => (
                  <div key={interaction.id} className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-xs font-semibold text-gray-600 uppercase">
                      {interaction.type}
                    </p>
                    <p className="text-sm text-gray-900 mt-1">{interaction.note}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(interaction.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Sin notas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
