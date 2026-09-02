"use client";

import { useState } from "react";
import { createBaseBeverageStorageTank, updateBaseBeverageStorageTank } from "@/app/_actions/production";

type StorageEntry = {
  id: string;
  storageTankId: string;
  litersAdded: number;
  notes?: string | null;
  createdAt: string;
  production_name?: string | null;
  formula_name?: string | null;
  formula_code?: string | null;
};

type StorageTank = {
  id: string;
  name: string;
  formulaCode?: string | null;
  formulaName?: string | null;
  capacityLt?: number | null;
  isActive?: boolean;
  notes?: string | null;
  currentLiters: number;
  sourceCount: number;
  entries: StorageEntry[];
  createdAt?: string | Date | null;
};

export default function BaseBeverageStorageTanksManager({ storageTanks }: { storageTanks: StorageTank[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [capacityLt, setCapacityLt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCapacityLt, setEditCapacityLt] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const totalLiters = storageTanks.reduce((sum, tank) => sum + Number(tank.currentLiters || 0), 0);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Escribe el nombre del tanque de resguardo");
      return;
    }

    setCreating(true);
    setError("");

    const result = await createBaseBeverageStorageTank({
      name: name.trim(),
      capacityLt: capacityLt.trim() ? Number(capacityLt) : null,
      notes: notes.trim() || undefined,
    });

    setCreating(false);

    if (!result.success) {
      setError(result.error || "No se pudo crear el tanque de resguardo");
      return;
    }

    setName("");
    setCapacityLt("");
    setNotes("");
    setShowCreate(false);
    window.location.reload();
  };

  const startEdit = (tank: StorageTank) => {
    setEditingId(tank.id);
    setEditName(tank.name || "");
    setEditCapacityLt(tank.capacityLt != null ? String(tank.capacityLt) : "");
    setEditNotes(tank.notes || "");
    setEditActive(tank.isActive ?? true);
  };

  const handleSave = async (tank: StorageTank) => {
    if (!editName.trim()) {
      setError("Escribe el nombre del tanque de resguardo");
      return;
    }

    setSavingId(tank.id);
    setError("");
    const result = await updateBaseBeverageStorageTank({
      id: tank.id,
      name: editName.trim(),
      capacityLt: editCapacityLt.trim() ? Number(editCapacityLt) : null,
      notes: editNotes.trim() || undefined,
      isActive: editActive,
    });
    setSavingId(null);

    if (!result.success) {
      setError(result.error || "No se pudo actualizar el tanque de resguardo");
      return;
    }

    setEditingId(null);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Catálogo</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Tanques de resguardo</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Aquí administras los tanques donde se guarda y unifica la bebida base terminada.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60">Tanques</p>
              <p className="mt-2 text-3xl font-black">{storageTanks.length}</p>
            </div>
            <div className="rounded-2xl bg-emerald-100 px-4 py-3 text-emerald-900">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600">Litros</p>
              <p className="mt-2 text-3xl font-black">{totalLiters.toLocaleString("es-MX")}</p>
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
          <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre del tanque de resguardo"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.1"
              value={capacityLt}
              onChange={(event) => setCapacityLt(event.target.value)}
              placeholder="Capacidad Lt"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notas"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300"
            >
              {creating ? "Guardando..." : "Crear tanque"}
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {storageTanks.length === 0 ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Aún no hay tanques de resguardo registrados.
          </div>
        ) : (
          storageTanks.map((tank) => (
            <article key={tank.id} className={`rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm ${!tank.isActive ? "opacity-70" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-slate-950">{tank.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {tank.formulaName || "Sin fórmula asignada"}
                    {tank.formulaCode ? ` · ${tank.formulaCode}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-950">{Number(tank.currentLiters || 0).toLocaleString("es-MX")} Lt</p>
                  <p className="text-xs text-slate-500">
                    {tank.sourceCount} proceso{tank.sourceCount === 1 ? "" : "s"} origen
                    {tank.capacityLt != null ? ` · Capacidad ${Number(tank.capacityLt).toLocaleString("es-MX")} Lt` : ""}
                  </p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {tank.isActive === false ? "Inactivo" : "Activo"}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                {tank.notes || "Sin notas"}
              </p>

              {editingId === tank.id ? (
                <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    placeholder="Nombre del tanque de resguardo"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={editCapacityLt}
                    onChange={(event) => setEditCapacityLt(event.target.value)}
                    placeholder="Capacidad Lt"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                  <input
                    value={editNotes}
                    onChange={(event) => setEditNotes(event.target.value)}
                    placeholder="Notas"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(event) => setEditActive(event.target.checked)}
                    />
                    Activo
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
              ) : null}

              <div className="mt-4 space-y-2">
                {tank.entries.length === 0 ? (
                  <p className="text-sm text-slate-400">Sin entradas aún.</p>
                ) : (
                  tank.entries.map((entry) => (
                    <div key={entry.id} className="rounded-xl bg-slate-50 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{entry.production_name || "Proceso sin referencia"}</p>
                          <p className="text-xs text-slate-500">
                            {entry.formula_name || "Sin fórmula"} {entry.formula_code ? `· ${entry.formula_code}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-950">{entry.litersAdded.toLocaleString("es-MX")} Lt</p>
                          <p className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString("es-MX")}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

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
                    setSavingId(tank.id);
                    const result = await updateBaseBeverageStorageTank({
                      id: tank.id,
                      name: tank.name,
                      capacityLt: tank.capacityLt ?? null,
                      notes: tank.notes || undefined,
                      isActive: !(tank.isActive ?? true),
                    });
                    setSavingId(null);
                    if (!result.success) {
                      setError(result.error || "No se pudo actualizar el tanque de resguardo");
                      return;
                    }
                    window.location.reload();
                  }}
                  disabled={savingId === tank.id}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {tank.isActive === false ? "Activar" : "Desactivar"}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
