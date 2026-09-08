"use client";

import { useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Eye, History, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { registerProductInventoryMovement } from "@/app/_actions/inventory";
import { NoScrollNumberInput } from "@/components/NoScrollNumberInput";

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

type ActiveTab = "all" | "available" | "empty";
type MovementType = "IN" | "OUT" | "ADJUST";
type MovementModalState = { flavor?: FlavorItem } | null;

type MovementForm = {
  type: MovementType;
  flavorId: string;
  locationId: string;
  quantity: string;
  lot: string;
  reason: string;
};

const EMPTY_MOVEMENT_FORM: MovementForm = {
  type: "IN",
  flavorId: "",
  locationId: "",
  quantity: "",
  lot: "",
  reason: "",
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getFlavorTotal(flavor: FlavorItem) {
  return flavor.locationStocks.reduce((sum, stock) => sum + Number(stock.quantity || 0), 0);
}

function getLastMovement(flavor: FlavorItem) {
  return flavor.movements[0] || null;
}

function movementLabel(type: string) {
  if (type === "IN") return "Entrada";
  if (type === "OUT") return "Salida";
  return "Movimiento";
}

function movementTone(type: string) {
  return type === "IN" ? "text-emerald-700" : "text-rose-700";
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
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [movementModal, setMovementModal] = useState<MovementModalState>(null);
  const [detailModal, setDetailModal] = useState<FlavorItem | null>(null);
  const [movementForm, setMovementForm] = useState<MovementForm>({
    ...EMPTY_MOVEMENT_FORM,
    flavorId: initialFlavors[0]?.id || "",
    locationId: locations[0]?.id || "",
  });
  const [saving, setSaving] = useState(false);

  const availableFlavors = useMemo(() => flavors.filter((flavor) => getFlavorTotal(flavor) > 0), [flavors]);
  const emptyFlavors = useMemo(() => flavors.filter((flavor) => getFlavorTotal(flavor) <= 0), [flavors]);

  const filteredFlavors = useMemo(() => {
    const base = activeTab === "available" ? availableFlavors : activeTab === "empty" ? emptyFlavors : flavors;
    const query = normalize(search);

    return base.filter((flavor) => {
      const matchesSearch = !query || normalize(`${flavor.name} ${flavor.slug}`).includes(query);
      const matchesLocation =
        locationFilter === "ALL" ||
        flavor.locationStocks.some((stock) => stock.locationId === locationFilter && Number(stock.quantity || 0) > 0);
      return matchesSearch && matchesLocation;
    });
  }, [activeTab, availableFlavors, emptyFlavors, flavors, locationFilter, search]);

  const openMovementModal = (flavor?: FlavorItem) => {
    setMovementForm({
      ...EMPTY_MOVEMENT_FORM,
      flavorId: flavor?.id || flavors[0]?.id || "",
      locationId: locations[0]?.id || "",
      reason: flavor ? `Movimiento manual de ${flavor.name}` : "",
    });
    setMovementModal({ flavor });
  };

  const closeMovementModal = () => {
    setMovementModal(null);
    setSaving(false);
  };

  const handleMovement = async () => {
    if (!movementForm.flavorId || !movementForm.locationId || !movementForm.quantity || !movementForm.reason.trim()) {
      toast.error("Completa producto, ubicación, cantidad y motivo.");
      return;
    }

    const quantity = Number(movementForm.quantity);
    if (!Number.isFinite(quantity) || quantity < 0 || (movementForm.type !== "ADJUST" && quantity <= 0)) {
      toast.error("La cantidad debe ser válida.");
      return;
    }

    setSaving(true);
    const result = await registerProductInventoryMovement({
      flavorId: movementForm.flavorId,
      locationId: movementForm.locationId,
      type: movementForm.type,
      quantity,
      lot: movementForm.lot,
      reason: movementForm.reason,
    });
    setSaving(false);

    if (!result.success) {
      toast.error(result.error || "No se pudo registrar el movimiento.");
      return;
    }

    setFlavors((current) =>
      current.map((flavor) => {
        if (flavor.id !== result.flavorId) return flavor;

        const nextStocks = [...flavor.locationStocks];
        const stockIndex = nextStocks.findIndex((stock) => stock.locationId === result.locationId);
        const location = locations.find((item) => item.id === result.locationId) || null;

        if (stockIndex >= 0) {
          nextStocks[stockIndex] = {
            ...nextStocks[stockIndex],
            quantity: result.newQuantity,
            location,
          };
        } else {
          nextStocks.push({
            id: `${result.flavorId}-${result.locationId}`,
            quantity: result.newQuantity,
            locationId: result.locationId!,
            location,
          });
        }

        return {
          ...flavor,
          locationStocks: nextStocks.sort((a, b) => (a.location?.name || "").localeCompare(b.location?.name || "", "es-MX")),
          movements: [result.movement as MovementItem, ...flavor.movements].slice(0, 12),
        };
      }),
    );

    toast.success("Movimiento registrado.");
    closeMovementModal();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Inventario</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Producto terminado</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Consulta existencias de botellas por sabor y registra entradas, salidas o ajustes por almacén.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openMovementModal()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800"
          >
            <Plus size={14} />
            Registrar movimiento
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")} label={`Todos (${flavors.length})`} />
            <TabButton active={activeTab === "available"} onClick={() => setActiveTab("available")} label={`Con existencia (${availableFlavors.length})`} />
            <TabButton active={activeTab === "empty"} onClick={() => setActiveTab("empty")} label={`Sin existencia (${emptyFlavors.length})`} />
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_0.85fr] xl:w-[42rem]">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar sabor..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>
            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white"
            >
              <option value="ALL">Todas las ubicaciones</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.2fr_0.7fr_1.2fr_1.1fr_0.9fr] gap-4 bg-slate-50 px-5 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 lg:grid">
          <div>Sabor</div>
          <div>Existencia</div>
          <div>Ubicaciones</div>
          <div>Último movimiento</div>
          <div className="text-right">Acción</div>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredFlavors.length > 0 ? (
            filteredFlavors.map((flavor) => (
              <FlavorInventoryRow
                key={flavor.id}
                flavor={flavor}
                onView={() => setDetailModal(flavor)}
                onMove={() => openMovementModal(flavor)}
              />
            ))
          ) : (
            <div className="px-5 py-16 text-center">
              <p className="font-black text-slate-950">No encontré producto con ese filtro.</p>
              <p className="mt-1 text-sm font-semibold text-slate-400">Cambia la búsqueda, ubicación o pestaña seleccionada.</p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
        Los packs no tienen stock independiente: se arman con las botellas disponibles por sabor. Packs configurados:{" "}
        <span className="font-black text-slate-950">{products.length}</span>.
      </section>

      {movementModal ? (
        <MovementModal
          form={movementForm}
          saving={saving}
          flavors={flavors}
          locations={locations}
          setForm={setMovementForm}
          onClose={closeMovementModal}
          onSave={handleMovement}
        />
      ) : null}

      {detailModal ? <DetailModal flavor={detailModal} onClose={() => setDetailModal(null)} /> : null}
    </div>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
        active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-950"
      }`}
    >
      {label}
    </button>
  );
}

function FlavorInventoryRow({ flavor, onView, onMove }: { flavor: FlavorItem; onView: () => void; onMove: () => void }) {
  const total = getFlavorTotal(flavor);
  const lastMovement = getLastMovement(flavor);

  return (
    <div className="grid gap-3 px-5 py-4 text-sm lg:grid-cols-[1.2fr_0.7fr_1.2fr_1.1fr_0.9fr] lg:items-center lg:gap-4">
      <div>
        <p className="font-black text-slate-950">{flavor.name}</p>
        <p className="mt-1 text-xs font-semibold text-slate-400">{flavor.slug}</p>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 lg:hidden">Existencia</p>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${total > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {total.toLocaleString("es-MX")} pzas
        </span>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 lg:hidden">Ubicaciones</p>
        <div className="flex flex-wrap gap-1.5">
          {flavor.locationStocks.filter((stock) => Number(stock.quantity || 0) > 0).length > 0 ? (
            flavor.locationStocks
              .filter((stock) => Number(stock.quantity || 0) > 0)
              .slice(0, 3)
              .map((stock) => (
                <span key={stock.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
                  {stock.location?.name || "Sin ubicación"}: {Number(stock.quantity)}
                </span>
              ))
          ) : (
            <span className="text-xs font-semibold text-slate-400">Sin existencias</span>
          )}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 lg:hidden">Último movimiento</p>
        {lastMovement ? (
          <>
            <p className={`font-black ${movementTone(lastMovement.type)}`}>
              {movementLabel(lastMovement.type)} {lastMovement.type === "IN" ? "+" : "-"}
              {Number(lastMovement.quantity)}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">{formatDateTime(lastMovement.createdAt)}</p>
          </>
        ) : (
          <p className="text-xs font-semibold text-slate-400">Sin movimientos</p>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Eye size={13} />
          Ver
        </button>
        <button
          type="button"
          onClick={onMove}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800"
        >
          <Plus size={13} />
          Movimiento
        </button>
      </div>
    </div>
  );
}

function MovementModal({
  form,
  saving,
  flavors,
  locations,
  setForm,
  onClose,
  onSave,
}: {
  form: MovementForm;
  saving: boolean;
  flavors: FlavorItem[];
  locations: LocationOption[];
  setForm: Dispatch<SetStateAction<MovementForm>>;
  onClose: () => void;
  onSave: () => void;
}) {
  const selectedFlavor = flavors.find((flavor) => flavor.id === form.flavorId) || null;
  const selectedStock = selectedFlavor?.locationStocks.find((stock) => stock.locationId === form.locationId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[1.8rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Movimiento</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Registrar movimiento</h2>
            <p className="mt-1 text-sm text-slate-500">Entradas, salidas y ajustes de producto terminado por ubicación.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            {(["IN", "OUT", "ADJUST"] as MovementType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm((current) => ({ ...current, type }))}
                className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                  form.type === type ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {type === "IN" ? "Entrada" : type === "OUT" ? "Salida" : "Ajuste"}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Producto / sabor">
              <select
                value={form.flavorId}
                onChange={(event) => setForm((current) => ({ ...current, flavorId: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
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
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={form.type === "ADJUST" ? "Existencia final" : "Cantidad"}>
              <NoScrollNumberInput
                min="0"
                step="1"
                value={form.quantity}
                onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                placeholder={form.type === "ADJUST" ? "Ej. 120" : "Ej. 24"}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              />
            </Field>
            <Field label="Lote opcional">
              <input
                value={form.lot}
                onChange={(event) => setForm((current) => ({ ...current, lot: event.target.value }))}
                placeholder="Ej. LT-240817-A"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              />
            </Field>
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Motivo</span>
              <textarea
                value={form.reason}
                onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                rows={3}
                placeholder="Ej. Producción etiquetada, salida por merma, conteo físico..."
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              />
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
            Existencia actual:{" "}
            <span className="font-black text-slate-950">
              {Number(selectedStock?.quantity || 0).toLocaleString("es-MX")} pzas
            </span>
            {selectedFlavor ? ` de ${selectedFlavor.name}` : ""}.
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
            <button type="button" onClick={onClose} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="flex-1 rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar movimiento"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ flavor, onClose }: { flavor: FlavorItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Detalle de inventario</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{flavor.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{flavor.slug}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(86vh-7rem)] overflow-y-auto p-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <DetailCard title="Existencias por ubicación" empty="No hay existencias registradas.">
              {flavor.locationStocks
                .filter((stock) => Number(stock.quantity || 0) > 0)
                .map((stock) => (
                  <DetailRow
                    key={stock.id}
                    label={stock.location?.name || "Sin ubicación"}
                    value={`${Number(stock.quantity || 0).toLocaleString("es-MX")} pzas`}
                  />
                ))}
            </DetailCard>
            <DetailCard title="Movimientos recientes" empty="No hay movimientos registrados.">
              {flavor.movements.map((movement) => (
                <DetailRow
                  key={movement.id}
                  label={`${movementLabel(movement.type)} · ${movement.location?.name || "Sin ubicación"}`}
                  value={`${movement.type === "IN" ? "+" : "-"}${Number(movement.quantity)} pzas`}
                  helper={`${formatDateTime(movement.createdAt)} · ${movement.reason}`}
                />
              ))}
            </DetailCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasContent = Array.isArray(children) ? children.some(Boolean) : Boolean(children);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <History size={14} className="text-slate-400" />
        <h3 className="text-sm font-black text-slate-950">{title}</h3>
      </div>
      <div className="mt-3 space-y-2">
        {hasContent ? children : <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm font-semibold text-slate-400">{empty}</p>}
      </div>
    </section>
  );
}

function DetailRow({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-bold text-slate-950">{label}</p>
        {helper ? <p className="mt-1 text-xs font-semibold text-slate-400">{helper}</p> : null}
      </div>
      <p className="text-sm font-black text-slate-700">{value}</p>
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
