"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { allocateBaseBeverageInventoryToStorageTanks } from "@/app/_actions/production";

type InventoryRow = {
  id: string;
  status: string;
  productType?: string | null;
  litersEntered?: number | null;
  litersProduced: number;
  litersRemaining?: number | null;
  notes?: string | null;
  createdAt?: string | Date;
  tank?: { id: string; name: string } | null;
  production?: {
    id: string;
    name: string;
    formulaCode?: string | null;
    formulaName?: string | null;
    productionFormulaId?: string | null;
    formulaDurationDays?: number | null;
    formulaDurationHours?: number | null;
    phases?: Array<{
      id: string;
      phase: number;
      measuredAt: string | Date;
      receivedCondition?: string | null;
      receivedBy?: string | null;
      measuredBy?: string | null;
      startedBy?: string | null;
      ph?: number | null;
      brix?: number | null;
      temperature?: number | null;
      acidity?: number | null;
      notes?: string | null;
      receivedLiters?: number | null;
      remainingLiters?: number | null;
    }>;
    parameters?: Array<{
      id: string;
      measuredAt: string | Date;
      ph?: number | null;
      brix?: number | null;
      temperature?: number | null;
      acidity?: number | null;
      notes?: string | null;
    }>;
    storageEntries?: Array<{
      id: string;
      storageTankId: string;
      litersAdded: number;
      litersRemaining?: number | null;
      createdAt: string | Date;
      notes?: string | null;
      storageTank?: { id: string; name: string } | null;
      productionFormulaId?: string | null;
    }>;
  } | null;
  tank_id_ref?: string | null;
  tank_name?: string | null;
  production_id_ref?: string | null;
  production_name?: string | null;
  formula_code?: string | null;
  formula_name?: string | null;
};

type StorageTank = {
  id: string;
  name: string;
  formulaCode?: string | null;
  formulaName?: string | null;
  capacityLt?: number | null;
  currentLiters?: number;
  isActive?: boolean;
};

function fmtDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formulaKey(row: InventoryRow) {
  return String(row.production?.formulaName || row.formula_name || row.production?.formulaCode || row.formula_code || row.productType || "Sin fórmula").toLowerCase();
}

function formulaLabel(row: InventoryRow) {
  return String(row.production?.formulaName || row.formula_name || row.production?.formulaCode || row.formula_code || row.productType || "Sin fórmula");
}

function displayFormulaLabel(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("acid")) return "Acidificante";
  if (normalized.includes("scooby")) return "Scooby";
  if (normalized.includes("sabor")) return "Saborizante";
  return label;
}

function getRowExistenceLiters(row: InventoryRow) {
  const storageEntries = Array.isArray(row.production?.storageEntries) ? row.production?.storageEntries || [] : [];
  const storageLiters = storageEntries.reduce((sum, entry) => sum + Number((entry.litersRemaining ?? entry.litersAdded) || 0), 0);
  const lotLiters = Number(row.litersRemaining || 0);
  return storageLiters > 0 ? storageLiters : lotLiters;
}

function statusLabel(status: string) {
  if (status === "COMPLETED") return "Completado";
  if (status === "IN_PROGRESS") return "En proceso";
  if (status === "CANCELLED") return "Cancelado";
  if (status === "UNIFIED") return "En resguardo";
  if (status === "MIX_PENDING") return "Pendiente de unificar";
  if (status === "DISPATCHED") return "Con salida";
  if (status === "AVAILABLE") return "Disponible";
  if (status === "HELD") return "Retenido";
  return status;
}

