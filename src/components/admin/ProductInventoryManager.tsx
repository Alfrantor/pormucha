"use client";

import { type ReactNode, useMemo, useState } from "react";
import { Beer, Package2, Plus, History } from "lucide-react";
import { toast } from "sonner";
import { registerProductInventoryEntry } from "@/app/_actions/inventory";

type LocationOption = {
  id: string;
  name: string;
};

type MovementItem = {
  id: string;
  type: string;
  quantity: number;
  reason: string;
  userId?: string | null;
  createdAt: string;
  location?: {
    id: string;
    name: string;
  } | null;
};

type FlavorStock = {
  id: string;
  quantity: number;
  locationId: string;
  location?: {
    id: string;
    name: string;
  } | null;
};

type FlavorItem = {
  id: string;
  name: string;
  slug: string;
  locationStocks: FlavorStock[];
  movements: MovementItem[];
};

type ProductItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

const EMPTY_FORM = {
  flavorId: "",
  locationId: "",
  quantity: "",
  lot: "",
};

export function ProductInventoryManager({
  flavors: initialFlavors,
  products,
  locations,
}: {
  flavors: FlavorItem[];
  products: ProductItem[];
  locations: LocationOption[];
}) {
  const [flavors, setFlavors] = useState(initialFlavors);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    flavorId: initialFlavors[0]?.id || "",
    locationId: locations[0]?.id || "",
  });
  const [saving, setSaving] = useState(false);

  const totalFlavorStock = useMemo(
    () =>
      flavors.reduce(
        (sum, flavor) =>
          sum + flavor.locationStocks.reduce((inner, stock) => inner + Number(stock.quantity || 0), 0),
        0,
      ),
    [flavors],
  );

  const selectedFlavor = flavors.find((flavor) => flavor.id === form.flavorId) || null;

  const handleSubmit = async () => {
    if (!form.flavorId || !form.locationId || !form.quantity || !form.lot.trim()) {
      toast.error("Completa producto, ubicación, cantidad y lote");
      return;
    }

    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("La cantidad debe ser mayor a cero");
      return;
    }

    setSaving(true);
    const result = await registerProductInventoryEntry({
      flavorId: form.flavorId,
      locationId: form.locationId,
      quantity,
      lot: form.lot.trim(),
    });
    setSaving(false);

    if (!result.success) {
      toast.error(result.error || "No se pudo registrar la entrada");
      return;
    }

    setFlavors((current) =>
      current.map((flavor) => {
        if (flavor.id !== result.flavorId) return flavor;

        const nextStocks = [...flavor.locationStocks];
        const stockIndex = nextStocks.findIndex((stock) => stock.locationId === result.locationId);

        if (stockIndex >= 0) {
          nextStocks[stockIndex] = {
            ...nextStocks[stockIndex],
            quantity: result.newQuantity,
          };
        } else {
          const location = locations.find((entry) => entry.id === result.locationId) || null;
          nextStocks.push({
            id: `${result.flavorId}-${result.locationId}`,
            quantity: result.newQuantity,
            locationId: result.locationId!,
            location,
          });
        }

        return {
          ...flavor,
          locationStocks: nextStocks.sort((a, b) => (a.location?.name || "").localeCompare(b.location?.name || "", "es")),
          movements: [result.movement as MovementItem, ...flavor.movements].slice(0, 12),
        };
      }),
    );

    toast.success("Entrada registrada en inventario");
    setForm((current) => ({
      ...current,
      quantity: "",
      lot: "",
    }));
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Sabores activos" value={flavors.length} />
        <Metric label="Unidades de sabor" value={totalFlavorStock} />
        <Metric label="Packs" value={products.length} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_1.95fr]">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Movimientos</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Entrada de producto</h2>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-700">
              Producto terminado
            </span>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Registra botellas disponibles por sabor. El sistema suma existencias y deja trazado el lote en el historial.
          </p>

          <div className="mt-6 space-y-4">
            <Field label="Producto">
              <select
                value={form.flavorId}
                onChange={(event) => setForm((current) => ({ ...current, flavorId: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400"
              >
                {flavors.map((flavor) => (
                  <option key={flavor.id} value={flavor.id}>
                    {flavor.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Ubicación">
              <select
                value={form.locationId}
                onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400"
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cantidad">
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={form.quantity}
                  onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400"
                  placeholder="Ej. 120"
                />
              </Field>

              <Field label="Lote">
                <input
                  type="text"
                  value={form.lot}
                  onChange={(event) => setForm((current) => ({ ...current, lot: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400"
                  placeholder="Ej. LT-240817-A"
                />
              </Field>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={16} />
              {saving ? "Registrando entrada..." : "Dar entrada al inventario"}
            </button>
          </div>

          {selectedFlavor && (
            <div className="mt-6 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Resumen actual</p>
              <p className="mt-2 text-lg font-black text-slate-950">{selectedFlavor.name}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedFlavor.locationStocks.length > 0 ? (
                  selectedFlavor.locationStocks.map((stock) => (
                    <span key={stock.id} className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-600">
                      {stock.location?.name || "Sin ubicación"}: {Number(stock.quantity)}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Sin existencias registradas
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-6">
          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Beer size={18} className="text-slate-500" />
              <h2 className="text-xl font-black text-slate-950">Botellas</h2>
            </div>
            <div className="mt-4 space-y-3">
              {flavors.map((flavor) => {
                const total = flavor.locationStocks.reduce((sum, stock) => sum + Number(stock.quantity), 0);
                return (
                  <div key={flavor.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-950">{flavor.name}</p>
                        <p className="text-xs text-slate-400">{flavor.slug}</p>
                      </div>
                      <p className="text-xl font-black text-slate-950">{total}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {flavor.locationStocks.map((stock) => (
                        <span key={stock.id} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                          {stock.location?.name || "Sin ubicación"}: {Number(stock.quantity)}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white/80 p-3">
                      <div className="flex items-center gap-2">
                        <History size={14} className="text-slate-400" />
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Movimientos recientes</p>
                      </div>
                      {flavor.movements.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-400">Aún no hay movimientos manuales registrados.</p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {flavor.movements.slice(0, 4).map((movement) => (
                            <div key={movement.id} className="rounded-2xl bg-slate-50 px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-black text-slate-900">
                                  {movement.type === "IN" ? "+" : "-"}
                                  {Number(movement.quantity)}
                                </p>
                                <p className="text-[11px] font-semibold text-slate-400">
                                  {formatDateTime(movement.createdAt)}
                                </p>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">{movement.reason}</p>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {movement.location?.name || "Sin ubicación"}
                                {movement.userId ? ` · ${movement.userId}` : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Package2 size={18} className="text-slate-500" />
              <h2 className="text-xl font-black text-slate-950">Packs</h2>
            </div>
            <div className="mt-4 space-y-3">
              {products.map((product) => (
                <div key={product.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-black text-slate-950">{product.name}</p>
                      <p className="text-xs text-slate-400">{product.quantity} botellas por pack</p>
                    </div>
                    <p className="text-lg font-black text-slate-950">
                      {Number(product.price).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Los packs siguen leyendo este inventario por sabor. Aquí controlamos la entrada de producto terminado; el surtido después toma esas existencias.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-lg">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/65">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
