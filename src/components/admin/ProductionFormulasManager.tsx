"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProductionFormula } from "@/app/_actions/production-formulas";
import type { ProductionFormulaView } from "@/lib/production-profiles";

type IngredientState = {
  sourceKind: "RAW_MATERIAL" | "BASE_BEVERAGE";
  sourceProductionType: string;
  rawMaterialId: string;
  quantity: string;
};

type StepState = {
  stepNumber: number;
  title: string;
  ingredients: IngredientState[];
};

type FormulaState = {
  code: string;
  name: string;
  targetLiters: string;
  durationDays: string;
  updatedAt?: string | null;
  updatedByEmail?: string | null;
  steps: StepState[];
};

type CatalogItem = {
  id: string;
  name: string;
  unit?: string | null;
};

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function formatQuantity(value: number) {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function createEmptyIngredient(): IngredientState {
  return {
    sourceKind: "RAW_MATERIAL",
    sourceProductionType: "",
    rawMaterialId: "",
    quantity: "",
  };
}

function createEmptyStep(stepNumber: number): StepState {
  return {
    stepNumber,
    title: `Paso ${stepNumber}`,
    ingredients: [createEmptyIngredient()],
  };
}

function createDefaultFormula(code: string): FormulaState {
  return {
    code,
    name: "",
    targetLiters: "",
    durationDays: "",
    steps: [createEmptyStep(1)],
  };
}

function mapFormulaToState(formula: ProductionFormulaView): FormulaState {
  const steps =
    formula.steps.length > 0
      ? formula.steps.map((step, stepIndex) => ({
          stepNumber: step.stepNumber || stepIndex + 1,
          title: step.title || `Paso ${step.stepNumber || stepIndex + 1}`,
          ingredients:
            step.items.length > 0
              ? step.items.map((item) => ({
                  sourceKind: item.sourceKind || "RAW_MATERIAL",
                  sourceProductionType: item.sourceProductionType || "",
                  rawMaterialId: item.rawMaterialId || "",
                  quantity: String(item.quantity ?? ""),
                }))
              : [createEmptyIngredient()],
        }))
      : [
          {
            stepNumber: 1,
            title: "Paso 1",
            ingredients:
              formula.items.length > 0
                ? formula.items.map((item) => ({
                    sourceKind: item.sourceKind || "RAW_MATERIAL",
                    sourceProductionType: item.sourceProductionType || "",
                    rawMaterialId: item.rawMaterialId || "",
                    quantity: String(item.quantity ?? ""),
                  }))
                : [createEmptyIngredient()],
          },
        ];

  return {
    code: normalizeCode(formula.code),
    name: formula.name || "",
    targetLiters: formula.targetLiters != null ? String(formula.targetLiters) : "",
    durationDays: String(formula.durationDays || 0),
    updatedAt: formula.updatedAt || null,
    updatedByEmail: formula.updatedByEmail || null,
    steps,
  };
}

function buildInitialState(formulas: ProductionFormulaView[]) {
  const entries = formulas
    .map((formula) => [normalizeCode(formula.code), mapFormulaToState(formula)] as const)
    .sort((a, b) => a[0].localeCompare(b[0], "es-MX", { numeric: true, sensitivity: "base" }));

  return {
    forms: Object.fromEntries(entries),
    order: entries.map(([code]) => code),
  };
}

function getNextFormulaCode(existingCodes: string[]) {
  const normalized = new Set(existingCodes.map((code) => normalizeCode(code)));
  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    if (!normalized.has(letter)) return letter;
  }
  let counter = 1;
  while (normalized.has(`F${counter}`)) counter += 1;
  return `F${counter}`;
}

