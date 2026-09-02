"use client";

import { useMemo, useState } from "react";
import {
  createBaseBeverageStorageTank,
  emptyBaseBeverageContainer,
  unifyBaseBeverageInventoryLots,
  updateBaseBeverageInventoryDisposition,
} from "@/app/_actions/production";

type InventoryRow = {
  id: string;
  productType: string;
  status: string;
  litersEntered?: number | null;
  litersProduced: number;
  litersRemaining?: number | null;
  notes?: string | null;
  tank_name?: string | null;
  production_name?: string | null;
  productionFormulaId?: string | null;
  formula_code?: string | null;
  formula_name?: string | null;
};

type StorageEntry = {
  id: string;
  storageTankId: string;
  litersAdded: number;
  litersRemaining?: number | null;
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
  currentLiters: number;
  sourceCount: number;
  entries: StorageEntry[];
};

export function BaseBeverageInventoryManager({
  rows,
  storageTanks,
}: {
  rows: InventoryRow[];
  storageTanks: StorageTank[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedTankId, setSelectedTankId] = useState(storageTanks[0]?.id || "");
  const [creating, setCreating] = useState(false);
  const [tankName, setTankName] = useState("");
  const [tankCapacity, setTankCapacity] = useState("");
  const [tankNotes, setTankNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [exitRow, setExitRow] = useState<InventoryRow | null>(null);
  const [exitBrix, setExitBrix] = useState("");
  const [exitTemperature, setExitTemperature] = useState("");
  const [exitPh, setExitPh] = useState("");
  const [exitAcidity, setExitAcidity] = useState("");
  const [exitError, setExitError] = useState("");

  const selectableRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          Number(row.litersRemaining || 0) > 0 &&
          ["HELD", "AVAILABLE", "MIX_PENDING", "DISPATCHED"].includes(String(row.status)),
      ),
    [rows],
  );

  const handleToggleSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const handleCreateTank = async () => {
    if (!tankName.trim()) {
      window.alert("Escribe el nombre del tanque de resguardo");
      return;
    }

    setBusy("create-tank");
    const result = await createBaseBeverageStorageTank({
      name: tankName.trim(),
      capacityLt: tankCapacity.trim() ? Number(tankCapacity) : null,
      notes: tankNotes.trim() || undefined,
    });
    setBusy(null);

    if (!result.success) {
      window.alert(result.error || "No se pudo crear el tanque");
      return;
    }

    window.location.reload();
  };

  const handleUnify = async () => {
    if (!selectedTankId) {
      window.alert("Selecciona un tanque de resguardo");
      return;
    }
    if (selectedIds.length === 0) {
      window.alert("Selecciona al menos un lote para unificar");
      return;
    }

    setBusy("unify");
    const result = await unifyBaseBeverageInventoryLots({
      storageTankId: selectedTankId,
      inventoryIds: selectedIds,
    });
    setBusy(null);

    if (!result.success) {
      window.alert(result.error || "No se pudieron unificar los lotes");
      return;
    }

    window.location.reload();
  };

  const dispatchAction = async (action: () => Promise<{ success: boolean; error?: string }>) => {
    setBusy("row-action");
    const result = await action();
    setBusy(null);
    if (!result.success) {
      window.alert(result.error || "No se pudo completar la acción");
      return;
    }
    window.location.reload();
  };

  const openExitModal = (row: InventoryRow) => {
    setExitRow(row);
    setExitBrix("");
    setExitTemperature("");
    setExitPh("");
    setExitAcidity("");
    setExitError("");
  };

  const handleExit = async () => {
    if (!exitRow) return;
    const values = [exitBrix, exitTemperature, exitPh, exitAcidity];
    if (values.some((value) => !value.trim() || !Number.isFinite(Number(value)))) {
      setExitError("Completa Brix, temperatura, pH y acidez con valores válidos");
      return;
    }

    setBusy("exit");
    const result = await updateBaseBeverageInventoryDisposition(exitRow.id, "DISPATCHED", {
      brix: Number(exitBrix),
      temperature: Number(exitTemperature),
      ph: Number(exitPh),
      acidity: Number(exitAcidity),
    });
    setBusy(null);

    if (!result.success) {
      setExitError(result.error || "No se pudo registrar la salida");
      return;
    }

    setExitRow(null);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Unificación</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Tanques de resguardo</h2>
            <p className="mt-2 text-sm text-slate-500">
              Aquí unificamos varios procesos terminados de la misma fórmula dentro de un mismo tanque, conservando la trazabilidad de origen.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={selectedTankId}
              onChange={(event) => setSelectedTankId(event.target.value)}
              className="min-w-[220px] rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
            >
              <option value="">Selecciona tanque de resguardo</option>
              {storageTanks.map((tank) => (
                <option key={tank.id} value={tank.id}>
                  {tank.name}
                  {tank.formulaCode ? ` · ${tank.formulaCode}` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleUnify}
              disabled={busy === "unify"}
              className="rounded-full bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-500 disabled:bg-slate-300"
            >
              {busy === "unify" ? "Unificando..." : "Unificar seleccionados"}
            </button>
            <button
              type="button"
              onClick={() => setCreating((current) => !current)}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              {creating ? "Ocultar" : "Nuevo tanque de resguardo"}
            </button>
          </div>
        </div>

        {creating && (
          <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
            <input
              value={tankName}
              onChange={(event) => setTankName(event.target.value)}
              placeholder="Nombre del tanque de resguardo"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.1"
              value={tankCapacity}
              onChange={(event) => setTankCapacity(event.target.value)}
              placeholder="Capacidad Lt"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
            <input
              value={tankNotes}
              onChange={(event) => setTankNotes(event.target.value)}
              placeholder="Notas"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={handleCreateTank}
              disabled={busy === "create-tank"}
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300"
            >
              {busy === "create-tank" ? "Guardando..." : "Crear tanque de resguardo"}
            </button>
          </div>
        )}

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {storageTanks.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
              Aún no hay tanques de resguardo creados.
            </div>
          ) : (
            storageTanks.map((tank) => (
              <article key={tank.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-slate-950">{tank.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {tank.formulaName || "Sin fórmula asignada"}
                      {tank.formulaCode ? ` · ${tank.formulaCode}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-950">{tank.currentLiters.toLocaleString("es-MX")} Lt</p>
                    <p className="text-xs text-slate-500">
                      {tank.sourceCount} proceso{tank.sourceCount === 1 ? "" : "s"} origen
                      {tank.capacityLt != null ? ` · Capacidad ${tank.capacityLt.toLocaleString("es-MX")} Lt` : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {tank.entries.length === 0 ? (
                    <p className="text-sm text-slate-400">Sin entradas aún.</p>
                  ) : (
                    tank.entries.map((entry) => (
                      <div key={entry.id} className="rounded-xl bg-white px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-900">{entry.production_name || "Proceso sin referencia"}</p>
                            <p className="text-xs text-slate-500">
                              {entry.formula_name || "Sin fórmula"} {entry.formula_code ? `· ${entry.formula_code}` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-slate-950">{Number(entry.litersRemaining ?? entry.litersAdded).toLocaleString("es-MX")} Lt</p>
                            <p className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString("es-MX")}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Lotes de bebida base</h2>
        <p className="mt-2 text-sm text-slate-500">
          Selecciona los lotes con remanente para enviarlos a un tanque de resguardo. La cubeta origen queda libre porque el remanente se mueve al tanque unificado.
        </p>

        <div className="mt-5 space-y-4">
          {rows.map((row) => {
            const remaining = row.litersRemaining != null ? Number(row.litersRemaining) : null;
            const entered = row.litersEntered != null ? Number(row.litersEntered) : null;
            const loss = entered != null ? Math.max(entered - Number(row.litersProduced || 0), 0) : null;
            const selectable = selectableRows.some((entry) => entry.id === row.id);

            return (
              <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => handleToggleSelection(row.id)}
                      disabled={!selectable}
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                    />
                    <div>
                      <p className="text-lg font-black text-slate-950">{row.production_name || "Lote sin referencia"}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Fórmula: {row.formula_name || row.formula_code || row.productType} · Cubeta origen: {row.tank_name || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">
                      {row.status === "UNIFIED" ? "En tanque de resguardo" : row.status}
                    </span>
                    {remaining != null && remaining > 0 && row.status !== "MIX_PENDING" && row.status !== "EMPTIED" && row.status !== "UNIFIED" && (
                      <button
                        type="button"
                        onClick={() => dispatchAction(() => updateBaseBeverageInventoryDisposition(row.id, "MIX_PENDING"))}
                        className="rounded-full bg-violet-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-violet-500"
                      >
                        Marcar para unificar
                      </button>
                    )}
                    {remaining != null && remaining > 0 && row.status !== "AVAILABLE" && row.status !== "EMPTIED" && row.status !== "UNIFIED" && (
                      <button
                        type="button"
                        onClick={() => dispatchAction(() => updateBaseBeverageInventoryDisposition(row.id, "AVAILABLE"))}
                        className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-emerald-500"
                      >
                        Mantener disponible
                      </button>
                    )}
                    {remaining != null && remaining > 0 && row.status !== "DISPATCHED" && row.status !== "EMPTIED" && row.status !== "UNIFIED" && (
                      <button
                        type="button"
                        onClick={() => openExitModal(row)}
                        className="rounded-full bg-sky-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-sky-500"
                      >
                        Marcar con salida
                      </button>
                    )}
                    {["HELD", "MIX_PENDING", "DISPATCHED", "AVAILABLE"].includes(String(row.status)) && (
                      <button
                        type="button"
                        onClick={() => dispatchAction(() => emptyBaseBeverageContainer(row.id))}
                        className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-slate-800"
                      >
                        Vaciar cubeta
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <StatBox label="Entrada" value={entered} />
                  <StatBox label="Salida" value={Number(row.litersProduced || 0)} />
                  <StatBox label="Remanente" value={remaining} />
                  <StatBox label="Diferencia" value={loss} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {exitRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-600">Salida de inventario</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">Registrar última lectura</h2>
                <p className="mt-2 text-sm text-slate-500">{exitRow.production_name || "Lote sin referencia"}</p>
              </div>
              <button type="button" onClick={() => setExitRow(null)} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-bold text-slate-500">Cerrar</button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <ExitField label="Brix" value={exitBrix} onChange={setExitBrix} />
              <ExitField label="Temperatura °C" value={exitTemperature} onChange={setExitTemperature} />
              <ExitField label="pH" value={exitPh} onChange={setExitPh} />
              <ExitField label="Acidez" value={exitAcidity} onChange={setExitAcidity} />
            </div>
            <p className="mt-4 text-xs text-slate-500">Estas lecturas quedarán asociadas al lote como su medición de salida.</p>
            {exitError && <p className="mt-4 text-sm font-semibold text-rose-600">{exitError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setExitRow(null)} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600">Cancelar</button>
              <button type="button" onClick={handleExit} disabled={busy === "exit"} className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white hover:bg-sky-500 disabled:bg-slate-300">
                {busy === "exit" ? "Guardando..." : "Confirmar salida"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExitField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input type="number" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal text-slate-950 outline-none focus:border-sky-500" />
    </label>
  );
}

function StatBox({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{value != null ? `${value.toLocaleString("es-MX")} Lt` : "-"}</p>
    </div>
  );
}
