"use client";

import { useState } from "react";
import {
  updateFlavorPrices,
  createPriceScale,
  deletePriceScale,
  createDiscount,
  deleteDiscount,
} from "@/app/_actions/flavor-pricing";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { NoScrollNumberInput } from "@/components/NoScrollNumberInput";

type FlavorPriceScale = {
  id: string;
  minQuantity: number;
  maxQuantity: number | null;
  price: {
    toFixed: (fractionDigits?: number) => string;
  } | number;
};

type FlavorDiscount = {
  id: string;
  applicableTo: string;
  discountPercent: number | null;
  fixedPrice: {
    toFixed: (fractionDigits?: number) => string;
  } | null;
  validUntil: string | Date | null;
};

type PricingFlavor = {
  id: string;
  basePrice?: number | string | null;
  price?: number | string | null;
  wholesalePrice?: number | string | null;
  minimumWholesale?: number | null;
  priceScales?: FlavorPriceScale[];
  discounts?: FlavorDiscount[];
};

interface PricingManagerProps {
  flavor: PricingFlavor;
}

function resolveFlavorPrice(flavor: { basePrice?: unknown; price?: unknown }) {
  const basePrice = Number(flavor.basePrice ?? 0);
  if (Number.isFinite(basePrice) && basePrice > 0) return basePrice;

  const price = Number(flavor.price ?? 0);
  if (Number.isFinite(price) && price > 0) return price;

  return 0;
}