export function BaseBeverageInventoryBoard({
  rows,
  storageTanks = [],
}: {
  rows: InventoryRow[];
  storageTanks?: StorageTank[];
}) {
  const filteredRows = useMemo(() => {
    const safeRows = Array.isArray(rows) ? rows : [];
    return safeRows
      .filter((row) => {
        const storageEntries = Array.isArray(row.production?.storageEntries) ? row.production?.storageEntries || [] : [];
        const storageLiters = storageEntries.reduce((sum, entry) => sum + Number((entry.litersRemaining ?? entry.litersAdded) || 0), 0);
        return Number(row.litersRemaining ?? 0) > 0 || storageLiters > 0 || ["UNIFIED", "MIX_PENDING", "DISPATCHED", "HELD"].includes(String(row.status));
      })
      .sort((a, b) => {
        const aKey = formulaLabel(a).localeCompare(formulaLabel(b), "es-MX", { sensitivity: "base" });
        if (aKey !== 0) return aKey;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [rows]);

  const tabs = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number; liters: number }>();

    filteredRows.forEach((row) => {
      const key = formulaKey(row);
      const label = formulaLabel(row);
      const current = map.get(key);
      const liters = getRowExistenceLiters(row);
      map.set(key, {
        key,
        label,
        count: (current?.count || 0) + 1,
        liters: (current?.liters || 0) + liters,
      });
    });

    const preferred = ["acid", "sabor", "scooby"];
    return Array.from(map.values()).sort((a, b) => {
      const aIndex = preferred.findIndex((part) => a.label.toLowerCase().includes(part));
      const bIndex = preferred.findIndex((part) => b.label.toLowerCase().includes(part));
      if (aIndex !== -1 || bIndex !== -1) {
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        if (aIndex !== bIndex) return aIndex - bIndex;
      }
      return a.label.localeCompare(b.label, "es-MX", { sensitivity: "base" });
    });
  }, [filteredRows]);

  const [selectedTab, setSelectedTab] = useState("");
  const [selectedRow, setSelectedRow] = useState<InventoryRow | null>(null);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocationError, setAllocationError] = useState("");
  const [allocationSaving, setAllocationSaving] = useState(false);
  const [allocationRows, setAllocationRows] = useState<Array<{ storageTankId: string; liters: string }>>([]);

  const effectiveSelectedTab = selectedTab && tabs.some((tab) => tab.key === selectedTab) ? selectedTab : tabs[0]?.key || "";

  const visibleRows = useMemo(() => {
    if (!effectiveSelectedTab) return filteredRows;
    return filteredRows.filter((row) => formulaKey(row) === effectiveSelectedTab);
  }, [filteredRows, effectiveSelectedTab]);

  const totalLiters = visibleRows.reduce((sum, row) => sum + getRowExistenceLiters(row), 0);

  const selectedRemainingLiters = Number(selectedRow?.litersRemaining || 0);
  const selectedStorageEntries = Array.isArray(selectedRow?.production?.storageEntries) ? selectedRow?.production?.storageEntries || [] : [];
  const selectedStorageLiters = selectedStorageEntries.reduce((sum, entry) => sum + Number((entry.litersRemaining ?? entry.litersAdded) || 0), 0);
  const selectedExistenceLiters = selectedStorageLiters > 0 ? selectedStorageLiters : selectedRemainingLiters;
  const allocationTotal = allocationRows.reduce((sum, row) => sum + Number(row.liters || 0), 0);
  const allocationRemaining = Math.max(selectedRemainingLiters - allocationTotal, 0);

  const openAllocateModal = () => {
    if (!selectedRow) return;
    const firstActiveTank = storageTanks.find((tank) => tank.isActive !== false) || storageTanks[0] || null;
    setAllocationRows([
      {
        storageTankId: firstActiveTank?.id || "",
        liters: selectedRemainingLiters > 0 ? String(selectedRemainingLiters) : "",
      },
    ]);
    setAllocationError("");
    setShowAllocateModal(true);
  };

  const addAllocationRow = () => {
    setAllocationRows((current) => [...current, { storageTankId: "", liters: "" }]);
  };

  const updateAllocationRow = (index: number, patch: Partial<{ storageTankId: string; liters: string }>) => {
    setAllocationRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const removeAllocationRow = (index: number) => {
    setAllocationRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const submitAllocation = async () => {
    if (!selectedRow) return;

    const payload = allocationRows
      .map((row) => ({ storageTankId: row.storageTankId, liters: Number(row.liters || 0) }))
      .filter((row) => row.storageTankId && row.liters > 0);

    const total = payload.reduce((sum, row) => sum + row.liters, 0);
    if (payload.length === 0) {
      setAllocationError("Selecciona al menos un tanque con litros a mover.");
      return;
    }
    if (total > selectedRemainingLiters) {
      setAllocationError(`No puedes mover más de ${selectedRemainingLiters.toLocaleString("es-MX")} Lt.`);
      return;
    }

    setAllocationSaving(true);
    setAllocationError("");
    const result = await allocateBaseBeverageInventoryToStorageTanks({
      inventoryId: selectedRow.id,
      allocations: payload,
    });
    setAllocationSaving(false);

    if (!result.success) {
      setAllocationError(result.error || "No se pudo asignar el lote a los tanques");
      return;
    }

    setShowAllocateModal(false);
    setSelectedRow(null);
    window.location.reload();
  };

  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Inventario</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Lotes de bebida base</h2>
          <p className="mt-2 text-sm text-slate-500">
            Vista resumida por fórmula. Haz clic en un lote para ver su detalle de producción, lecturas y fases.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60">Litros visibles</p>
          <p className="mt-1 text-xl font-black">{totalLiters.toLocaleString("es-MX")} Lt</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = effectiveSelectedTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedTab(tab.key)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                active ? "border-slate-950 bg-slate-950 text-white shadow-lg" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
              }`}
            >
              <p className="text-sm font-black">{displayFormulaLabel(tab.label)}</p>
              <p className={`mt-1 text-xs ${active ? "text-white/70" : "text-slate-500"}`}>
                {tab.count} lote{tab.count === 1 ? "" : "s"} · {tab.liters.toLocaleString("es-MX")} Lt
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Fecha inicio</th>
                <th className="px-4 py-3">Fin aproximada</th>
                <th className="px-4 py-3">Existencia</th>
                <th className="px-4 py-3">Tanque(s)</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No hay lotes para esta fórmula.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const phases = Array.isArray(row.production?.phases) ? row.production?.phases || [] : [];
                  const visiblePhases = phases.filter((phase) => Number(phase.phase) !== 3);
                  const phase2 = visiblePhases.find((phase) => Number(phase.phase) === 2) || null;
                  const formulaDurationHours = Number(row.production?.formulaDurationDays || 0) * 24 + Number(row.production?.formulaDurationHours || 0);
                  const phase2Date = phase2?.measuredAt ? new Date(phase2.measuredAt) : null;
                  const readyAt = phase2Date && formulaDurationHours > 0 ? new Date(phase2Date.getTime() + formulaDurationHours * 60 * 60 * 1000) : null;
                  const storageEntries = Array.isArray(row.production?.storageEntries) ? row.production?.storageEntries || [] : [];
                  const storageLiters = storageEntries.reduce((sum, entry) => sum + Number((entry.litersRemaining ?? entry.litersAdded) || 0), 0);
                  const displayedExistence = Number(row.litersRemaining || 0) > 0 ? Number(row.litersRemaining || 0) : storageLiters;
                  const storageTankNames = Array.from(
                    new Set(
                      storageEntries
                        .map((entry) => entry.storageTank?.name || "")
                        .filter(Boolean),
                    ),
                  );

                  return (
                    <tr
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedRow(row)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedRow(row);
                        }
                      }}
                      className="cursor-pointer transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-black text-slate-950">{row.production?.name || row.production_name || "Lote sin nombre"}</p>
                        <p className="mt-1 text-xs text-slate-500">{displayFormulaLabel(formulaLabel(row))}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{fmtDate(row.createdAt)}</td>
                      <td className="px-4 py-4 text-slate-700">{readyAt ? fmtDate(readyAt) : "-"}</td>
                      <td className="px-4 py-4 font-bold text-slate-950">
                        {displayedExistence.toLocaleString("es-MX")} Lt
                        <p className="mt-1 text-[10px] font-semibold text-slate-400">
                          {Number(row.litersRemaining || 0) > 0
                            ? row.tank?.name
                              ? `Disponible en ${row.tank.name}`
                              : "Disponible sin tanque"
                            : storageLiters > 0
                              ? "Resguardado en tanque(s)"
                              : "Sin existencia"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        {storageTankNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {storageTankNames.map((name) => (
                              <span key={name} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">
                            {row.tank?.name ? `Cubeta ${row.tank.name}` : "Sin tanque"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">
                          {statusLabel(row.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[1.8rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Detalle del lote</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">{selectedRow.production?.name || selectedRow.production_name || "Lote"}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {displayFormulaLabel(formulaLabel(selectedRow))} · {selectedRow.tank?.name || "Sin cubeta"}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedRow(null)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-3 md:grid-cols-4">
                <InfoCard label="Lote" value={selectedRow.production?.name || selectedRow.production_name || "-"} />
                <InfoCard label="Inicio" value={fmtDate(selectedRow.createdAt)} />
                <InfoCard
                  label="Existencia en tanques"
                  value={`${selectedExistenceLiters.toLocaleString("es-MX")} Lt`}
                />
                <InfoCard label="Estado" value={statusLabel(selectedRow.status)} />
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <InfoCard label="Cubeta origen" value={selectedRow.tank?.name || "-"} />
                <InfoCard label="Litros producidos" value={`${Number(selectedRow.litersProduced || 0).toLocaleString("es-MX")} Lt`} />
                <InfoCard label="Litros iniciales" value={selectedRow.litersEntered != null ? `${Number(selectedRow.litersEntered).toLocaleString("es-MX")} Lt` : "-"} />
                <InfoCard
                  label="Remanente sin resguardo"
                  value={`${Math.max(selectedRemainingLiters, 0).toLocaleString("es-MX")} Lt`}
                />
                <InfoCard label="Notas" value={selectedRow.notes || "-"} />
              </div>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                <p className="text-sm font-black text-slate-950">Tanques de resguardo</p>
                <p className="text-xs text-slate-500">
                  {selectedStorageEntries.length > 0
                        ? "Aquí ves en qué tanques está resguardada la existencia real de este lote."
                        : "Este lote todavía no tiene movimientos hacia tanques de resguardo."}
                </p>
              </div>
                  {selectedRemainingLiters > 0 && (
                    <button
                      type="button"
                      onClick={openAllocateModal}
                      className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white hover:bg-slate-800"
                    >
                      Asignar a tanques
                    </button>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {selectedStorageEntries.length > 0 ? (
                    selectedStorageEntries.map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-900">{entry.storageTank?.name || "Tanque de resguardo"}</p>
                            <p className="text-xs text-slate-500">{entry.notes || "Sin notas"}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-slate-950">{Number((entry.litersRemaining ?? entry.litersAdded) || 0).toLocaleString("es-MX")} Lt</p>
                            <p className="text-xs text-slate-400">{fmtDate(entry.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm italic text-slate-500">Sin tanques asignados todavía.</p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-950">Fases y parámetros</p>
                <div className="mt-4 space-y-3">
                  {(selectedRow.production?.phases || [])
                    .filter((phase) => Number(phase.phase) !== 3)
                    .map((phase) => (
                      <div key={phase.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-950">Fase {phase.phase}</p>
                            <p className="text-xs text-slate-500">{fmtDate(phase.measuredAt)}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">
                            {phase.phase === 2 ? "Inicio de fermentación" : "Registro"}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <MiniStat label="pH" value={phase.ph != null ? String(phase.ph) : "-"} />
                          <MiniStat label="Brix" value={phase.brix != null ? String(phase.brix) : "-"} />
                          <MiniStat label="Temp" value={phase.temperature != null ? String(phase.temperature) : "-"} />
                          <MiniStat label="Acidez" value={phase.acidity != null ? String(phase.acidity) : "-"} />
                        </div>
                      </div>
                    ))}
                  {(selectedRow.production?.phases || []).filter((phase) => Number(phase.phase) !== 3).length === 0 && (
                    <p className="text-sm italic text-slate-500">No hay fases registradas para este lote.</p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-950">Lecturas registradas</p>
                <div className="mt-4 space-y-3">
                  {(selectedRow.production?.parameters || []).length > 0 ? (
                    [...(selectedRow.production?.parameters || [])]
                      .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
                      .map((parameter) => (
                        <div key={parameter.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-black text-slate-950">{fmtDate(parameter.measuredAt)}</p>
                            <span className="text-xs text-slate-500">{parameter.notes || "Sin notas"}</span>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-4 text-sm text-slate-600">
                            <span>pH: {parameter.ph != null ? Number(parameter.ph) : "-"}</span>
                            <span>Brix: {parameter.brix != null ? Number(parameter.brix) : "-"}</span>
                            <span>Temp: {parameter.temperature != null ? Number(parameter.temperature) : "-"}</span>
                            <span>Acidez: {parameter.acidity != null ? Number(parameter.acidity) : "-"}</span>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-sm italic text-slate-500">No hay lecturas registradas.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {selectedRow && showAllocateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[1.8rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Asignación</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">Mover a tanques de resguardo</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Reparte {selectedRemainingLiters.toLocaleString("es-MX")} Lt disponibles entre uno o varios tanques. La capacidad nunca puede rebasarse.
                </p>
              </div>
              <button type="button" onClick={() => setShowAllocateModal(false)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-3 md:grid-cols-3">
                <InfoCard label="Lote" value={selectedRow.production?.name || selectedRow.production_name || "-"} />
                <InfoCard label="Disponibles" value={`${selectedRemainingLiters.toLocaleString("es-MX")} Lt`} />
                <InfoCard label="A mover" value={`${allocationTotal.toLocaleString("es-MX")} Lt`} />
              </div>

              <div className="space-y-3">
                {allocationRows.map((row, index) => {
                  const tank = storageTanks.find((item) => item.id === row.storageTankId) || null;
                  const capacityLt = tank?.capacityLt != null ? Number(tank.capacityLt) : null;
                  const currentLiters = Number(tank?.currentLiters || 0);
                  const availableCapacity = capacityLt != null ? Math.max(capacityLt - currentLiters, 0) : null;
                  const litersValue = Number(row.liters || 0);
                  const overTankCapacity = availableCapacity != null && litersValue > availableCapacity;

                  return (
                    <div key={`allocation-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-3 md:grid-cols-[1.3fr_0.7fr_auto]">
                        <div>
                          <label className="mb-1 block text-xs font-black uppercase tracking-[0.25em] text-slate-400">Tanque</label>
                          <select
                            value={row.storageTankId}
                            onChange={(event) => updateAllocationRow(index, { storageTankId: event.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                          >
                            <option value="">Selecciona tanque</option>
                            {storageTanks
                              .filter((item) => item.isActive !== false)
                              .map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                  {item.capacityLt != null
                                    ? ` · ${Number(item.currentLiters || 0).toLocaleString("es-MX")}/${Number(item.capacityLt).toLocaleString("es-MX")} Lt`
                                    : ""}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-black uppercase tracking-[0.25em] text-slate-400">Litros</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={row.liters}
                            onChange={(event) => updateAllocationRow(index, { liters: event.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-center"
                          />
                        </div>

                        <div className="flex items-end gap-2">
                          <button
                            type="button"
                            onClick={() => removeAllocationRow(index)}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-rose-700 hover:bg-rose-100"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>
                          {tank?.name || "Sin tanque"}
                          {capacityLt != null ? ` · Disponible ${availableCapacity?.toLocaleString("es-MX")} Lt` : ""}
                        </span>
                        {overTankCapacity && <span className="font-bold text-rose-600">Excede capacidad del tanque</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={addAllocationRow}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-700 hover:bg-slate-50"
                >
                  Agregar tanque
                </button>
                <p className="text-xs font-semibold text-slate-500">
                  Restante por asignar: {allocationRemaining.toLocaleString("es-MX")} Lt
                </p>
              </div>

              {allocationError && <p className="text-sm font-semibold text-rose-600">{allocationError}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitAllocation}
                  disabled={allocationSaving}
                  className="flex-1 rounded-xl bg-slate-950 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-slate-300"
                >
                  {allocationSaving ? "Guardando..." : "Asignar litros"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}