function IngredientField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function SimpleField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export default function ProductionFormulasManager({
  formulas,
  rawMaterials,
}: {
  formulas: ProductionFormulaView[];
  rawMaterials: CatalogItem[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const initialState = useMemo(() => buildInitialState(formulas), [formulas]);
  const [forms, setForms] = useState<Record<string, FormulaState>>(initialState.forms);
  const [order, setOrder] = useState<string[]>(initialState.order);
  const [selectedCode, setSelectedCode] = useState<string>(initialState.order[0] || "");
  const [editingCode, setEditingCode] = useState<string | null>(initialState.order[0] || null);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [message, setMessage] = useState<Record<string, string>>({});

  const rawMaterialOptions = Array.isArray(rawMaterials) ? rawMaterials : [];
  const formulaOptions = order.length > 0 ? order : Object.keys(forms);
  const currentFormula = selectedCode ? forms[selectedCode] : undefined;
  const orderedSteps = useMemo(() => {
    if (!currentFormula) return [];
    return [...currentFormula.steps].sort((a, b) => b.stepNumber - a.stepNumber);
  }, [currentFormula]);
  const isEditing = editingCode === selectedCode;

  const updateFormula = (code: string, updater: (current: FormulaState) => FormulaState) => {
    setForms((prev) => {
      const current = prev[code] ?? createDefaultFormula(code);
      return { ...prev, [code]: updater(current) };
    });
  };

  const updateCurrentStep = (stepNumber: number, updater: (current: StepState) => StepState) => {
    if (!selectedCode) return;
    updateFormula(selectedCode, (current) => ({
      ...current,
      steps: current.steps.map((step) => (step.stepNumber === stepNumber ? updater(step) : step)),
    }));
  };

  const removeCurrentStep = (stepNumber: number) => {
    if (!selectedCode) return;
    updateFormula(selectedCode, (current) => ({
      ...current,
      steps: current.steps.length > 1 ? current.steps.filter((step) => step.stepNumber !== stepNumber) : current.steps,
    }));
  };

  const getNextStepNumber = (steps: StepState[]) => steps.reduce((max, step) => Math.max(max, step.stepNumber || 0), 0) + 1;

  const preserveScroll = (action: () => void) => {
    if (typeof window === "undefined") {
      action();
      return;
    }

    const scrollTop = window.scrollY;
    action();
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollTop, left: window.scrollX, behavior: "auto" });
    });
  };

  const addFormula = () => {
    const code = getNextFormulaCode(Object.keys(forms));
    setForms((prev) => ({ ...prev, [code]: createDefaultFormula(code) }));
    setOrder((prev) => [...prev, code]);
    setSelectedCode(code);
    setEditingCode(code);
    setMessage((prev) => ({ ...prev, [code]: "" }));
  };

  const startEdit = () => {
    if (!selectedCode) return;
    setEditingCode(selectedCode);
  };

  const cancelEdit = () => {
    if (!selectedCode) return;
    setForms(initialState.forms);
    setOrder(initialState.order);
    setEditingCode(null);
    setMessage((prev) => ({ ...prev, [selectedCode]: "" }));
  };

  const saveFormula = async () => {
    if (!selectedCode) return;
    const formula = forms[selectedCode];
    if (!formula) return;
    if (!window.confirm("¿Deseas guardar esta fórmula?")) return;

    setSavingCode(selectedCode);
    setMessage((prev) => ({ ...prev, [selectedCode]: "" }));

    const validSteps = formula.steps
      .map((step) => ({
        title: step.title.trim(),
        instructions: step.title.trim(),
        resultLiters: formula.targetLiters ? Number(formula.targetLiters) : null,
        items: step.ingredients
          .filter((ingredient) => {
            if (!(Number(ingredient.quantity) > 0)) return false;
            return ingredient.sourceKind === "BASE_BEVERAGE" ? !!ingredient.sourceProductionType : !!ingredient.rawMaterialId;
          })
          .map((ingredient) => ({
            sourceKind: ingredient.sourceKind,
            sourceProductionType: ingredient.sourceKind === "BASE_BEVERAGE" ? (ingredient.sourceProductionType || formula.code) : null,
            rawMaterialId: ingredient.sourceKind === "RAW_MATERIAL" ? ingredient.rawMaterialId || null : null,
            quantity: Number(ingredient.quantity),
            defaultLocationId: null,
            notes: "",
          })),
      }))
      .filter((step) => step.title);

    if (validSteps.length === 0) {
      setSavingCode(null);
      setMessage((prev) => ({ ...prev, [selectedCode]: "Agrega al menos un paso" }));
      return;
    }

    const res = await saveProductionFormula({
      code: normalizeCode(formula.code),
      name: formula.name.trim(),
      targetLiters: Number(formula.targetLiters),
      durationDays: Number(formula.durationDays),
      durationHours: 0,
      phMin: 0,
      phMax: 0,
      brixMin: 0,
      brixMax: 0,
      temperatureMin: 0,
      temperatureMax: 0,
      acidityMin: 0,
      acidityMax: 0,
      isActive: true,
      steps: validSteps,
      description: "",
      formulaSummary: "",
    });

    setSavingCode(null);
    setMessage((prev) => ({
      ...prev,
      [selectedCode]: res.success ? "Formula guardada" : res.error || "No se pudo guardar",
    }));

    if (res.success) {
      setEditingCode(null);
      startTransition(() => router.refresh());
    }
  };

  const canRenderForm = Boolean(currentFormula);

  const renderIngredientSummary = (ingredient: IngredientState) => {
    const label =
      ingredient.sourceKind === "BASE_BEVERAGE"
        ? `Formula base ${ingredient.sourceProductionType || selectedCode}`
        : rawMaterialOptions.find((raw) => raw.id === ingredient.rawMaterialId)?.name || "Materia prima";
    const quantity = Number(ingredient.quantity);
    const unit = ingredient.sourceKind === "BASE_BEVERAGE" ? "L" : rawMaterialOptions.find((raw) => raw.id === ingredient.rawMaterialId)?.unit || "";

    return `${label}: ${formatQuantity(quantity)}${unit ? ` ${unit}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" onClick={addFormula} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
          Nueva formula
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-slate-950">Formulas guardadas</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{formulaOptions.length}</span>
          </div>

          <div className="mt-4 space-y-3">
            {formulaOptions.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Aun no hay formulas. Crea la primera.</p>
            ) : (
              formulaOptions.map((code) => {
                const formula = forms[code];
                const active = selectedCode === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setSelectedCode(code);
                      setEditingCode(null);
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-sm font-black ${active ? "text-white/70" : "text-slate-400"}`}>Formula</p>
                        <h4 className="mt-1 text-lg font-black">{formula?.name?.trim() || "Sin nombre"}</h4>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${active ? "bg-white text-slate-950" : "bg-slate-950 text-white"}`}>
                        {formula?.durationDays ? `${formula.durationDays} d` : "Borrador"}
                      </span>
                    </div>
                    <p className={`mt-3 text-xs ${active ? "text-white/70" : "text-slate-500"}`}>
                      {formula?.targetLiters ? `${formula.targetLiters} L esperados` : "Sin litros definidos"}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          {!canRenderForm ? (
            <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-lg font-black text-slate-900">No hay ninguna formula seleccionada</p>
              <p className="mt-2 text-sm text-slate-500">Crea una nueva para empezar.</p>
            </div>
          ) : !isEditing ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Formula plasmada</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-950">{currentFormula?.name?.trim() || "Sin nombre"}</h3>
                </div>
                <button type="button" onClick={startEdit} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                  Editar
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Nombre</p>
                  <p className="mt-2 text-base font-bold text-slate-950">{currentFormula?.name?.trim() || "-"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Litros esperados</p>
                  <p className="mt-2 text-base font-bold text-slate-950">{currentFormula?.targetLiters ? `${formatQuantity(Number(currentFormula.targetLiters))} L` : "-"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Tiempo de fermentacion</p>
                  <p className="mt-2 text-base font-bold text-slate-950">{currentFormula?.durationDays ? `${formatQuantity(Number(currentFormula.durationDays))} dias` : "-"}</p>
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Pasos</h4>
                    <p className="mt-1 text-xs text-slate-500">Aqui se ve la formula ya plasmada. Presiona Editar para cambiarla.</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {orderedSteps.map((step) => (
                    <div key={`${selectedCode}-view-step-${step.stepNumber}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Paso {step.stepNumber}</p>
                      <h5 className="mt-1 text-lg font-black text-slate-950">{step.title || `Paso ${step.stepNumber}`}</h5>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {step.ingredients.map((ingredient, ingredientIndex) => (
                          <span key={`${selectedCode}-view-step-${step.stepNumber}-ing-${ingredientIndex}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {renderIngredientSummary(ingredient)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                {currentFormula?.updatedAt
                  ? `Ultima edicion: ${formatDateTime(currentFormula.updatedAt)}${currentFormula.updatedByEmail ? ` · ${currentFormula.updatedByEmail}` : ""}`
                  : "Aun no se ha guardado esta formula"}
              </div>

              {message[selectedCode] && <p className="text-sm font-semibold text-rose-600">{message[selectedCode]}</p>}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Edicion</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-950">{currentFormula?.name?.trim() || "Nueva formula"}</h3>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={cancelEdit} className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveFormula}
                    disabled={savingCode === selectedCode}
                    className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300"
                  >
                    {savingCode === selectedCode ? "Guardando..." : "Guardar formula"}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SimpleField label="Nombre de la formula">
                  <input
                    value={currentFormula?.name || ""}
                    onChange={(e) => updateFormula(selectedCode, (current) => ({ ...current, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                    placeholder="Ej. Formula especial"
                  />
                </SimpleField>

                <SimpleField label="Cuantos litros son esperados">
                  <input
                    type="number"
                    min="0.1"
                    step="0.01"
                    value={currentFormula?.targetLiters || ""}
                    onChange={(e) => updateFormula(selectedCode, (current) => ({ ...current, targetLiters: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                    placeholder="Ej. 100"
                  />
                </SimpleField>

                <SimpleField label="Tiempo de fermentacion">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={currentFormula?.durationDays || ""}
                    onChange={(e) => updateFormula(selectedCode, (current) => ({ ...current, durationDays: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                    placeholder="Dias"
                  />
                </SimpleField>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Vista rapida</p>
                  <p className="mt-2 text-sm text-slate-700">{currentFormula?.durationDays ? `${formatQuantity(Number(currentFormula.durationDays))} dias` : "Sin tiempo definido"}</p>
                  <p className="text-sm text-slate-700">{currentFormula?.targetLiters ? `${formatQuantity(Number(currentFormula.targetLiters))} litros esperados` : "Sin litros definidos"}</p>
                </div>
              </div>

              <section className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Que insumos llevara esta formula</h4>
                    <p className="mt-1 text-xs text-slate-500">Agrega uno o varios insumos. Puedes usar materia prima o una formula base.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      preserveScroll(() =>
                        updateFormula(selectedCode, (current) => ({
                          ...current,
                          steps: [...current.steps, createEmptyStep(getNextStepNumber(current.steps))],
                        }))
                      )
                    }
                    className="rounded-full bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    Agregar paso
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {orderedSteps.map((step) => (
                    <div key={`${selectedCode}-ingredient-step-${step.stepNumber}`} className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-slate-900">Paso {step.stepNumber}</p>
                        {currentFormula.steps.length > 1 && (
                          <button type="button" onClick={() => removeCurrentStep(step.stepNumber)} className="rounded-full bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">
                            Quitar paso
                          </button>
                        )}
                      </div>

                      <div className="mt-3 space-y-4">
                        <SimpleField label="Se hace en este paso">
                          <input
                            value={step.title}
                            onChange={(e) => updateCurrentStep(step.stepNumber, (current) => ({ ...current, title: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                            placeholder="Escribe qué se hace"
                          />
                        </SimpleField>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Insumos del paso</p>
                            <button
                              type="button"
                              onClick={() =>
                                preserveScroll(() =>
                                  updateCurrentStep(step.stepNumber, (current) => ({
                                    ...current,
                                    ingredients: [createEmptyIngredient(), ...current.ingredients],
                                  }))
                                )
                              }
                              className="rounded-full bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                            >
                              Agregar insumo
                            </button>
                          </div>

                          <div className="mt-3 space-y-2">
                            {step.ingredients.map((ingredient, ingredientIndex) => (
                              <div key={`${selectedCode}-ingredient-${step.stepNumber}-${ingredientIndex}`} className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="grid gap-3 md:grid-cols-3">
                                  <IngredientField label="Tipo">
                                    <select
                                      value={ingredient.sourceKind}
                                      onChange={(e) =>
                                        updateCurrentStep(step.stepNumber, (current) => ({
                                          ...current,
                                          ingredients: current.ingredients.map((entry, entryIndex) =>
                                            entryIndex === ingredientIndex
                                              ? {
                                                  ...entry,
                                                  sourceKind: e.target.value as "RAW_MATERIAL" | "BASE_BEVERAGE",
                                                  sourceProductionType: e.target.value === "BASE_BEVERAGE" ? entry.sourceProductionType || selectedCode : "",
                                                  rawMaterialId: "",
                                                }
                                              : entry
                                          ),
                                        }))
                                      }
                                      className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                                    >
                                      <option value="RAW_MATERIAL">Materia prima</option>
                                      <option value="BASE_BEVERAGE">Formula base</option>
                                    </select>
                                  </IngredientField>

                                  <IngredientField label={ingredient.sourceKind === "BASE_BEVERAGE" ? "Formula base" : "Materia prima"}>
                                    {ingredient.sourceKind === "BASE_BEVERAGE" ? (
                                      <select
                                        value={ingredient.sourceProductionType || selectedCode}
                                        onChange={(e) =>
                                          updateCurrentStep(step.stepNumber, (current) => ({
                                            ...current,
                                            ingredients: current.ingredients.map((entry, entryIndex) =>
                                              entryIndex === ingredientIndex ? { ...entry, sourceProductionType: e.target.value } : entry
                                            ),
                                          }))
                                        }
                                        className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                                      >
                                        <option value={selectedCode}>Formula {selectedCode}</option>
                                        {formulaOptions
                                          .filter((code) => code !== selectedCode)
                                          .map((code) => (
                                            <option key={code} value={code}>
                                              Formula {code}
                                            </option>
                                          ))}
                                      </select>
                                    ) : (
                                      <select
                                        value={ingredient.rawMaterialId}
                                        onChange={(e) =>
                                          updateCurrentStep(step.stepNumber, (current) => ({
                                            ...current,
                                            ingredients: current.ingredients.map((entry, entryIndex) =>
                                              entryIndex === ingredientIndex ? { ...entry, rawMaterialId: e.target.value } : entry
                                            ),
                                          }))
                                        }
                                        className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                                      >
                                        <option value="">Selecciona</option>
                                        {rawMaterialOptions.map((rawMaterial) => (
                                          <option key={rawMaterial.id} value={rawMaterial.id}>
                                            {rawMaterial.name}
                                            {rawMaterial.unit ? ` (${rawMaterial.unit})` : ""}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                  </IngredientField>

                                  <IngredientField label="Cantidad">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={ingredient.quantity}
                                      onChange={(e) =>
                                        updateCurrentStep(step.stepNumber, (current) => ({
                                          ...current,
                                          ingredients: current.ingredients.map((entry, entryIndex) =>
                                            entryIndex === ingredientIndex ? { ...entry, quantity: e.target.value } : entry
                                          ),
                                        }))
                                      }
                                      className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                                    />
                                  </IngredientField>
                                </div>

                                <div className="mt-3 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateCurrentStep(step.stepNumber, (current) => ({
                                        ...current,
                                        ingredients:
                                          current.ingredients.length > 1
                                            ? current.ingredients.filter((_, entryIndex) => entryIndex !== ingredientIndex)
                                            : [createEmptyIngredient()],
                                      }))
                                    }
                                    className="rounded-full bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                                  >
                                    Quitar
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {message[selectedCode] && (
                <p className={`text-sm font-semibold ${message[selectedCode].toLowerCase().includes("guardada") ? "text-emerald-600" : "text-rose-600"}`}>
                  {message[selectedCode]}
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}