"use client";

import { useMemo, useState } from "react";
import { createTank, updateTank } from "@/app/_actions/production";
import { getContainerStatus, getContainerStatusClasses, getContainerStatusLabel } from "@/lib/container-status";
import { useRouter } from "next/navigation";

type TankRow = {
  id: string;
  name: string;
  capacityLt?: number | null;
  isActive: boolean;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

type ProductionRow = {
  id: string;
  name: string;
  tankId?: string | null;
  status?: string;
};

type InventoryRow = {
  id: string;
  tank?: { id: string; name?: string | null } | null;
  production?: { id: string; name?: string | null } | null;
  status?: string;
};

export default function TanksCatalogManager({
  tanks,
  productions,
  baseBeverageInventory,
  publicAppUrl,
}: {
  tanks: TankRow[];
  productions: ProductionRow[];
  baseBeverageInventory: InventoryRow[];
  publicAppUrl: string;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCapacity, setCreateCapacity] = useState("");
  const [createError, setCreateError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const safeTanks = Array.isArray(tanks) ? tanks : [];
  const safeProductions = Array.isArray(productions) ? productions : [];
  const safeInventory = Array.isArray(baseBeverageInventory) ? baseBeverageInventory : [];

  const totalActive = useMemo(() => safeTanks.filter((tank) => tank.isActive).length, [safeTanks]);

  const startEdit = (tank: TankRow) => {
    setEditingId(tank.id);
    setEditName(tank.name || "");
    setEditCapacity(tank.capacityLt != null ? String(tank.capacityLt) : "");
    setEditActive(Boolean(tank.isActive));
  };

  const handleCreate = async () => {
    if (!createName.trim()) {
      setCreateError("Escribe el nombre de la cubeta");
      return;
    }

    setCreating(true);
    setCreateError("");

    const formData = new FormData();
    formData.set("name", createName.trim());
    if (createCapacity.trim()) {
      formData.set("capacityLt", createCapacity.trim());
    }

    const result = await createTank(formData);
    setCreating(false);

    if (result?.error) {
      setCreateError(result.error);
      return;
    }

    setCreateName("");
    setCreateCapacity("");
    setShowCreate(false);
    router.refresh();
  };

  const handleSave = async (tank: TankRow) => {
    if (!editName.trim()) return;

    setSavingId(tank.id);
    const formData = new FormData();
    formData.set("id", tank.id);
    formData.set("name", editName.trim());
    if (editCapacity.trim()) {
      formData.set("capacityLt", editCapacity.trim());
    }
    formData.set("isActive", String(editActive));

    const result = await updateTank(formData);
    setSavingId(null);
    if (result?.error) {
      setCreateError(result.error);
      return;
    }

    setEditingId(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Catálogo</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Tanques de resguardo</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Aquí administras las cubetas que se usan en fermentados. Desde esta vista puedes crear, editar, activar o desactivar cada una.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60">Total cubetas</p>
              <p className="mt-2 text-3xl font-black">{safeTanks.length}</p>
            </div>
            <div className="rounded-2xl bg-emerald-100 px-4 py-3 text-emerald-900">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600">Activas</p>
              <p className="mt-2 text-3xl font-black">{totalActive}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate((current) => !current)}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
            >
              {showCreate ? "Ocultar alta" : "Nuevo tanque de resguardo"}
            </button>
          </div>
        </div>

        {showCreate && (
          <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.2fr_0.8fr_auto]">
            <input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="Nombre del tanque de resguardo"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.1"
              value={createCapacity}
              onChange={(event) => setCreateCapacity(event.target.value)}
              placeholder="Capacidad Lt"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300"
            >
              {creating ? "Guardando..." : "Crear tanque de resguardo"}
            </button>
          </div>
        )}

        {createError && <p className="mt-3 text-sm font-semibold text-rose-600">{createError}</p>}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {safeTanks.length === 0 ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Aún no hay cubetas registradas.
          </div>
        ) : (
          safeTanks.map((tank) => {
            const activeProd = safeProductions.find((production) => production.tankId === tank.id && production.status === "IN_PROGRESS");
            const heldInventory = safeInventory.find(
              (row) => row.tank?.id === tank.id && ["HELD", "AVAILABLE", "MIX_PENDING", "DISPATCHED"].includes(String(row.status)),
            );
            const status = getContainerStatus(tank, activeProd || heldInventory);
            const isEditing = editingId === tank.id;

            return (
              <article key={tank.id} className={`rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm ${!tank.isActive ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-slate-950">{tank.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Capacidad: {tank.capacityLt != null ? Number(tank.capacityLt).toLocaleString("es-MX") : "-"} Lt
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${getContainerStatusClasses(status)}`}>
                    {getContainerStatusLabel(status)}
                  </span>
                </div>

                {isEditing ? (
                  <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={editCapacity}
                      onChange={(event) => setEditCapacity(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    />
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input type="checkbox" checked={editActive} onChange={(event) => setEditActive(event.target.checked)} />
                      Activa
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSave(tank)}
                        disabled={savingId === tank.id}
                        className="flex-1 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:bg-slate-300"
                      >
                        {savingId === tank.id ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(tank)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const formData = new FormData();
                          formData.set("id", tank.id);
                          formData.set("name", tank.name);
                          formData.set("capacityLt", tank.capacityLt != null ? String(tank.capacityLt) : "");
                          formData.set("isActive", String(!tank.isActive));
                          setSavingId(tank.id);
                          await updateTank(formData);
                          setSavingId(null);
                          router.refresh();
                        }}
                        disabled={savingId === tank.id}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {tank.isActive ? "Desactivar" : "Activar"}
                      </button>
                      <a
                        href={`/cubeta/${tank.id}/etiqueta`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                      >
                        Imprimir QR
                      </a>
                    </div>

                    <p className="mt-4 text-sm text-slate-600">
                      {activeProd ? `Proceso activo: ${activeProd.name}` : tank.isActive ? "Lista para usarse" : "Fuera de operación"}
                    </p>

                    {publicAppUrl && (
                      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">QR de cubeta</p>
                          <p className="mt-2 truncate text-xs text-slate-500">{publicAppUrl}/cubeta/{tank.id}</p>
                        </div>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`${publicAppUrl}/cubeta/${tank.id}`)}`}
                          alt={`QR de ${tank.name}`}
                          className="h-20 w-20 rounded-xl border border-white bg-white"
                        />
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
