"use client";

import { useMemo, useState } from "react";
import { saveSelectedFlavors } from "@/app/_actions/flavors";

interface Flavor {
  id: string;
  name: string;
}

interface FlavorSelectorProps {
  subscriptionId: string;
  unitCount: number;
  flavors: Flavor[];
  currentSelection: unknown;
  canEdit: boolean;
  lockDateLabel: string;
  shipmentDateLabel: string;
}

function normalizeClientSelection(currentSelection: unknown, flavors: Flavor[]) {
  if (!currentSelection || typeof currentSelection !== "object" || Array.isArray(currentSelection)) {
    return {} as Record<string, number>;
  }

  const byId = new Map(flavors.map((flavor) => [flavor.id, flavor]));
  const byName = new Map(flavors.map((flavor) => [flavor.name.trim().toLowerCase(), flavor]));
  const normalized: Record<string, number> = {};

  for (const [rawKey, rawValue] of Object.entries(currentSelection as Record<string, unknown>)) {
    const quantity = Number(rawValue);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    const flavor = byId.get(rawKey) || byName.get(rawKey.trim().toLowerCase());
    if (!flavor) continue;

    normalized[flavor.id] = (normalized[flavor.id] || 0) + quantity;
  }

  return normalized;
}

export default function FlavorSelector({
  subscriptionId,
  unitCount,
  flavors,
  currentSelection,
  canEdit,
  lockDateLabel,
  shipmentDateLabel,
}: FlavorSelectorProps) {
  const [selection, setSelection] = useState<Record<string, number>>(() =>
    normalizeClientSelection(currentSelection, flavors),
  );
  const [loading, setLoading] = useState(false);

  const totalSelected = useMemo(
    () => Object.values(selection).reduce((sum, value) => sum + value, 0),
    [selection],
  );

  const updateQuantity = (flavorId: string, delta: number) => {
    if (!canEdit) return;

    const currentQty = selection[flavorId] || 0;
    const newQty = currentQty + delta;

    if (newQty < 0) return;
    if (delta > 0 && totalSelected >= unitCount) return;

    setSelection((current) => ({
      ...current,
      [flavorId]: newQty,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveSelectedFlavors(subscriptionId, selection, totalSelected, unitCount);
      alert("Sabores guardados con éxito.");
    } catch (error: any) {
      alert(error?.message || "No se pudieron guardar los sabores.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mt-8">
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex justify-between items-center gap-3">
          <h3 className="text-xl font-bold text-gray-900">Personaliza tu pack</h3>
          <span
            className={`px-4 py-1 rounded-full font-bold text-sm ${
              totalSelected === unitCount ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
            }`}
          >
            {totalSelected} / {unitCount} bebidas
          </span>
        </div>

        <div className={`rounded-2xl border px-4 py-3 text-sm ${canEdit ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          {canEdit
            ? `Puedes cambiar tus sabores hasta el ${lockDateLabel}. Tu próximo envío está programado para el ${shipmentDateLabel}.`
            : `La selección para el próximo envío ya quedó cerrada desde el ${lockDateLabel}. El siguiente envío sale el ${shipmentDateLabel}.`}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {flavors.map((flavor) => (
          <div key={flavor.id} className="flex items-center justify-between p-4 border rounded-2xl hover:bg-gray-50 transition">
            <span className="font-medium text-gray-700">{flavor.name}</span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => updateQuantity(flavor.id, -1)}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40"
                disabled={!canEdit}
              >
                -
              </button>
              <span className="w-4 text-center font-bold">{selection[flavor.id] || 0}</span>
              <button
                type="button"
                onClick={() => updateQuantity(flavor.id, 1)}
                className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 disabled:bg-gray-300"
                disabled={!canEdit || totalSelected >= unitCount}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!canEdit || loading || totalSelected !== unitCount}
        className="w-full bg-[#8B3A28] text-white py-4 rounded-2xl font-bold hover:bg-[#6b2d1f] transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Guardando..." : canEdit ? "Confirmar selección de sabores" : "Edición cerrada para este envío"}
      </button>
    </div>
  );
}
