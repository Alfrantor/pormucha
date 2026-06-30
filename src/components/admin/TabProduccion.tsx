"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  addProductionIngredient,
  cancelProduction,
  completeProduction,
  createProduction,
  createTank,
  recordProductionParameter,
  setProduccionPin,
  updateTank,
  type IngredientInput,
} from "@/app/_actions/production";
import { createProductionSecondPhase } from "@/app/_actions/production-phase";
import { formatProductionName } from "@/lib/production-naming";
import {
  evaluateProductionParametersWithFormula,
  formatFormulaDuration,
  profileFromFormula,
  type ParameterKey,
  type ProductionFormulaView,
  type ProductionType,
} from "@/lib/production-profiles";

type ProdView = "params" | "additions" | "complete";

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

function parseNum(value: string) {
  if (!value.trim()) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

function buildIngredientsFromFormula(formula: ProductionFormulaView | null | undefined): IngredientInput[] {
  if (!formula) return [];
  return formula.items.map((item) => ({
    rawMaterialId: item.rawMaterialId,
    quantity: Number(item.quantity),
    locationId: item.defaultLocationId || "",
  }));
}

export default function TabProduccion({ tanks, productions, rawMaterials, locations, formulas, userEmail }: any) {
  const safeTanks = Array.isArray(tanks) ? tanks : [];
  const safeProductions = Array.isArray(productions) ? productions : [];
  const safeRM = Array.isArray(rawMaterials) ? rawMaterials : [];
  const safeLocations = Array.isArray(locations) ? locations : [];
  const safeFormulas = Array.isArray(formulas) ? formulas : [];

  const [nfcBaseUrl, setNfcBaseUrl] = useState("");
  React.useEffect(() => {
    setNfcBaseUrl(window.location.origin);
  }, []);

  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinMsg, setPinMsg] = useState("");

  const [view, setView] = useState<"producciones" | "tanques">("producciones");
  const [statusFilter, setStatusFilter] = useState("IN_PROGRESS");

  const [showCreateTank, setShowCreateTank] = useState(false);
  const [showCreateProd, setShowCreateProd] = useState(false);
  const [selectedProd, setSelectedProd] = useState<any | null>(null);
  const [prodView, setProdView] = useState<ProdView>("params");
  const [showSecondPhaseModal, setShowSecondPhaseModal] = useState(false);
  const [secondPhaseTarget, setSecondPhaseTarget] = useState<any | null>(null);
  const [newTankName, setNewTankName] = useState("");
  const [newTankCapacity, setNewTankCapacity] = useState("");
  const [tankSaving, setTankSaving] = useState(false);
  const [tankError, setTankError] = useState("");

  const [newProdType, setNewProdType] = useState<ProductionType>("A");
  const [newProdTank, setNewProdTank] = useState("");
  const [newProdStart, setNewProdStart] = useState(() => new Date().toISOString().slice(0, 16));
  const [newProdNotes, setNewProdNotes] = useState("");
  const [ingredients, setIngredients] = useState<IngredientInput[]>([]);
  const [prodSaving, setProdSaving] = useState(false);
  const [prodError, setProdError] = useState("");

  const [paramPh, setParamPh] = useState("");
  const [paramBrix, setParamBrix] = useState("");
  const [paramTemp, setParamTemp] = useState("");
  const [paramAcid, setParamAcid] = useState("");
  const [paramNotes, setParamNotes] = useState("");
  const [paramDate, setParamDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [paramSaving, setParamSaving] = useState(false);
  const [paramError, setParamError] = useState("");

  const [addRM, setAddRM] = useState("");
  const [addQty, setAddQty] = useState("");
  const [addLoc, setAddLoc] = useState(safeLocations[0]?.id || "");
  const [addNotes, setAddNotes] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  const [completeLt, setCompleteLt] = useState("");
  const [completeNotes, setCompleteNotes] = useState("");
  const [completeSaving, setCompleteSaving] = useState(false);

  const [phase2Condition, setPhase2Condition] = useState("Aceptado");
  const [phase2ReceivedBy, setPhase2ReceivedBy] = useState("");
  const [phase2MeasuredBy, setPhase2MeasuredBy] = useState("");
  const [phase2StartedBy, setPhase2StartedBy] = useState(userEmail || "");
  const [phase2Date, setPhase2Date] = useState(() => new Date().toISOString().slice(0, 16));
  const [phase2Ph, setPhase2Ph] = useState("");
  const [phase2Brix, setPhase2Brix] = useState("");
  const [phase2Temp, setPhase2Temp] = useState("");
  const [phase2Acid, setPhase2Acid] = useState("");
  const [phase2Notes, setPhase2Notes] = useState("");
  const [phase2Saving, setPhase2Saving] = useState(false);
  const [phase2Error, setPhase2Error] = useState("");

  const filteredProds = useMemo(() => {
    if (statusFilter === "ALL") return safeProductions;
    return safeProductions.filter((p: any) => p.status === statusFilter);
  }, [safeProductions, statusFilter]);

  const formulasByCode = useMemo(() => {
    const map = new Map<string, any>();
    safeFormulas.forEach((formula: any) => {
      if (formula?.isActive) {
        map.set(formula.code, formula);
      }
    });
    return map;
  }, [safeFormulas]);

  const selectedFormula = formulasByCode.get(newProdType) || null;
  const profile = profileFromFormula(selectedFormula, newProdType);
  const selectedTankForNewProd = safeTanks.find((tank: any) => tank.id === newProdTank) || null;
  const generatedProdName = newProdTank
    ? formatProductionName(newProdStart, selectedTankForNewProd?.name, newProdType)
    : "";
  const currentParamCheck = evaluateProductionParametersWithFormula(selectedProd?.formula, selectedProd?.productType || "A", {
    ph: parseNum(paramPh),
    brix: parseNum(paramBrix),
    temperature: parseNum(paramTemp),
    acidity: parseNum(paramAcid),
  });
  const phase2Check = evaluateProductionParametersWithFormula(secondPhaseTarget?.formula, secondPhaseTarget?.productType || "A", {
    ph: parseNum(phase2Ph),
    brix: parseNum(phase2Brix),
    temperature: parseNum(phase2Temp),
    acidity: parseNum(phase2Acid),
  });

  useEffect(() => {
    setIngredients(buildIngredientsFromFormula(selectedFormula));
  }, [selectedFormula]);

  const addIngredientRow = () => {
    setIngredients((prev) => [...prev, { rawMaterialId: "", quantity: 0, locationId: safeLocations[0]?.id || "" }]);
  };

  const removeIngredientRow = (index: number) => {
    setIngredients((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSavePin = async () => {
    setPinSaving(true);
    setPinMsg("");
    const res = await setProduccionPin(newPin);
    setPinSaving(false);
    if (res.error) {
      setPinMsg(res.error);
      return;
    }
    setPinMsg("PIN actualizado");
    setTimeout(() => {
      setShowPinModal(false);
      setNewPin("");
      setPinMsg("");
    }, 1200);
  };

  const handleCreateProd = async () => {
    setProdError("");
    if (!newProdTank) {
      setProdError("Selecciona un tanque");
      return;
    }

    const validIngredients = ingredients.filter((item) => item.rawMaterialId && item.quantity > 0);

    setProdSaving(true);
    const res = await createProduction({
      name: generatedProdName,
      productType: newProdType,
      productionFormulaId: selectedFormula?.id,
      tankId: newProdTank,
      startedAt: newProdStart,
      notes: newProdNotes,
      createdBy: userEmail,
      ingredients: validIngredients,
    });
    setProdSaving(false);

    if (res.error) {
      setProdError(res.error);
      return;
    }

    setShowCreateProd(false);
    setNewProdType("A");
    setNewProdTank("");
    setNewProdStart(new Date().toISOString().slice(0, 16));
    setNewProdNotes("");
    setIngredients([]);
    window.location.reload();
  };

  const handleCreateTank = async () => {
    setTankError("");
    if (!newTankName.trim()) {
      setTankError("Nombre requerido");
      return;
    }

    const formData = new FormData();
    formData.set("name", newTankName.trim());
    if (newTankCapacity.trim()) {
      formData.set("capacityLt", newTankCapacity.trim());
    }

    setTankSaving(true);
    const res = await createTank(formData);
    setTankSaving(false);

    if (res?.error) {
      setTankError(res.error);
      return;
    }

    setShowCreateTank(false);
    setNewTankName("");
    setNewTankCapacity("");
    window.location.reload();
  };

  const handleToggleTankActive = async (tank: any) => {
    const formData = new FormData();
    formData.set("id", tank.id);
    formData.set("name", tank.name);
    formData.set("capacityLt", tank.capacityLt != null ? String(tank.capacityLt) : "");
    formData.set("isActive", String(!tank.isActive));
    await updateTank(formData);
    window.location.reload();
  };

  const handleRecordParam = async () => {
    if (!selectedProd) return;
    setParamError("");
    if (!paramPh && !paramBrix && !paramTemp && !paramAcid) {
      setParamError("Ingresa al menos un parametro");
      return;
    }

    setParamSaving(true);
    const res = await recordProductionParameter({
      productionId: selectedProd.id,
      ph: parseNum(paramPh),
      brix: parseNum(paramBrix),
      temperature: parseNum(paramTemp),
      acidity: parseNum(paramAcid),
      notes: paramNotes,
      recordedBy: userEmail,
      measuredAt: paramDate,
    });
    setParamSaving(false);

    if (res.error) {
      setParamError(res.error);
      return;
    }

    if (!currentParamCheck.ok) {
      setParamError(`Parametros fuera de rango: ${currentParamCheck.failing.map((item) => item.label).join(", ")}`);
    } else {
      setParamError("");
    }

    window.location.reload();
  };

  const handleAddIngredient = async () => {
    if (!selectedProd) return;
    setAddError("");
    if (!addRM || !addQty || Number(addQty) <= 0) {
      setAddError("Selecciona insumo y cantidad");
      return;
    }

    setAddSaving(true);
    const res = await addProductionIngredient({
      productionId: selectedProd.id,
      rawMaterialId: addRM,
      quantity: Number(addQty),
      locationId: addLoc || undefined,
      notes: addNotes,
      addedBy: userEmail,
    });
    setAddSaving(false);

    if (res.error) {
      setAddError(res.error);
      return;
    }

    window.location.reload();
  };

  const handleComplete = async () => {
    if (!selectedProd || !completeLt) return;
    setCompleteSaving(true);
    await completeProduction(selectedProd.id, Number(completeLt), completeNotes);
    setCompleteSaving(false);
    window.location.reload();
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancelar esta produccion?")) return;
    await cancelProduction(id);
    window.location.reload();
  };

  const openSecondPhase = (prod: any) => {
    setSecondPhaseTarget(prod);
    setPhase2Condition("Aceptado");
    setPhase2ReceivedBy("");
    setPhase2MeasuredBy("");
    setPhase2StartedBy(userEmail || "");
    setPhase2Date(new Date().toISOString().slice(0, 16));
    setPhase2Ph("");
    setPhase2Brix("");
    setPhase2Temp("");
    setPhase2Acid("");
    setPhase2Notes("");
    setPhase2Error("");
    setShowSecondPhaseModal(true);
  };

  const handleSecondPhase = async () => {
    if (!secondPhaseTarget) return;
    setPhase2Error("");
    if (!phase2ReceivedBy.trim() || !phase2MeasuredBy.trim() || !phase2StartedBy.trim()) {
      setPhase2Error("Completa quien recibio, quien midio y quien inicio fase dos");
      return;
    }

    setPhase2Saving(true);
    const res = await createProductionSecondPhase({
      productionId: secondPhaseTarget.id,
      receivedCondition: phase2Condition,
      receivedBy: phase2ReceivedBy,
      measuredBy: phase2MeasuredBy,
      startedBy: phase2StartedBy,
      measuredAt: phase2Date,
      ph: parseNum(phase2Ph),
      brix: parseNum(phase2Brix),
      temperature: parseNum(phase2Temp),
      acidity: parseNum(phase2Acid),
      notes: phase2Notes,
    });
    setPhase2Saving(false);

    if (res.error) {
      setPhase2Error(res.error);
      return;
    }

    if (!phase2Check.ok) {
      setPhase2Error(`Fase dos con parametros fuera de rango: ${phase2Check.failing.map((item) => item.label).join(", ")}`);
    } else {
      setPhase2Error("");
    }

    setShowSecondPhaseModal(false);
    window.location.reload();
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-950">Produccion de bebida base</h2>
        <div className="flex gap-2">
          <button onClick={() => setView("producciones")} className={tabClass(view === "producciones")}>Lotes</button>
          <button onClick={() => setView("tanques")} className={tabClass(view === "tanques")}>Tanques</button>
          <button onClick={() => setShowPinModal(true)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">PIN NFC</button>
        </div>
      </div>

      {view === "producciones" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["IN_PROGRESS", "COMPLETED", "CANCELLED", "ALL"] as const).map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={filterClass(statusFilter === status)}>
                {status === "ALL" ? "Todos" : status === "IN_PROGRESS" ? "En proceso" : status === "COMPLETED" ? "Completados" : "Cancelados"}
              </button>
            ))}
            <button onClick={() => setShowCreateProd(true)} className="ml-auto rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">
              Nueva produccion
            </button>
          </div>

          <div className="space-y-3">
            {filteredProds.length === 0 && <p className="py-10 text-center text-sm italic text-slate-400">Sin lotes en este estado</p>}
            {filteredProds.map((prod: any) => {
              const formulaForProd = prod.formula || formulasByCode.get(prod.productType) || null;
              const profileForProdResolved = profileFromFormula(formulaForProd, prod.productType);
              const lastParam = prod.parameters?.length
                ? [...prod.parameters].sort((a: any, b: any) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())[0]
                : null;
              const lastCheck = lastParam
                ? evaluateProductionParametersWithFormula(formulaForProd, prod.productType, {
                    ph: lastParam.ph != null ? Number(lastParam.ph) : undefined,
                    brix: lastParam.brix != null ? Number(lastParam.brix) : undefined,
                    temperature: lastParam.temperature != null ? Number(lastParam.temperature) : undefined,
                    acidity: lastParam.acidity != null ? Number(lastParam.acidity) : undefined,
                  })
                : null;
              const phase2 = prod.secondPhaseRecords?.length ? prod.secondPhaseRecords[0] : null;

              return (
                <div key={prod.id} className="rounded-xl border bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-slate-950">{prod.name}</h3>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-700">Tipo {prod.productType}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${prod.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" : prod.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {prod.status === "IN_PROGRESS" ? "En proceso" : prod.status === "COMPLETED" ? "Completado" : "Cancelado"}
                        </span>
                        {formulaForProd && (
                          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-violet-700">
                            {formulaForProd.name}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>Tanque: {prod.tank?.name || "-"}</span>
                        <span>Inicio: {fmtDate(prod.startedAt)}</span>
                        <span>Duracion objetivo: {formatFormulaDuration(profileForProdResolved)}</span>
                        {prod.litersProduced != null && <span>Salida: {Number(prod.litersProduced)} Lt</span>}
                      </div>
                      <p className="max-w-3xl text-sm text-slate-600">{profileForProdResolved.formulaSummary}</p>
                      <div className="flex flex-wrap gap-2">
                        {prod.ingredients?.map((ing: any) => (
                          <span key={ing.id} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                            {ing.rawMaterial?.name} {Number(ing.quantity)} {ing.rawMaterial?.unit}
                          </span>
                        ))}
                        {(!prod.ingredients || prod.ingredients.length === 0) && (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">Sin insumos iniciales registrados</span>
                        )}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {(Object.entries(profileForProdResolved.parameters) as [ParameterKey, any][]).map(([key, range]) => (
                          <div key={key} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            <p className="font-black uppercase tracking-[0.2em] text-slate-400">{range.label}</p>
                            <p>{range.min} - {range.max}</p>
                          </div>
                        ))}
                      </div>
                      {lastParam && (
                        <div className={`rounded-lg border px-3 py-2 text-xs ${lastCheck && !lastCheck.ok ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                          Ultima medicion: {fmtDate(lastParam.measuredAt)}
                          {lastCheck && !lastCheck.ok ? ` | Fuera de rango: ${lastCheck.failing.map((item) => item.label).join(", ")}` : " | Dentro de rango"}
                        </div>
                      )}
                      {phase2 && (
                        <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-700">
                          Fase dos iniciada por {phase2.startedBy || "-"} | Recibio: {phase2.receivedBy || "-"} | Midio: {phase2.measuredBy || "-"} | Estado recibido: {phase2.receivedCondition || "-"}
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-[170px] flex-col gap-2">
                      {prod.status === "IN_PROGRESS" && (
                        <>
                          <button onClick={() => { setSelectedProd(prod); setProdView("params"); }} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Parametros</button>
                          <button onClick={() => { setSelectedProd(prod); setProdView("additions"); }} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600">Agregar insumo</button>
                          <button onClick={() => openSecondPhase(prod)} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700">Iniciar segunda fase</button>
                          <button onClick={() => { setSelectedProd(prod); setProdView("complete"); }} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">Completar</button>
                          <button onClick={() => handleCancel(prod.id)} className="rounded-lg bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-200">Cancelar</button>
                        </>
                      )}
                      {prod.status !== "IN_PROGRESS" && (
                        <button onClick={() => { setSelectedProd(prod); setProdView("params"); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Ver detalle</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "tanques" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCreateTank(true)} className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">Nuevo tanque</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {safeTanks.map((tank: any) => {
              const activeProd = safeProductions.find((p: any) => p.tankId === tank.id && p.status === "IN_PROGRESS");
              return (
                <div key={tank.id} className={`rounded-xl border bg-white p-4 ${!tank.isActive ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-950">{tank.name}</p>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${tank.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {tank.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Capacidad: {tank.capacityLt != null ? Number(tank.capacityLt) : "-"} Lt</p>
                  {nfcBaseUrl && <p className="mt-2 truncate rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">{nfcBaseUrl}/tanque/{tank.id}</p>}
                  <p className="mt-2 text-xs text-slate-500">{activeProd ? `En proceso: ${activeProd.name}` : "Disponible"}</p>
                  <button
                    onClick={() => handleToggleTankActive(tank)}
                    className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                      {tank.isActive ? "Desactivar" : "Activar"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showCreateProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="space-y-5 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-950">Nueva produccion</h3>
                <button onClick={() => setShowCreateProd(false)} className="text-xl text-slate-400 hover:text-slate-700">x</button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Nombre del proceso">
                      <input
                        value={generatedProdName}
                        readOnly
                        placeholder="Selecciona fecha, tanque y tipo"
                        className="w-full rounded-lg border bg-slate-50 p-2 text-sm text-slate-600"
                      />
                    </Field>
                    <Field label="Tipo">
                      <select value={newProdType} onChange={(e) => setNewProdType(e.target.value as ProductionType)} className="w-full rounded-lg border p-2 text-sm">
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                      </select>
                    </Field>
                    <Field label="Tanque">
                      <select value={newProdTank} onChange={(e) => setNewProdTank(e.target.value)} className="w-full rounded-lg border p-2 text-sm">
                        <option value="">Selecciona</option>
                        {safeTanks.filter((tank: any) => tank.isActive).map((tank: any) => (
                          <option key={tank.id} value={tank.id}>{tank.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Inicio">
                      <input type="datetime-local" value={newProdStart} onChange={(e) => setNewProdStart(e.target.value)} className="w-full rounded-lg border p-2 text-sm" />
                    </Field>
                  </div>
                  <p className="text-xs text-slate-500">
                    El nombre se genera automaticamente con este formato: dia-mes-año-numeroTanque-tipoProceso.
                  </p>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-slate-900">Formula inicial</p>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setIngredients(buildIngredientsFromFormula(selectedFormula))} className="text-xs font-bold text-violet-700 hover:underline">Recargar formula</button>
                        <button onClick={addIngredientRow} className="text-xs font-bold text-blue-700 hover:underline">Agregar insumo</button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedFormula
                        ? `Se aplicara ${selectedFormula.name} como base del lote y puedes ajustar insumos antes de guardar.`
                        : "No hay una formula activa para este tipo. Puedes capturar los insumos manualmente."}
                    </p>
                    <div className="mt-4 space-y-2">
                      {ingredients.map((ing, index) => (
                        <div key={index} className="flex gap-2">
                          <select
                            value={ing.rawMaterialId}
                            onChange={(e) => setIngredients((prev) => prev.map((row, idx) => idx === index ? { ...row, rawMaterialId: e.target.value } : row))}
                            className="flex-1 rounded-lg border p-2 text-xs"
                          >
                            <option value="">Insumo</option>
                            {safeRM.filter((rm: any) => !rm.isArchived).map((rm: any) => (
                              <option key={rm.id} value={rm.id}>{rm.name} ({rm.unit})</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={ing.quantity || ""}
                            onChange={(e) => setIngredients((prev) => prev.map((row, idx) => idx === index ? { ...row, quantity: Number(e.target.value) } : row))}
                            className="w-24 rounded-lg border p-2 text-xs text-center"
                            placeholder="Cant."
                          />
                          {safeLocations.length > 0 && (
                            <select
                              value={ing.locationId}
                              onChange={(e) => setIngredients((prev) => prev.map((row, idx) => idx === index ? { ...row, locationId: e.target.value } : row))}
                              className="w-36 rounded-lg border p-2 text-xs"
                            >
                              {safeLocations.map((loc: any) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                            </select>
                          )}
                          <button onClick={() => removeIngredientRow(index)} className="rounded-lg px-2 text-red-500 hover:bg-red-50">x</button>
                        </div>
                      ))}
                      {ingredients.length === 0 && <p className="text-xs italic text-slate-400">Sin insumos cargados aun</p>}
                    </div>
                  </div>

                  <Field label="Notas">
                    <textarea value={newProdNotes} onChange={(e) => setNewProdNotes(e.target.value)} rows={3} className="w-full rounded-lg border p-2 text-sm" />
                  </Field>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-950 p-5 text-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Perfil {profile.type}</p>
                  <h4 className="mt-2 text-2xl font-black">{profile.title}</h4>
                  <p className="mt-3 text-sm text-slate-300">{profile.formulaSummary}</p>
                  <div className="mt-4 rounded-xl bg-white/10 p-3 text-sm">
                    Duracion estimada: <span className="font-black">{formatFormulaDuration(profile)}</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {(Object.entries(profile.parameters) as [ParameterKey, any][]).map(([key, range]) => (
                      <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">{range.label}</p>
                        <p className="mt-1 text-sm">Objetivo: {range.min} a {range.max}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {prodError && <p className="text-sm font-semibold text-rose-600">{prodError}</p>}

              <div className="flex gap-3">
                <button onClick={() => setShowCreateProd(false)} className="flex-1 rounded-lg border py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button onClick={handleCreateProd} disabled={prodSaving} className="flex-1 rounded-lg bg-slate-950 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-slate-300">
                  {prodSaving ? "Guardando..." : "Iniciar produccion"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateTank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-950">Nuevo tanque</h3>
                <button type="button" onClick={() => setShowCreateTank(false)} className="text-xl text-slate-400 hover:text-slate-700">x</button>
              </div>
              <Field label="Nombre">
                <input value={newTankName} onChange={(e) => setNewTankName(e.target.value)} required className="w-full rounded-lg border p-2 text-sm" />
              </Field>
              <Field label="Capacidad en litros">
                <input value={newTankCapacity} onChange={(e) => setNewTankCapacity(e.target.value)} type="number" min="0" step="0.1" className="w-full rounded-lg border p-2 text-sm" />
              </Field>
              {tankError && <p className="text-xs font-semibold text-rose-600">{tankError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreateTank(false)} className="flex-1 rounded-lg border py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={handleCreateTank} disabled={tankSaving} className="flex-1 rounded-lg bg-slate-950 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-slate-300">
                  {tankSaving ? "Creando..." : "Crear"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-950">{selectedProd.name}</h3>
                  <p className="text-xs text-slate-500">Tipo {selectedProd.productType} | {selectedProd.tank?.name || "-"}</p>
                </div>
                <button onClick={() => setSelectedProd(null)} className="text-xl text-slate-400 hover:text-slate-700">x</button>
              </div>

              {selectedProd.status === "IN_PROGRESS" && (
                <div className="flex gap-2 border-b pb-3">
                  <button onClick={() => setProdView("params")} className={subTabClass(prodView === "params")}>Parametros</button>
                  <button onClick={() => setProdView("additions")} className={subTabClass(prodView === "additions")}>Insumos</button>
                  <button onClick={() => setProdView("complete")} className={subTabClass(prodView === "complete")}>Completar</button>
                </div>
              )}

              {prodView === "params" && (
                <div className="space-y-4">
                  {selectedProd.status === "IN_PROGRESS" && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-sm font-black text-blue-800">Registrar medicion</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <Field label="Fecha y hora">
                          <input type="datetime-local" value={paramDate} onChange={(e) => setParamDate(e.target.value)} className="w-full rounded-lg border p-2 text-xs" />
                        </Field>
                        <div className="grid grid-cols-2 gap-2 md:col-span-1">
                          <MiniField label="pH"><input type="number" step="0.01" value={paramPh} onChange={(e) => setParamPh(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" /></MiniField>
                          <MiniField label="Brix"><input type="number" step="0.01" value={paramBrix} onChange={(e) => setParamBrix(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" /></MiniField>
                          <MiniField label="Temperatura"><input type="number" step="0.01" value={paramTemp} onChange={(e) => setParamTemp(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" /></MiniField>
                          <MiniField label="Acidez"><input type="number" step="0.01" value={paramAcid} onChange={(e) => setParamAcid(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" /></MiniField>
                        </div>
                      </div>
                      <Field label="Notas">
                        <input value={paramNotes} onChange={(e) => setParamNotes(e.target.value)} className="w-full rounded-lg border p-2 text-xs" />
                      </Field>
                      {!currentParamCheck.ok && (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                          Parametros fuera de rango: {currentParamCheck.failing.map((item) => `${item.label} (${item.actual})`).join(", ")}
                        </div>
                      )}
                      {paramError && <p className="mt-3 text-xs font-semibold text-rose-600">{paramError}</p>}
                      <button onClick={handleRecordParam} disabled={paramSaving} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:bg-slate-300">
                        {paramSaving ? "Guardando..." : "Registrar medicion"}
                      </button>
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-[11px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="border px-2 py-2 text-left">Fecha</th>
                          <th className="border px-2 py-2">pH</th>
                          <th className="border px-2 py-2">Brix</th>
                          <th className="border px-2 py-2">Temp</th>
                          <th className="border px-2 py-2">Acidez</th>
                          <th className="border px-2 py-2 text-left">Notas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProd.parameters?.length ? [...selectedProd.parameters]
                          .sort((a: any, b: any) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
                          .map((pm: any) => {
                            const check = evaluateProductionParametersWithFormula(selectedProd.formula, selectedProd.productType, {
                              ph: pm.ph != null ? Number(pm.ph) : undefined,
                              brix: pm.brix != null ? Number(pm.brix) : undefined,
                              temperature: pm.temperature != null ? Number(pm.temperature) : undefined,
                              acidity: pm.acidity != null ? Number(pm.acidity) : undefined,
                            });
                            return (
                              <tr key={pm.id} className={check.ok ? "bg-white" : "bg-amber-50"}>
                                <td className="border px-2 py-2">{fmtDate(pm.measuredAt)}</td>
                                <td className="border px-2 py-2 text-center">{pm.ph != null ? Number(pm.ph) : "-"}</td>
                                <td className="border px-2 py-2 text-center">{pm.brix != null ? Number(pm.brix) : "-"}</td>
                                <td className="border px-2 py-2 text-center">{pm.temperature != null ? Number(pm.temperature) : "-"}</td>
                                <td className="border px-2 py-2 text-center">{pm.acidity != null ? Number(pm.acidity) : "-"}</td>
                                <td className="border px-2 py-2">{pm.notes || (check.ok ? "-" : `Fuera de rango: ${check.failing.map((item) => item.label).join(", ")}`)}</td>
                              </tr>
                            );
                          }) : (
                          <tr><td colSpan={6} className="px-4 py-6 text-center italic text-slate-400">Sin mediciones aun</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {prodView === "additions" && selectedProd.status === "IN_PROGRESS" && (
                <div className="space-y-4">
                  <Field label="Insumo">
                    <select value={addRM} onChange={(e) => setAddRM(e.target.value)} className="w-full rounded-lg border p-2 text-sm">
                      <option value="">Selecciona</option>
                      {safeRM.filter((rm: any) => !rm.isArchived).map((rm: any) => (
                        <option key={rm.id} value={rm.id}>{rm.name} ({rm.unit})</option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Cantidad">
                      <input type="number" min="0" step="0.01" value={addQty} onChange={(e) => setAddQty(e.target.value)} className="w-full rounded-lg border p-2 text-sm text-center" />
                    </Field>
                    <Field label="Ubicacion">
                      <select value={addLoc} onChange={(e) => setAddLoc(e.target.value)} className="w-full rounded-lg border p-2 text-sm">
                        {safeLocations.map((loc: any) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Notas">
                    <input value={addNotes} onChange={(e) => setAddNotes(e.target.value)} className="w-full rounded-lg border p-2 text-sm" />
                  </Field>
                  {addError && <p className="text-xs font-semibold text-rose-600">{addError}</p>}
                  <button onClick={handleAddIngredient} disabled={addSaving} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:bg-slate-300">
                    {addSaving ? "Registrando..." : "Registrar insumo"}
                  </button>
                </div>
              )}

              {prodView === "complete" && selectedProd.status === "IN_PROGRESS" && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-sm font-black text-emerald-800">Finalizar produccion</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="Litros producidos">
                      <input type="number" min="0" step="0.1" value={completeLt} onChange={(e) => setCompleteLt(e.target.value)} className="w-full rounded-lg border p-2 text-sm text-center" />
                    </Field>
                    <Field label="Notas finales">
                      <textarea value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} rows={2} className="w-full rounded-lg border p-2 text-sm" />
                    </Field>
                  </div>
                  <button onClick={handleComplete} disabled={completeSaving || !completeLt} className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300">
                    {completeSaving ? "Guardando..." : "Marcar como completado"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSecondPhaseModal && secondPhaseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-950">Iniciar segunda fase</h3>
                  <p className="text-xs text-slate-500">{secondPhaseTarget.name} | Tipo {secondPhaseTarget.productType}</p>
                </div>
                <button onClick={() => setShowSecondPhaseModal(false)} className="text-xl text-slate-400 hover:text-slate-700">x</button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Como se recibio el producto">
                  <select value={phase2Condition} onChange={(e) => setPhase2Condition(e.target.value)} className="w-full rounded-lg border p-2 text-sm">
                    <option value="Aceptado">Aceptado</option>
                    <option value="Observado">Observado</option>
                    <option value="Requiere ajuste">Requiere ajuste</option>
                  </select>
                </Field>
                <Field label="Fecha y hora de lectura">
                  <input type="datetime-local" value={phase2Date} onChange={(e) => setPhase2Date(e.target.value)} className="w-full rounded-lg border p-2 text-sm" />
                </Field>
                <Field label="Quien recibio">
                  <input value={phase2ReceivedBy} onChange={(e) => setPhase2ReceivedBy(e.target.value)} className="w-full rounded-lg border p-2 text-sm" />
                </Field>
                <Field label="Quien tomo parametros">
                  <input value={phase2MeasuredBy} onChange={(e) => setPhase2MeasuredBy(e.target.value)} className="w-full rounded-lg border p-2 text-sm" />
                </Field>
                <Field label="Quien inicio fase dos">
                  <input value={phase2StartedBy} onChange={(e) => setPhase2StartedBy(e.target.value)} className="w-full rounded-lg border p-2 text-sm" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MiniField label="pH"><input type="number" step="0.01" value={phase2Ph} onChange={(e) => setPhase2Ph(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" /></MiniField>
                <MiniField label="Brix"><input type="number" step="0.01" value={phase2Brix} onChange={(e) => setPhase2Brix(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" /></MiniField>
                <MiniField label="Temperatura"><input type="number" step="0.01" value={phase2Temp} onChange={(e) => setPhase2Temp(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" /></MiniField>
                <MiniField label="Acidez"><input type="number" step="0.01" value={phase2Acid} onChange={(e) => setPhase2Acid(e.target.value)} className="w-full rounded-lg border p-2 text-xs text-center" /></MiniField>
              </div>

              {!phase2Check.ok && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  Parametros fuera de rango para fase dos: {phase2Check.failing.map((item) => `${item.label} (${item.actual})`).join(", ")}
                </div>
              )}

              <Field label="Notas">
                <textarea value={phase2Notes} onChange={(e) => setPhase2Notes(e.target.value)} rows={3} className="w-full rounded-lg border p-2 text-sm" />
              </Field>

              {phase2Error && <p className="text-sm font-semibold text-rose-600">{phase2Error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setShowSecondPhaseModal(false)} className="flex-1 rounded-lg border py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button onClick={handleSecondPhase} disabled={phase2Saving} className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:bg-slate-300">
                  {phase2Saving ? "Guardando..." : "Guardar fase dos"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-950">PIN de registro NFC</h3>
              <button onClick={() => setShowPinModal(false)} className="text-xl text-slate-400 hover:text-slate-700">x</button>
            </div>
            <Field label="Nuevo PIN">
              <input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} className="w-full rounded-lg border p-3 text-center text-lg font-bold tracking-[0.4em]" />
            </Field>
            {pinMsg && <p className={`text-sm font-semibold ${pinMsg.toLowerCase().includes("actualizado") ? "text-emerald-600" : "text-rose-600"}`}>{pinMsg}</p>}
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowPinModal(false)} className="flex-1 rounded-lg border py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSavePin} disabled={pinSaving || newPin.length < 4} className="flex-1 rounded-lg bg-slate-950 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-slate-300">
                {pinSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function tabClass(active: boolean) {
  return active
    ? "rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white"
    : "rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50";
}

function filterClass(active: boolean) {
  return active
    ? "rounded-lg bg-slate-950 px-3 py-1.5 text-[11px] font-bold text-white"
    : "rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-50";
}

function subTabClass(active: boolean) {
  return active
    ? "rounded-lg bg-slate-950 px-3 py-1.5 text-[11px] font-bold text-white"
    : "rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50";
}