export function PricingManager({ flavor }: PricingManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"precios" | "escalas" | "descuentos">("precios");
  const [error, setError] = useState("");

  // Formulario de precios base
  const [priceForm, setPriceForm] = useState({
    basePrice: resolveFlavorPrice(flavor).toString() || "0",
    wholesalePrice: flavor.wholesalePrice?.toString() || "",
    minimumWholesale: flavor.minimumWholesale?.toString() || "50",
    changeReason: "",
  });

  // Formulario de escalas
  const [scaleForm, setScaleForm] = useState({
    minQuantity: "",
    maxQuantity: "",
    price: "",
  });

  // Formulario de descuentos
  const [discountForm, setDiscountForm] = useState({
    applicableTo: "TODAS",
    discountPercent: "",
    fixedPrice: "",
    validUntil: "",
  });

  const handleUpdatePrices = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await updateFlavorPrices(flavor.id, {
        basePrice: parseFloat(priceForm.basePrice),
        wholesalePrice: priceForm.wholesalePrice ? parseFloat(priceForm.wholesalePrice) : undefined,
        minimumWholesale: parseInt(priceForm.minimumWholesale),
        changeReason: priceForm.changeReason,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setPriceForm({ ...priceForm, changeReason: "" });
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar precios");
    } finally {
      setLoading(false);
    }
  };

  const handleAddScale = async () => {
    if (!scaleForm.minQuantity || !scaleForm.price) {
      setError("Completa los campos requeridos");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await createPriceScale({
        flavorId: flavor.id,
        minQuantity: parseInt(scaleForm.minQuantity),
        maxQuantity: scaleForm.maxQuantity ? parseInt(scaleForm.maxQuantity) : undefined,
        price: parseFloat(scaleForm.price),
      });

      if (result.error) {
        setError(result.error);
      } else {
        setScaleForm({ minQuantity: "", maxQuantity: "", price: "" });
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar escala");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScale = async (scaleId: string) => {
    if (!confirm("¿Eliminar esta escala de precios?")) return;

    setLoading(true);
    try {
      const result = await deletePriceScale(scaleId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al eliminar escala");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDiscount = async () => {
    if (!discountForm.discountPercent && !discountForm.fixedPrice) {
      setError("Ingresa un descuento o precio fijo");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await createDiscount({
        flavorId: flavor.id,
        applicableTo: discountForm.applicableTo,
        discountPercent: discountForm.discountPercent ? parseInt(discountForm.discountPercent) : undefined,
        fixedPrice: discountForm.fixedPrice ? parseFloat(discountForm.fixedPrice) : undefined,
        validUntil: discountForm.validUntil || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setDiscountForm({ applicableTo: "TODAS", discountPercent: "", fixedPrice: "", validUntil: "" });
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar descuento");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDiscount = async (discountId: string) => {
    if (!confirm("¿Eliminar este descuento?")) return;

    setLoading(true);
    try {
      const result = await deleteDiscount(discountId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al eliminar descuento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b mb-6">
        <button
          onClick={() => setActiveTab("precios")}
          className={`pb-2 px-4 font-semibold transition-colors ${
            activeTab === "precios"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Precios Base
        </button>
        <button
          onClick={() => setActiveTab("escalas")}
          className={`pb-2 px-4 font-semibold transition-colors ${
            activeTab === "escalas"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Escalas de Precios
        </button>
        <button
          onClick={() => setActiveTab("descuentos")}
          className={`pb-2 px-4 font-semibold transition-colors ${
            activeTab === "descuentos"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Descuentos
        </button>
      </div>

      {/* Precios Base */}
      {activeTab === "precios" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Precio Minorista ($)
              </label>
              <NoScrollNumberInput
                type="number"
                step="0.01"
                min="0"
                value={priceForm.basePrice}
                onChange={(e) => setPriceForm({ ...priceForm, basePrice: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Precio Mayorista ($)
              </label>
              <NoScrollNumberInput
                type="number"
                step="0.01"
                min="0"
                value={priceForm.wholesalePrice}
                onChange={(e) => setPriceForm({ ...priceForm, wholesalePrice: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mínimo Mayoreo (unidades)
              </label>
              <NoScrollNumberInput
                type="number"
                min="1"
                value={priceForm.minimumWholesale}
                onChange={(e) => setPriceForm({ ...priceForm, minimumWholesale: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Razón del cambio (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Ajuste de mercado, Promoción especial..."
              value={priceForm.changeReason}
              onChange={(e) => setPriceForm({ ...priceForm, changeReason: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleUpdatePrices}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar Precios"}
          </button>
        </div>
      )}

      {/* Escalas de Precios */}
      {activeTab === "escalas" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cantidad Mínima *
              </label>
              <NoScrollNumberInput
                type="number"
                min="1"
                value={scaleForm.minQuantity}
                onChange={(e) => setScaleForm({ ...scaleForm, minQuantity: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cantidad Máxima (opcional)
              </label>
              <NoScrollNumberInput
                type="number"
                min="1"
                value={scaleForm.maxQuantity}
                onChange={(e) => setScaleForm({ ...scaleForm, maxQuantity: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Precio ($) *
              </label>
              <NoScrollNumberInput
                type="number"
                step="0.01"
                min="0"
                value={scaleForm.price}
                onChange={(e) => setScaleForm({ ...scaleForm, price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleAddScale}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50"
          >
            <Plus size={18} />
            Agregar Escala
          </button>

          {/* Escalas existentes */}
          <div className="mt-6 space-y-2">
            <h3 className="font-semibold text-gray-900">Escalas actuales:</h3>
            {flavor.priceScales && flavor.priceScales.length > 0 ? (
              <div className="space-y-2">
                {flavor.priceScales.map((scale) => (
                  <div
                    key={scale.id}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200"
                  >
                    <div className="text-sm">
                      <span className="font-semibold">{scale.minQuantity}</span>
                      {scale.maxQuantity && <span> - {scale.maxQuantity}</span>} unidades:{" "}
                      <span className="text-blue-600 font-bold">${scale.price.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteScale(scale.id)}
                      className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Sin escalas configuradas</p>
            )}
          </div>
        </div>
      )}

      {/* Descuentos */}
      {activeTab === "descuentos" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Aplicable a
              </label>
              <select
                value={discountForm.applicableTo}
                onChange={(e) => setDiscountForm({ ...discountForm, applicableTo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODAS">Todos los clientes</option>
                <option value="MINORISTA">Minoristas</option>
                <option value="MAYORISTA">Mayoristas</option>
                <option value="DISTRIBUIDOR">Distribuidores</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Válido hasta (opcional)
              </label>
              <input
                type="date"
                value={discountForm.validUntil}
                onChange={(e) => setDiscountForm({ ...discountForm, validUntil: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descuento (%)
              </label>
              <NoScrollNumberInput
                type="number"
                min="0"
                max="100"
                value={discountForm.discountPercent}
                onChange={(e) => setDiscountForm({ ...discountForm, discountPercent: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                O Precio Fijo ($)
              </label>
              <NoScrollNumberInput
                type="number"
                step="0.01"
                min="0"
                value={discountForm.fixedPrice}
                onChange={(e) => setDiscountForm({ ...discountForm, fixedPrice: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleAddDiscount}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50"
          >
            <Plus size={18} />
            Agregar Descuento
          </button>

          {/* Descuentos existentes */}
          <div className="mt-6 space-y-2">
            <h3 className="font-semibold text-gray-900">Descuentos actuales:</h3>
            {flavor.discounts && flavor.discounts.length > 0 ? (
              <div className="space-y-2">
                {flavor.discounts.map((discount) => (
                  <div
                    key={discount.id}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200"
                  >
                    <div className="text-sm flex-1">
                      <p className="font-semibold text-gray-900">{discount.applicableTo}</p>
                      <p className="text-gray-600">
                        {discount.discountPercent
                          ? `${discount.discountPercent}% descuento`
                          : `Precio fijo: $${discount.fixedPrice.toFixed(2)}`}
                      </p>
                      {discount.validUntil && (
                        <p className="text-xs text-gray-500">
                          Válido hasta: {new Date(discount.validUntil).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteDiscount(discount.id)}
                      className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Sin descuentos configurados</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
