import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PricingManager } from "@/components/admin/PricingManager";

interface PreciosPageProps {
  searchParams: {
    flavor?: string;
  };
}

export default async function PreciosPage({ searchParams }: PreciosPageProps) {
  // Verificar acceso
  const { sessionClaims } = await auth();
  const userRole = (sessionClaims?.metadata as any)?.role;

  if (userRole !== "admin") {
    redirect("/perfil");
  }

  const resolvedParams = await searchParams;
  const flavorId = resolvedParams?.flavor;

  // Obtener sabores
  const flavors = await db.flavor.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
  });

  // Si se selecciona un flavor, obtener sus detalles
  let selectedFlavor = null;
  if (flavorId) {
    selectedFlavor = await db.flavor.findUnique({
      where: { id: flavorId },
      include: {
        priceScales: { orderBy: { minQuantity: "asc" } },
        discounts: { orderBy: { createdAt: "desc" } },
        priceHistory: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Precios</h1>
        <p className="text-gray-600">
          Configura precios base, escalas y descuentos por flavor
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Listado de Flavores */}
        <div className="bg-white rounded-xl border shadow-sm p-6 h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Flavores</h2>
          <div className="space-y-2">
            {flavors.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin flavores disponibles</p>
            ) : (
              flavors.map((flavor: any) => (
                <a
                  key={flavor.id}
                  href={`?flavor=${flavor.id}`}
                  className={`block p-3 rounded-lg border transition-colors ${
                    selectedFlavor?.id === flavor.id
                      ? "bg-blue-50 border-blue-200 text-blue-900 font-semibold"
                      : "hover:bg-gray-50 border-gray-200 text-gray-900"
                  }`}
                >
                  <p className="font-medium truncate">{flavor.name}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    ${Number(flavor.basePrice || flavor.price || 0).toFixed(2)}
                  </p>
                </a>
              ))
            )}
          </div>
        </div>

        {/* Panel de configuración */}
        <div className="lg:col-span-3">
          {selectedFlavor ? (
            <div className="space-y-6">
              {/* Info del flavor */}
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedFlavor.name}
                    </h2>
                    {selectedFlavor.image && (
                      <img
                        src={selectedFlavor.image}
                        alt={selectedFlavor.name}
                        className="w-24 h-24 object-cover rounded-lg mt-4"
                      />
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Precio Minorista</p>
                    <p className="text-3xl font-bold text-gray-900">
                      ${Number(selectedFlavor.basePrice || selectedFlavor.price || 0).toFixed(2)}
                    </p>
                    {selectedFlavor.wholesalePrice && (
                      <p className="text-sm text-blue-600 mt-2">
                        Mayorista: ${Number(selectedFlavor.wholesalePrice).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Manager de precios */}
              <PricingManager flavor={selectedFlavor} />

              {/* Historial de cambios */}
              {selectedFlavor.priceHistory.length > 0 && (
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Historial de Cambios
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {selectedFlavor.priceHistory.map((history: any) => (
                      <div
                        key={history.id}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">
                            ${Number(history.oldBasePrice).toFixed(2)} →{" "}
                            ${Number(history.newBasePrice).toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(history.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {history.changeReason && (
                          <p className="text-gray-600 mt-1 text-xs">
                            {history.changeReason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm p-6 text-center text-gray-500">
              Selecciona un flavor para gestionar sus precios
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
