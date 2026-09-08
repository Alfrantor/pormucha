"use client";

import { useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import Link from "next/link";
import { Archive, Boxes, Eye, Pencil, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { archiveCatalogLocation, createCatalogLocation, updateCatalogLocation } from "@/actions/admin-actions";

type LocationItem = {
  id: string;
  name: string;
  address: string | null;
  isDefault: boolean;
  isArchived: boolean;
  productStockTotal: number;
  rawMaterialStockTotal: number;
  orderCount: number;
  incomingTransferCount: number;
  outgoingTransferCount: number;
  openProcessCount: number;
  productStocks: Array<{ name: string; quantity: number }>;
  rawMaterialStocks: Array<{ name: string; unit: string; quantity: number }>;
  recentOrders: Array<{ id: string; folio: string | null; channel: string; status: string; total: number; createdAt: string }>;
  incomingTransfers: Array<{
    id: string;
    status: string;
    quantitySent: number;
    quantityReceived: number | null;
    flavorName: string;
    relatedLocationName: string;
    createdAt: string;
  }>;
  outgoingTransfers: Array<{
    id: string;
    status: string;
    quantitySent: number;
    quantityReceived: number | null;
    flavorName: string;
    relatedLocationName: string;
    createdAt: string;
  }>;
  openProcesses: Array<{ label: string; count: number }>;
};

type FormState = {
  name: string;
  address: string;
  isDefault: boolean;
};

type ActiveTab = "active" | "default" | "archived";
type ModalState = { mode: "create" } | { mode: "edit"; location: LocationItem } | null;

const EMPTY_FORM: FormState = {
  name: "",
  address: "",
  isDefault: false,
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function LocationsCatalogManager({ locations }: { locations: LocationItem[] }) {
  const [items, setItems] = useState(locations);
  const [activeTab, setActiveTab] = useState<ActiveTab>("active");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [usageModal, setUsageModal] = useState<LocationItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const activeLocations = useMemo(() => items.filter((location) => !location.isArchived), [items]);
  const defaultLocations = useMemo(() => items.filter((location) => !location.isArchived && location.isDefault), [items]);
  const archivedLocations = useMemo(() => items.filter((location) => location.isArchived), [items]);

  const filtered = useMemo(() => {
    const base =
      activeTab === "archived" ? archivedLocations : activeTab === "default" ? defaultLocations : activeLocations;
    const query = normalize(search);
    return base.filter((location) => {
      if (!query) return true;
      return normalize(`${location.name} ${location.address || ""}`).includes(query);
    });
  }, [activeLocations, activeTab, archivedLocations, defaultLocations, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ mode: "create" });
  };

  const openEdit = (location: LocationItem) => {
    setForm({
      name: location.name,
      address: location.address || "",
      isDefault: location.isDefault,
    });
    setModal({ mode: "edit", location });
  };

  const closeModal = () => {
    setModal(null);
    setSaving(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("El nombre de la ubicación es obligatorio.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      isDefault: form.isDefault,
    };

    if (modal?.mode === "edit") {
      setSaving(true);
      const result = await updateCatalogLocation(modal.location.id, payload);
      setSaving(false);

      if (!result.success) {
        toast.error(result.error || "No se pudo actualizar la ubicación.");
        return;
      }

      setItems((current) =>
        current.map((location) => {
          if (payload.isDefault && location.id !== modal.location.id) return { ...location, isDefault: false };
          if (location.id !== modal.location.id) return location;
          return {
            ...location,
            name: payload.name,
            address: payload.address || null,
            isDefault: payload.isDefault,
          };
        }),
      );
      toast.success("Ubicación actualizada.");
    } else {
      setSaving(true);
      const result = await createCatalogLocation(payload);
      setSaving(false);

      if (!result.success || !result.location) {
        toast.error(result.error || "No se pudo crear la ubicación.");
        return;
      }

      setItems((current) => [
        {
          ...result.location!,
          productStockTotal: 0,
          rawMaterialStockTotal: 0,
          orderCount: 0,
          incomingTransferCount: 0,
          outgoingTransferCount: 0,
          openProcessCount: 0,
          productStocks: [],
          rawMaterialStocks: [],
          recentOrders: [],
          incomingTransfers: [],
          outgoingTransfers: [],
          openProcesses: [],
        },
        ...current.map((location) => (payload.isDefault ? { ...location, isDefault: false } : location)),
      ]);
      toast.success("Ubicación creada.");
    }

    closeModal();
  };

  const handleArchive = async (location: LocationItem) => {
    const archive = !location.isArchived;
    const result = await archiveCatalogLocation(location.id, archive);
    if (!result.success) {
      toast.error(result.error || "No se pudo cambiar el estado de la ubicación.");
      return;
    }

    setItems((current) =>
      current.map((item) => (item.id === location.id ? { ...item, isArchived: archive } : item)),
    );
    toast.success(archive ? "Ubicación archivada." : "Ubicación restaurada.");
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Catálogo</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Almacenes y plantas</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Administra las ubicaciones que se usan en POS, inventarios, producción y traspasos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/inventory"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Boxes size={14} />
              Ver inventarios
            </Link>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800"
            >
              <Plus size={14} />
              Nueva ubicación
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <TabButton active={activeTab === "active"} onClick={() => setActiveTab("active")} label={`Activas (${activeLocations.length})`} />
            <TabButton active={activeTab === "default"} onClick={() => setActiveTab("default")} label={`Principal (${defaultLocations.length})`} />
            <TabButton active={activeTab === "archived"} onClick={() => setActiveTab("archived")} label={`Archivadas (${archivedLocations.length})`} />
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar ubicación o dirección..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.2fr_1.35fr_0.75fr_1fr] gap-4 bg-slate-50 px-5 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 lg:grid">
          <div>Ubicación</div>
          <div>Dirección</div>
          <div>Estado</div>
          <div className="text-right">Acción</div>
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.length > 0 ? (
            filtered.map((location) => (
              <LocationRow
                key={location.id}
                location={location}
                onViewUsage={() => setUsageModal(location)}
                onEdit={() => openEdit(location)}
                onArchive={() => handleArchive(location)}
              />
            ))
          ) : (
            <div className="px-5 py-16 text-center">
              <p className="font-black text-slate-950">No encontré ubicaciones con ese filtro.</p>
              <p className="mt-1 text-sm font-semibold text-slate-400">Puedes cambiar de pestaña, buscar otra palabra o crear una nueva.</p>
            </div>
          )}
        </div>
      </section>

      {modal ? (
        <LocationModal
          modal={modal}
          form={form}
          saving={saving}
          setForm={setForm}
          onClose={closeModal}
          onSave={handleSave}
        />
      ) : null}

      {usageModal ? <UsageModal location={usageModal} onClose={() => setUsageModal(null)} /> : null}
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

function LocationRow({
  location,
  onEdit,
  onArchive,
  onViewUsage,
}: {
  location: LocationItem;
  onEdit: () => void;
  onArchive: () => void;
  onViewUsage: () => void;
}) {
  return (
    <div className="grid gap-3 px-5 py-4 text-sm lg:grid-cols-[1.2fr_1.35fr_0.75fr_1fr] lg:items-center lg:gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-black text-slate-950">{location.name}</p>
          {location.isDefault ? (
            <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">Principal</span>
          ) : null}
        </div>
        <p className="mt-1 text-xs font-semibold text-slate-400">Planta / almacén operativo</p>
      </div>
      <MobileLabel label="Dirección" value={location.address || "Sin dirección registrada"} />
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 lg:hidden">Estado</p>
        <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${location.isArchived ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
          {location.isArchived ? "Archivada" : "Activa"}
        </span>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onViewUsage}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Eye size={13} />
          Ver
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800"
        >
          <Pencil size={13} />
          Editar
        </button>
        <button
          type="button"
          onClick={onArchive}
          disabled={location.isDefault && !location.isArchived}
          title={location.isDefault && !location.isArchived ? "La ubicación principal no se puede archivar." : undefined}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
            location.isArchived ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
          }`}
        >
          <Archive size={13} />
          {location.isArchived ? "Restaurar" : "Archivar"}
        </button>
      </div>
    </div>
  );
}

function MobileLabel({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 lg:hidden">{label}</p>
      <p className="font-bold text-slate-700">{value}</p>
    </div>
  );
}

function UsageModal({ location, onClose }: { location: LocationItem; onClose: () => void }) {
  const totalTransfers = location.incomingTransfers.length + location.outgoingTransfers.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[86vh] w-full max-w-5xl overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Uso del almacén</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{location.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{location.address || "Sin dirección registrada"}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(86vh-7rem)] overflow-y-auto p-6">
          <div className="grid gap-3 md:grid-cols-4">
            <SummaryTile label="Producto" value={location.productStockTotal.toLocaleString("es-MX")} />
            <SummaryTile label="Insumos" value={location.rawMaterialStockTotal.toLocaleString("es-MX", { maximumFractionDigits: 2 })} />
            <SummaryTile label="Procesos" value={String(location.openProcessCount)} />
            <SummaryTile label="Órdenes" value={String(location.orderCount)} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <DetailCard title="Producto terminado" empty="No hay producto terminado en esta ubicación.">
              {location.productStocks.map((stock) => (
                <DetailRow key={stock.name} label={stock.name} value={`${stock.quantity.toLocaleString("es-MX")} pzas`} />
              ))}
            </DetailCard>

            <DetailCard title="Materias primas e insumos" empty="No hay insumos en esta ubicación.">
              {location.rawMaterialStocks.map((stock) => (
                <DetailRow
                  key={`${stock.name}-${stock.unit}`}
                  label={stock.name}
                  value={`${stock.quantity.toLocaleString("es-MX", { maximumFractionDigits: 2 })} ${stock.unit}`}
                />
              ))}
            </DetailCard>

            <DetailCard title="Procesos abiertos" empty="No hay procesos abiertos usando esta ubicación.">
              {location.openProcesses.map((process) => (
                <DetailRow key={process.label} label={process.label} value={`${process.count} activo(s)`} />
              ))}
            </DetailCard>

            <DetailCard title="Traspasos recientes" empty="No hay traspasos recientes asociados.">
              {totalTransfers > 0
                ? [
                    ...location.outgoingTransfers.map((transfer) => ({ ...transfer, direction: "Salida hacia" })),
                    ...location.incomingTransfers.map((transfer) => ({ ...transfer, direction: "Entrada desde" })),
                  ].map((transfer) => (
                    <DetailRow
                      key={`${transfer.direction}-${transfer.id}`}
                      label={`${transfer.direction} ${transfer.relatedLocationName}`}
                      value={`${transfer.flavorName} · ${transfer.quantitySent} pzas · ${transfer.status}`}
                      helper={new Date(transfer.createdAt).toLocaleDateString("es-MX")}
                    />
                  ))
                : null}
            </DetailCard>

            <div className="lg:col-span-2">
              <DetailCard title="Órdenes recientes" empty="No hay órdenes recientes en esta ubicación.">
                {location.recentOrders.map((order) => (
                  <DetailRow
                    key={order.id}
                    label={`${order.folio || order.id.slice(0, 8)} · ${order.channel}`}
                    value={`${order.total.toLocaleString("es-MX", { style: "currency", currency: "MXN" })} · ${order.status}`}
                    helper={new Date(order.createdAt).toLocaleDateString("es-MX")}
                  />
                ))}
              </DetailCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function DetailCard({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasContent = Array.isArray(children) ? children.some(Boolean) : Boolean(children);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
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
        {helper ? <p className="text-xs font-semibold text-slate-400">{helper}</p> : null}
      </div>
      <p className="text-sm font-black text-slate-700">{value}</p>
    </div>
  );
}

function LocationModal({
  modal,
  form,
  saving,
  setForm,
  onClose,
  onSave,
}: {
  modal: Exclude<ModalState, null>;
  form: FormState;
  saving: boolean;
  setForm: Dispatch<SetStateAction<FormState>>;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = modal.mode === "edit";
  const defaultLocked = isEdit && modal.location.isDefault;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[1.8rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{isEdit ? "Edición" : "Alta"}</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {isEdit ? "Editar ubicación" : "Nueva ubicación"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Define nombre, dirección y si será la ubicación principal del sistema.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid gap-4">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Nombre</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ej. Lerma, Mérida, Almacén central"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Dirección</span>
              <textarea
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                rows={3}
                placeholder="Dirección operativa o referencia interna."
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              />
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={form.isDefault}
                disabled={defaultLocked}
                onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950"
              />
              <span>
                <span className="block text-sm font-black text-slate-950">Usar como ubicación principal</span>
                <span className="mt-1 block text-xs font-semibold text-slate-500">
                  Si activas esta opción, las demás ubicaciones dejan de ser principales.
                  {defaultLocked ? " Para cambiarla, marca otra ubicación como principal." : ""}
                </span>
              </span>
            </label>
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
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear ubicación"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
