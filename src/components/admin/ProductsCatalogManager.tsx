"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { createFlavor, createProduct, updateCatalogFlavor, updateCatalogProduct } from "@/actions/admin-actions";
import { toggleStatus } from "@/actions/toggle-status";
import { NoScrollNumberInput } from "@/components/NoScrollNumberInput";
import { presentationsToInputValue } from "@/lib/flavor-presentations";

type Pack = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  clubDiscountPercent: number;
  isArchived: boolean;
};

type Flavor = {
  id: string;
  name: string;
  slug: string;
  price: number;
  basePrice: number;
  presentations: string[];
  stockTotal: number;
  isArchived: boolean;
};

type ProductsCatalogManagerProps = {
  packs: Pack[];
  flavors: Flavor[];
  adminEmail: string;
};

type ActiveTab = "packs" | "flavors" | "hidden";
type ModalState =
  | { type: "new-pack" }
  | { type: "new-flavor" }
  | { type: "edit-pack"; pack: Pack }
  | { type: "edit-flavor"; flavor: Flavor }
  | null;

function money(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function ProductsCatalogManager({ packs, flavors, adminEmail }: ProductsCatalogManagerProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("packs");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const query = normalizeSearch(search);
  const visiblePacks = useMemo(() => packs.filter((pack) => !pack.isArchived), [packs]);
  const visibleFlavors = useMemo(() => flavors.filter((flavor) => !flavor.isArchived), [flavors]);
  const hiddenItems = useMemo(
    () => [
      ...packs.filter((pack) => pack.isArchived).map((pack) => ({ kind: "pack" as const, item: pack })),
      ...flavors.filter((flavor) => flavor.isArchived).map((flavor) => ({ kind: "flavor" as const, item: flavor })),
    ],
    [flavors, packs],
  );

  const filteredPacks = useMemo(() => {
    return visiblePacks.filter((pack) => normalizeSearch(`${pack.name} ${pack.quantity}`).includes(query));
  }, [query, visiblePacks]);

  const filteredFlavors = useMemo(() => {
    return visibleFlavors.filter((flavor) => normalizeSearch(`${flavor.name} ${flavor.slug}`).includes(query));
  }, [query, visibleFlavors]);

  const filteredHidden = useMemo(() => {
    return hiddenItems.filter(({ item }) => normalizeSearch("slug" in item ? `${item.name} ${item.slug}` : `${item.name} ${item.quantity}`).includes(query));
  }, [hiddenItems, query]);

  return (
    <div className="space-y-5">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Catálogo</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Productos</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Administra packs, botellas, precios POS/Web y visibilidad comercial desde una vista compacta.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setModal({ type: "new-pack" })}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800"
            >
              <Plus size={14} />
              Nuevo pack
            </button>
            <button
              type="button"
              onClick={() => setModal({ type: "new-flavor" })}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Plus size={14} />
              Nuevo sabor
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <TabButton active={activeTab === "packs"} onClick={() => setActiveTab("packs")} label={`Packs (${visiblePacks.length})`} />
            <TabButton active={activeTab === "flavors"} onClick={() => setActiveTab("flavors")} label={`Sabores (${visibleFlavors.length})`} />
            <TabButton active={activeTab === "hidden"} onClick={() => setActiveTab("hidden")} label={`Ocultos (${hiddenItems.length})`} />
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar producto o sabor..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>
      </section>

      {activeTab === "packs" ? (
        <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
          <TableHeader columns={["Pack", "Botellas", "Precio", "Suscripción", "Estado", "Acción"]} />
          <div className="divide-y divide-slate-100">
            {filteredPacks.length > 0 ? (
              filteredPacks.map((pack) => <PackRow key={pack.id} pack={pack} onEdit={() => setModal({ type: "edit-pack", pack })} />)
            ) : (
              <EmptyState message="No encontré packs con esa búsqueda." />
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "flavors" ? (
        <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
          <TableHeader columns={["Sabor", "Slug", "Precio POS", "Presentación", "Estado", "Acción"]} />
          <div className="divide-y divide-slate-100">
            {filteredFlavors.length > 0 ? (
              filteredFlavors.map((flavor) => <FlavorRow key={flavor.id} flavor={flavor} onEdit={() => setModal({ type: "edit-flavor", flavor })} />)
            ) : (
              <EmptyState message="No encontré sabores con esa búsqueda." />
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "hidden" ? (
        <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
          <TableHeader columns={["Registro", "Tipo", "Dato clave", "Precio", "Estado", "Acción"]} />
          <div className="divide-y divide-slate-100">
            {filteredHidden.length > 0 ? (
              filteredHidden.map(({ kind, item }) =>
                kind === "pack" ? (
                  <PackRow key={`hidden-${item.id}`} pack={item} onEdit={() => setModal({ type: "edit-pack", pack: item })} compactKind="Pack" />
                ) : (
                  <FlavorRow key={`hidden-${item.id}`} flavor={item} onEdit={() => setModal({ type: "edit-flavor", flavor: item })} compactKind="Sabor" />
                ),
              )
            ) : (
              <EmptyState message="No hay registros ocultos con esa búsqueda." />
            )}
          </div>
        </section>
      ) : null}

      {modal ? <ProductModal modal={modal} adminEmail={adminEmail} onClose={() => setModal(null)} /> : null}
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

function TableHeader({ columns }: { columns: string[] }) {
  return (
    <div className="hidden grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr_0.7fr_0.7fr] gap-4 bg-slate-50 px-5 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 lg:grid">
      {columns.map((column) => (
        <div key={column} className={column === "Acción" ? "text-right" : ""}>{column}</div>
      ))}
    </div>
  );
}

function PackRow({ pack, onEdit, compactKind }: { pack: Pack; onEdit: () => void; compactKind?: string }) {
  const subscriptionPrice = Math.max(0, pack.price * (1 - Number(pack.clubDiscountPercent || 0) / 100));
  return (
    <div className="grid gap-3 px-5 py-4 text-sm lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr_0.7fr_0.7fr] lg:items-center lg:gap-4">
      <div>
        <p className="font-black text-slate-950">{pack.name}</p>
        <p className="mt-1 text-xs font-semibold text-slate-400">{compactKind || "Pack comercial"}</p>
      </div>
      <MobileLabel label="Botellas" value={`${pack.quantity} botellas`} />
      <MobileLabel label="Precio" value={money(pack.price)} />
      <MobileLabel label="Suscripción" value={`${money(subscriptionPrice)} · ${pack.clubDiscountPercent}%`} />
      <StatusPill archived={pack.isArchived} />
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onEdit} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800">
          Editar
        </button>
        <form action={toggleStatus}>
          <input type="hidden" name="id" value={pack.id} />
          <input type="hidden" name="model" value="product" />
          <input type="hidden" name="currentStatus" value={String(pack.isArchived)} />
          <button className={`rounded-full px-4 py-2 text-xs font-black transition ${pack.isArchived ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}>
            {pack.isArchived ? "Mostrar" : "Ocultar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function FlavorRow({ flavor, onEdit, compactKind }: { flavor: Flavor; onEdit: () => void; compactKind?: string }) {
  return (
    <div className="grid gap-3 px-5 py-4 text-sm lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr_0.7fr_0.7fr] lg:items-center lg:gap-4">
      <div>
        <p className="font-black text-slate-950">{flavor.name}</p>
        <p className="mt-1 text-xs font-semibold text-slate-400">{compactKind || "Botella individual"}</p>
      </div>
      <MobileLabel label="Slug" value={flavor.slug} />
      <MobileLabel label="Precio POS" value={money(flavor.price || flavor.basePrice)} />
      <MobileLabel label="Presentación" value={flavor.presentations.join(", ")} />
      <StatusPill archived={flavor.isArchived} />
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onEdit} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800">
          Editar
        </button>
        <form action={toggleStatus}>
          <input type="hidden" name="id" value={flavor.id} />
          <input type="hidden" name="model" value="flavor" />
          <input type="hidden" name="currentStatus" value={String(flavor.isArchived)} />
          <button className={`rounded-full px-4 py-2 text-xs font-black transition ${flavor.isArchived ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}>
            {flavor.isArchived ? "Mostrar" : "Ocultar"}
          </button>
        </form>
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

function StatusPill({ archived }: { archived: boolean }) {
  return (
    <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${archived ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
      {archived ? "Oculto" : "Visible"}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="px-5 py-14 text-center text-sm font-semibold text-slate-400">{message}</div>;
}

function ProductModal({ modal, adminEmail, onClose }: { modal: Exclude<ModalState, null>; adminEmail: string; onClose: () => void }) {
  const isPack = modal.type === "new-pack" || modal.type === "edit-pack";
  const isEdit = modal.type === "edit-pack" || modal.type === "edit-flavor";
  const pack = modal.type === "edit-pack" ? modal.pack : null;
  const flavor = modal.type === "edit-flavor" ? modal.flavor : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[1.8rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{isEdit ? "Edición" : "Alta"}</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {modal.type === "new-pack" ? "Nuevo pack" : modal.type === "new-flavor" ? "Nuevo sabor" : isPack ? "Editar pack" : "Editar sabor"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isPack ? "Configura precio, botellas y descuento de suscripción." : "Configura el sabor que se usa en POS, tienda, suscripciones e inventario."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950">
            <X size={18} />
          </button>
        </div>

        {isPack ? (
          <form action={isEdit ? updateCatalogProduct : createProduct} className="p-6">
            {pack ? <input type="hidden" name="productId" value={pack.id} /> : null}
            <input type="hidden" name="adminEmail" value={adminEmail} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Nombre</span>
                <input name="name" required defaultValue={pack?.name || ""} placeholder="Pack de 12" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Precio</span>
                <NoScrollNumberInput name={isEdit ? "newPrice" : "price"} required min="0" step="0.01" defaultValue={pack?.price || ""} placeholder="390" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Botellas</span>
                <NoScrollNumberInput name="quantity" required min="1" step="1" defaultValue={pack?.quantity || ""} placeholder="12" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Descuento suscripción %</span>
                <NoScrollNumberInput name="clubDiscountPercent" min="0" max="100" step="1" defaultValue={pack?.clubDiscountPercent ?? 10} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400" />
              </label>
              <input type="hidden" name="weight" value="1.5" />
              <input type="hidden" name="height" value="20" />
              <input type="hidden" name="width" value="20" />
              <input type="hidden" name="length" value="20" />
            </div>
            <ModalActions onClose={onClose} submitLabel={isEdit ? "Guardar cambios" : "Crear pack"} />
          </form>
        ) : (
          <form action={isEdit ? updateCatalogFlavor : createFlavor} className="p-6">
            {flavor ? <input type="hidden" name="flavorId" value={flavor.id} /> : null}
            <input type="hidden" name="adminEmail" value={adminEmail} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Nombre</span>
                <input name="name" required defaultValue={flavor?.name || ""} placeholder="Kombucha Mango" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Slug</span>
                <input name="slug" required defaultValue={flavor?.slug || ""} placeholder="kombucha-mango" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Precio POS</span>
                <NoScrollNumberInput name={isEdit ? "newPrice" : "price"} required min="0" step="0.01" defaultValue={flavor?.price || flavor?.basePrice || ""} placeholder="65" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400" />
              </label>
              {!isEdit ? (
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Stock inicial</span>
                  <NoScrollNumberInput name="stock" min="0" step="1" defaultValue={0} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400" />
                </label>
              ) : null}
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Presentaciones</span>
                <textarea
                  name="presentations"
                  required
                  defaultValue={presentationsToInputValue(flavor?.presentations)}
                  placeholder={"Bala\nEuro"}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
                />
                <p className="mt-2 text-xs font-semibold text-slate-400">Escribe una presentación por línea. POS pedirá elegir una al vender esta botella.</p>
              </label>
            </div>
            <ModalActions onClose={onClose} submitLabel={isEdit ? "Guardar cambios" : "Crear sabor"} />
          </form>
        )}
      </div>
    </div>
  );
}

function ModalActions({
  submitLabel,
  onClose,
}: {
  submitLabel: string;
  onClose: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
      <button type="button" onClick={onClose} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
        Cancelar
      </button>
      <button className="flex-1 rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800">
        {submitLabel}
      </button>
    </div>
  );
}
