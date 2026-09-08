"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { Archive, Box, Pencil, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { archiveRawMaterial, createRawMaterial, updateRawMaterial } from "@/app/_actions/raw-materials";
import { NoScrollNumberInput } from "@/components/NoScrollNumberInput";

const UNITS = ["kg", "g", "litros", "ml", "piezas", "cajas", "bolsas", "metros", "latas"];

type RawMaterial = {
  id: string;
  name: string;
  unit: string;
  category: string | null;
  description: string | null;
  minStock: number;
  cost: number | null;
  isArchived: boolean;
  stockTotal: number;
};

type FormState = {
  name: string;
  unit: string;
  category: string;
  description: string;
  minStock: string;
  cost: string;
};

type ActiveTab = "active" | "low-stock" | "archived";
type ModalState = { mode: "create" } | { mode: "edit"; material: RawMaterial } | null;

const EMPTY_FORM: FormState = {
  name: "",
  unit: "kg",
  category: "",
  description: "",
  minStock: "",
  cost: "",
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function formatMoney(value: number | null) {
  if (value == null) return "-";
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function isLowStock(material: RawMaterial) {
  return !material.isArchived && material.minStock > 0 && material.stockTotal <= material.minStock;
}

function getStockTone(material: RawMaterial) {
  if (material.stockTotal <= 0) return "bg-rose-50 text-rose-700";
  if (isLowStock(material)) return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

export function RawMaterialsCatalogManager({ rawMaterials }: { rawMaterials: RawMaterial[] }) {
  const [materials, setMaterials] = useState(rawMaterials);
  const [activeTab, setActiveTab] = useState<ActiveTab>("active");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const activeMaterials = useMemo(() => materials.filter((material) => !material.isArchived), [materials]);
  const lowStockMaterials = useMemo(() => materials.filter(isLowStock), [materials]);
  const archivedMaterials = useMemo(() => materials.filter((material) => material.isArchived), [materials]);

  const filtered = useMemo(() => {
    const base =
      activeTab === "archived" ? archivedMaterials : activeTab === "low-stock" ? lowStockMaterials : activeMaterials;
    const query = normalize(search);

    return base.filter((material) => {
      if (!query) return true;
      return normalize(`${material.name} ${material.category || ""} ${material.unit}`).includes(query);
    });
  }, [activeMaterials, activeTab, archivedMaterials, lowStockMaterials, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ mode: "create" });
  };

  const openEdit = (material: RawMaterial) => {
    setForm({
      name: material.name,
      unit: material.unit,
      category: material.category || "",
      description: material.description || "",
      minStock: material.minStock ? String(material.minStock) : "",
      cost: material.cost != null ? String(material.cost) : "",
    });
    setModal({ mode: "edit", material });
  };

  const closeModal = () => {
    setModal(null);
    setSaving(false);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.unit) {
      toast.error("Nombre y unidad son obligatorios.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      unit: form.unit,
      category: form.category.trim() || undefined,
      description: form.description.trim() || undefined,
      minStock: form.minStock ? Number(form.minStock) : 0,
      cost: form.cost ? Number(form.cost) : undefined,
    };

    if (Number.isNaN(payload.minStock) || payload.minStock < 0) {
      toast.error("El stock mínimo debe ser un número válido.");
      return;
    }

    if (payload.cost !== undefined && (Number.isNaN(payload.cost) || payload.cost < 0)) {
      toast.error("El costo debe ser un número válido.");
      return;
    }

    if (modal?.mode === "edit") {
      setSaving(true);
      const result = await updateRawMaterial(modal.material.id, payload);
      setSaving(false);

      if (!result.success) {
        toast.error(result.error || "No se pudo guardar la materia prima.");
        return;
      }

      setMaterials((current) =>
        current.map((material) =>
          material.id === modal.material.id
            ? {
                ...material,
                ...payload,
                category: payload.category || null,
                description: payload.description || null,
                cost: payload.cost ?? null,
              }
            : material,
        ),
      );
      toast.success("Materia prima actualizada.");
    } else {
      setSaving(true);
      const result = await createRawMaterial(payload);
      setSaving(false);

      if (!result.success) {
        toast.error(result.error || "No se pudo guardar la materia prima.");
        return;
      }

      setMaterials((current) => [
        {
          id: result.id || crypto.randomUUID(),
          name: payload.name,
          unit: payload.unit,
          category: payload.category || null,
          description: payload.description || null,
          minStock: payload.minStock,
          cost: payload.cost ?? null,
          isArchived: false,
          stockTotal: 0,
        },
        ...current,
      ]);
      toast.success("Materia prima creada.");
    }

    closeModal();
  };

  const handleArchive = async (material: RawMaterial) => {
    const archive = !material.isArchived;
    const result = await archiveRawMaterial(material.id, archive);
    if (!result.success) {
      toast.error(result.error || "No se pudo cambiar el estado.");
      return;
    }

    setMaterials((current) =>
      current.map((item) => (item.id === material.id ? { ...item, isArchived: archive } : item)),
    );
    toast.success(archive ? "Materia prima archivada." : "Materia prima restaurada.");
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Catálogo</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Materias primas e insumos</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Administra los datos base de cada insumo. Las entradas, salidas y existencias viven en inventario.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/inventory/raw-materials"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Box size={14} />
              Ver inventario
            </Link>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800"
            >
              <Plus size={14} />
              Nuevo insumo
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <TabButton active={activeTab === "active"} onClick={() => setActiveTab("active")} label={`Activos (${activeMaterials.length})`} />
            <TabButton active={activeTab === "low-stock"} onClick={() => setActiveTab("low-stock")} label={`Bajo mínimo (${lowStockMaterials.length})`} />
            <TabButton active={activeTab === "archived"} onClick={() => setActiveTab("archived")} label={`Archivados (${archivedMaterials.length})`} />
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar insumo, categoría o unidad..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.3fr_0.85fr_0.65fr_0.8fr_0.8fr_0.75fr] gap-4 bg-slate-50 px-5 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 lg:grid">
          <div>Insumo</div>
          <div>Categoría</div>
          <div>Unidad</div>
          <div>Stock actual</div>
          <div>Datos base</div>
          <div className="text-right">Acción</div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.length > 0 ? (
            filtered.map((material) => (
              <MaterialRow
                key={material.id}
                material={material}
                onEdit={() => openEdit(material)}
                onArchive={() => handleArchive(material)}
              />
            ))
          ) : (
            <div className="px-5 py-16 text-center">
              <p className="font-black text-slate-950">No encontré insumos con ese filtro.</p>
              <p className="mt-1 text-sm font-semibold text-slate-400">Puedes cambiar de pestaña, buscar otra palabra o crear uno nuevo.</p>
            </div>
          )}
        </div>
      </section>

      {modal ? (
        <MaterialModal
          modal={modal}
          form={form}
          saving={saving}
          setForm={setForm}
          onClose={closeModal}
          onSave={handleSave}
        />
      ) : null}
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

function MaterialRow({
  material,
  onEdit,
  onArchive,
}: {
  material: RawMaterial;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <div className="grid gap-3 px-5 py-4 text-sm lg:grid-cols-[1.3fr_0.85fr_0.65fr_0.8fr_0.8fr_0.75fr] lg:items-center lg:gap-4">
      <div>
        <p className="font-black text-slate-950">{material.name}</p>
        <p className="mt-1 text-xs font-semibold text-slate-400">{material.description || "Sin descripción"}</p>
      </div>
      <MobileLabel label="Categoría" value={material.category || "Sin categoría"} />
      <MobileLabel label="Unidad" value={material.unit} />
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 lg:hidden">Stock actual</p>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${getStockTone(material)}`}>
          {material.stockTotal.toLocaleString("es-MX", { maximumFractionDigits: 2 })} {material.unit}
        </span>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 lg:hidden">Datos base</p>
        <p className="font-bold text-slate-700">Mínimo: {material.minStock || 0} {material.unit}</p>
        <p className="text-xs font-semibold text-slate-400">Costo: {formatMoney(material.cost)}</p>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
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
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition ${
            material.isArchived ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
          }`}
        >
          <Archive size={13} />
          {material.isArchived ? "Restaurar" : "Archivar"}
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

function MaterialModal({
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[1.8rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{isEdit ? "Edición" : "Alta"}</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {isEdit ? "Editar materia prima" : "Nuevo insumo"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Captura sólo los datos base del insumo.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Nombre</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ej. Azúcar, té negro, botella euro"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Unidad</span>
              <select
                value={form.unit}
                onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              >
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Categoría</span>
              <input
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                placeholder="Ej. Fermentación, envase, azúcar"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Stock mínimo</span>
              <NoScrollNumberInput
                min="0"
                step="0.01"
                value={form.minStock}
                onChange={(event) => setForm((current) => ({ ...current, minStock: event.target.value }))}
                placeholder="0"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Costo unitario</span>
              <NoScrollNumberInput
                min="0"
                step="0.01"
                value={form.cost}
                onChange={(event) => setForm((current) => ({ ...current, cost: event.target.value }))}
                placeholder="0.00"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Descripción</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                placeholder="Notas internas, proveedor sugerido o especificaciones."
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              />
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
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear insumo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
