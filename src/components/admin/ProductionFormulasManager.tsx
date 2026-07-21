"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProductionFormula } from "@/app/_actions/production-formulas";
import { PRODUCTION_PROFILES, formatFormulaDuration, type ProductionFormulaView, type ProductionType } from "@/lib/production-profiles";

type FormulaStepItemState = {
  sourceKind: "RAW_MATERIAL" | "BASE_BEVERAGE";
  sourceProductionType: "" | ProductionType;
  rawMaterialId: string;
  quantity: string;
  defaultLocationId: string;
  notes: string;
};

type FormulaStepState = {
  title: string;
  instructions: string;
  resultLiters: string;
  items: FormulaStepItemState[];
};

type FormulaFormState = {
  id?: string;
  code: ProductionType;
  name: string;
  description: string;
  formulaSummary: string;
  targetLiters: string;
  durationDays: string;
  durationHours: string;
  phMin: string;
  phMax: string;
  brixMin: string;
  brixMax: string;
  temperatureMin: string;
  temperatureMax: string;
  acidityMin: string;
  acidityMax: string;
  isActive: boolean;
  steps: FormulaStepState[];
};

function createEmptyItem(): FormulaStepItemState {
  return {
    sourceKind: "RAW_MATERIAL",
    sourceProductionType: "",
    rawMaterialId: "",
    quantity: "",
    defaultLocationId: "",
    notes: "",
  };
}

function createDefaultStep(stepNumber: number): FormulaStepState {
  return {
    title: `Paso ${stepNumber}`,
    instructions: "",
    resultLiters: "",
    items: [createEmptyItem()],
  };
}

function createDefaultFormula(code: ProductionType): FormulaFormState {
  const base = PRODUCTION_PROFILES[code];
  return {
    code,
    name: base.title,
    description: "",
    formulaSummary: base.formulaSummary,
    targetLiters: "1",
    durationDays: String(base.durationDays),
    durationHours: String(base.durationHours),
    phMin: String(base.parameters.ph.min),
    phMax: String(base.parameters.ph.max),
    brixMin: String(base.parameters.brix.min),
    brixMax: String(base.parameters.brix.max),
    temperatureMin: String(base.parameters.temperature.min),
    temperatureMax: String(base.parameters.temperature.max),
    acidityMin: String(base.parameters.acidity.min),
    acidityMax: String(base.parameters.acidity.max),
    isActive: true,
    steps: [createDefaultStep(1)],
  };
}

function mapFormulaToState(formula: ProductionFormulaView | undefined, code: ProductionType): FormulaFormState {
  if (!formula) return createDefaultFormula(code);

  return {
    id: formula.id,
    code,
    name: formula.name,
    description: formula.description || "",
    formulaSummary: formula.formulaSummary || "",
    targetLiters: String(formula.targetLiters ?? 1),
    durationDays: String(formula.durationDays),
    durationHours: String(formula.durationHours),
    phMin: String(formula.phMin),
    phMax: String(formula.phMax),
    brixMin: String(formula.brixMin),
    brixMax: String(formula.brixMax),
    temperatureMin: String(formula.temperatureMin),
    temperatureMax: String(formula.temperatureMax),
    acidityMin: String(formula.acidityMin),
    acidityMax: String(formula.acidityMax),
    isActive: formula.isActive,
    steps: formula.steps.length
      ? formula.steps.map((step, index) => ({
          title: step.title || `Paso ${index + 1}`,
          instructions: step.instructions || "",
          resultLiters: step.resultLiters != null ? String(step.resultLiters) : "",
          items: step.items.length
            ? step.items.map((item) => ({
                sourceKind: item.sourceKind || "RAW_MATERIAL",
                sourceProductionType: item.sourceProductionType || "",
                rawMaterialId: item.rawMaterialId || "",
                quantity: String(item.quantity),
                defaultLocationId: item.defaultLocationId || "",
                notes: item.notes || "",
              }))
            : [createEmptyItem()],
        }))
      : [createDefaultStep(1)],
  };
}

export default function ProductionFormulasManager({
  formulas,
  rawMaterials,
  locations,
}: {
  formulas: ProductionFormulaView[];
  rawMaterials: any[];
  locations: any[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const formulaMap = new Map(formulas.map((formula) => [formula.code, formula]));
  const [forms, setForms] = useState<Record<ProductionType, FormulaFormState>>({
    A: mapFormulaToState(formulaMap.get("A"), "A"),
    B: mapFormulaToState(formulaMap.get("B"), "B"),
    C: mapFormulaToState(formulaMap.get("C"), "C"),
  });
  const [savingCode, setSavingCode] = useState<ProductionType | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  const updateFormula = (code: ProductionType, updater: (current: FormulaFormState) => FormulaFormState) => {
    setForms((prev) => ({ ...prev, [code]: updater(prev[code]) }));
  };

  const saveFormula = async (code: ProductionType) => {
    const formula = forms[code];
    setSavingCode(code);
    setMessages((prev) => ({ ...prev, [code]: "" }));

    const res = await saveProductionFormula({
      code,
      name: formula.name,
      description: formula.description,
      formulaSummary: formula.formulaSummary,
      targetLiters: Number(formula.targetLiters),
      durationDays: Number(formula.durationDays),
      durationHours: Number(formula.durationHours),
      phMin: Number(formula.phMin),
      phMax: Number(formula.phMax),
      brixMin: Number(formula.brixMin),
      brixMax: Number(formula.brixMax),
      temperatureMin: Number(formula.temperatureMin),
      temperatureMax: Number(formula.temperatureMax),
      acidityMin: Number(formula.acidityMin),
      acidityMax: Number(formula.acidityMax),
      isActive: formula.isActive,
      steps: formula.steps.map((step) => ({
        title: step.title,
        instructions: step.instructions,
        resultLiters: step.resultLiters.trim() ? Number(step.resultLiters) : null,
        items: step.items.map((item) => ({
          sourceKind: item.sourceKind,
          sourceProductionType: item.sourceProductionType || null,
          rawMaterialId: item.rawMaterialId || null,
          quantity: Number(item.quantity),
          defaultLocationId: item.defaultLocationId || null,
          notes: item.notes,
        })),
      })),
    });

    setSavingCode(null);
    setMessages((prev) => ({ ...prev, [code]: res.success ? "Fórmula guardada" : res.error || "No se pudo guardar" }));
    if (res.success) {
      startTransition(() => router.refresh());
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-3">
        {(["A", "B", "C"] as ProductionType[]).map((code) => {
          const formula = forms[code];
          return (
            <article key={code} className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Fórmula {code}</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{formula.name || `Fórmula ${code}`}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Aquí defines cómo se realiza la fórmula paso por paso, qué se hace, qué insumos usa y cuántos litros deja cada etapa.
                  </p>
                  <p className="mt-2 text-xs font-semibold text-violet-700">
                    Duración actual: {formatFormulaDuration({ durationDays: Number(formula.durationDays || 0), durationHours: Number(formula.durationHours || 0) })}
                  </p>
                </div>
                <label className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formula.isActive}
                    onChange={(e) => updateFormula(code, (current) => ({ ...current, isActive: e.target.checked }))}
                  />
                  Activa
                </label>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Field label="Nombre">
                  <input value={formula.name} onChange={(e) => updateFormula(code, (current) => ({ ...current, name: e.target.value }))} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
                </Field>
                <Field label="Fórmula para x litros">
                  <input type="number" min="0.1" step="0.01" value={formula.targetLiters} onChange={(e) => updateFormula(code, (current) => ({ ...current, targetLiters: e.target.value }))} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
                </Field>
                <Field label="Duración (días)">
                  <input type="number" min="0" value={formula.durationDays} onChange={(e) => updateFormula(code, (current) => ({ ...current, durationDays: e.target.value }))} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
                </Field>
                <Field label="Duración (horas)">
                  <input type="number" min="0" value={formula.durationHours} onChange={(e) => updateFormula(code, (current) => ({ ...current, durationHours: e.target.value }))} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
                </Field>
              </div>

              <Field label="Resumen operativo">
                <textarea value={formula.formulaSummary} onChange={(e) => updateFormula(code, (current) => ({ ...current, formulaSummary: e.target.value }))} rows={2} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
              </Field>

              <Field label="Descripción interna">
                <textarea value={formula.description} onChange={(e) => updateFormula(code, (current) => ({ ...current, description: e.target.value }))} rows={2} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
              </Field>

              <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900">Parámetros objetivo</h3>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <RangeField
                    label="pH"
                    min={formula.phMin}
                    max={formula.phMax}
                    onMinChange={(value) => updateFormula(code, (current) => ({ ...current, phMin: value }))}
                    onMaxChange={(value) => updateFormula(code, (current) => ({ ...current, phMax: value }))}
                  />
                  <RangeField
                    label="Brix"
                    min={formula.brixMin}
                    max={formula.brixMax}
                    onMinChange={(value) => updateFormula(code, (current) => ({ ...current, brixMin: value }))}
                    onMaxChange={(value) => updateFormula(code, (current) => ({ ...current, brixMax: value }))}
                  />
                  <RangeField
                    label="Temperatura"
                    min={formula.temperatureMin}
                    max={formula.temperatureMax}
                    onMinChange={(value) => updateFormula(code, (current) => ({ ...current, temperatureMin: value }))}
                    onMaxChange={(value) => updateFormula(code, (current) => ({ ...current, temperatureMax: value }))}
                  />
                  <RangeField
                    label="Acidez"
                    min={formula.acidityMin}
                    max={formula.acidityMax}
                    onMinChange={(value) => updateFormula(code, (current) => ({ ...current, acidityMin: value }))}
                    onMaxChange={(value) => updateFormula(code, (current) => ({ ...current, acidityMax: value }))}
                  />
                </div>
              </div>

              <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Proceso por pasos</h3>
                    <p className="mt-1 text-xs text-slate-500">Cada paso indica qué se hace, qué insumos necesita y cuántos litros resultan.</p>
                  </div>
                  <button
                    onClick={() =>
                      updateFormula(code, (current) => ({
                        ...current,
                        steps: [...current.steps, createDefaultStep(current.steps.length + 1)],
                      }))
                    }
                    className="rounded-full bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    Agregar paso
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {formula.steps.map((step, stepIndex) => (
                    <div key={`${code}-step-${stepIndex}`} className="rounded-[1.2rem] border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Paso {stepIndex + 1}</p>
                          <h4 className="mt-1 text-lg font-black text-slate-950">{step.title || `Paso ${stepIndex + 1}`}</h4>
                        </div>
                        {formula.steps.length > 1 && (
                          <button
                            onClick={() =>
                              updateFormula(code, (current) => ({
                                ...current,
                                steps: current.steps.filter((_, index) => index !== stepIndex),
                              }))
                            }
                            className="rounded-full bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                          >
                            Quitar paso
                          </button>
                        )}
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <Field label="Nombre del paso">
                          <input
                            value={step.title}
                            onChange={(e) =>
                              updateFormula(code, (current) => ({
                                ...current,
                                steps: current.steps.map((row, index) => index === stepIndex ? { ...row, title: e.target.value } : row),
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                          />
                        </Field>
                        <Field label="Litros resultantes">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={step.resultLiters}
                            onChange={(e) =>
                              updateFormula(code, (current) => ({
                                ...current,
                                steps: current.steps.map((row, index) => index === stepIndex ? { ...row, resultLiters: e.target.value } : row),
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                          />
                        </Field>
                      </div>

                      <Field label="Qué se hace en este paso">
                        <textarea
                          value={step.instructions}
                          onChange={(e) =>
                            updateFormula(code, (current) => ({
                              ...current,
                              steps: current.steps.map((row, index) => index === stepIndex ? { ...row, instructions: e.target.value } : row),
                            }))
                          }
                          rows={3}
                          className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                        />
                      </Field>

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-black text-slate-900">Insumos necesarios para este paso</h5>
                          <button
                            onClick={() =>
                              updateFormula(code, (current) => ({
                                ...current,
                                steps: current.steps.map((row, index) =>
                                  index === stepIndex ? { ...row, items: [...row.items, createEmptyItem()] } : row
                                ),
                              }))
                            }
                            className="text-xs font-bold text-blue-700 hover:underline"
                          >
                            Agregar insumo
                          </button>
                        </div>

                        <div className="mt-3 space-y-3">
                          {step.items.map((item, itemIndex) => (
                            <div key={`${code}-step-${stepIndex}-item-${itemIndex}`} className="rounded-2xl border border-slate-200 bg-white p-3">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Tipo de insumo">
                                  <select
                                    value={item.sourceKind}
                                    onChange={(e) =>
                                      updateFormula(code, (current) => ({
                                        ...current,
                                        steps: current.steps.map((row, index) =>
                                          index === stepIndex
                                            ? {
                                                ...row,
                                                items: row.items.map((entry, entryIndex) =>
                                                  entryIndex === itemIndex
                                                    ? {
                                                        ...entry,
                                                        sourceKind: e.target.value as "RAW_MATERIAL" | "BASE_BEVERAGE",
                                                        sourceProductionType: "",
                                                        rawMaterialId: "",
                                                      }
                                                    : entry
                                                ),
                                              }
                                            : row
                                        ),
                                      }))
                                    }
                                    className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                                  >
                                    <option value="RAW_MATERIAL">Materia prima</option>
                                    <option value="BASE_BEVERAGE">Bebida base procesada</option>
                                  </select>
                                </Field>

                                <Field label={item.sourceKind === "BASE_BEVERAGE" ? "Tipo de bebida base" : "Materia prima"}>
                                  {item.sourceKind === "BASE_BEVERAGE" ? (
                                    <select
                                      value={item.sourceProductionType}
                                      onChange={(e) =>
                                        updateFormula(code, (current) => ({
                                          ...current,
                                          steps: current.steps.map((row, index) =>
                                            index === stepIndex
                                              ? {
                                                  ...row,
                                                  items: row.items.map((entry, entryIndex) =>
                                                    entryIndex === itemIndex ? { ...entry, sourceProductionType: e.target.value as "" | ProductionType } : entry
                                                  ),
                                                }
                                              : row
                                          ),
                                        }))
                                      }
                                      className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                                    >
                                      <option value="">Selecciona</option>
                                      {(["A", "B", "C"] as ProductionType[]).map((sourceType) => (
                                        <option key={sourceType} value={sourceType}>Bebida base tipo {sourceType}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <select
                                      value={item.rawMaterialId}
                                      onChange={(e) =>
                                        updateFormula(code, (current) => ({
                                          ...current,
                                          steps: current.steps.map((row, index) =>
                                            index === stepIndex
                                              ? {
                                                  ...row,
                                                  items: row.items.map((entry, entryIndex) =>
                                                    entryIndex === itemIndex ? { ...entry, rawMaterialId: e.target.value } : entry
                                                  ),
                                                }
                                              : row
                                          ),
                                        }))
                                      }
                                      className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                                    >
                                      <option value="">Selecciona</option>
                                      {rawMaterials.map((rawMaterial: any) => (
                                        <option key={rawMaterial.id} value={rawMaterial.id}>{rawMaterial.name} ({rawMaterial.unit})</option>
                                      ))}
                                    </select>
                                  )}
                                </Field>

                                <Field label="Cantidad">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      updateFormula(code, (current) => ({
                                        ...current,
                                        steps: current.steps.map((row, index) =>
                                          index === stepIndex
                                            ? {
                                                ...row,
                                                items: row.items.map((entry, entryIndex) =>
                                                  entryIndex === itemIndex ? { ...entry, quantity: e.target.value } : entry
                                                ),
                                              }
                                            : row
                                        ),
                                      }))
                                    }
                                    className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                                  />
                                </Field>

                                <Field label="Ubicación por defecto">
                                  <select
                                    value={item.defaultLocationId}
                                    onChange={(e) =>
                                      updateFormula(code, (current) => ({
                                        ...current,
                                        steps: current.steps.map((row, index) =>
                                          index === stepIndex
                                            ? {
                                                ...row,
                                                items: row.items.map((entry, entryIndex) =>
                                                  entryIndex === itemIndex ? { ...entry, defaultLocationId: e.target.value } : entry
                                                ),
                                              }
                                            : row
                                        ),
                                      }))
                                    }
                                    className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                                  >
                                    <option value="">Sin ubicación fija</option>
                                    {locations.map((location: any) => (
                                      <option key={location.id} value={location.id}>{location.name}</option>
                                    ))}
                                  </select>
                                </Field>

                                <Field label="Notas del insumo">
                                  <input
                                    value={item.notes}
                                    onChange={(e) =>
                                      updateFormula(code, (current) => ({
                                        ...current,
                                        steps: current.steps.map((row, index) =>
                                          index === stepIndex
                                            ? {
                                                ...row,
                                                items: row.items.map((entry, entryIndex) =>
                                                  entryIndex === itemIndex ? { ...entry, notes: e.target.value } : entry
                                                ),
                                              }
                                            : row
                                        ),
                                      }))
                                    }
                                    className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                                  />
                                </Field>
                              </div>

                              <div className="mt-3 flex justify-end">
                                <button
                                  onClick={() =>
                                    updateFormula(code, (current) => ({
                                      ...current,
                                      steps: current.steps.map((row, index) =>
                                        index === stepIndex
                                          ? {
                                              ...row,
                                              items: row.items.length > 1 ? row.items.filter((_, entryIndex) => entryIndex !== itemIndex) : [createEmptyItem()],
                                            }
                                          : row
                                      ),
                                    }))
                                  }
                                  className="rounded-full bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                                >
                                  Quitar insumo
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {messages[code] && (
                <p className={`mt-4 text-sm font-semibold ${messages[code].toLowerCase().includes("guardada") ? "text-emerald-600" : "text-rose-600"}`}>
                  {messages[code]}
                </p>
              )}

              <button
                onClick={() => saveFormula(code)}
                disabled={savingCode === code}
                className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300"
              >
                {savingCode === code ? "Guardando..." : `Guardar fórmula ${code}`}
              </button>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 block">
      <span className="mb-1 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function RangeField({
  label,
  min,
  max,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  min: string;
  max: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <input type="number" step="0.01" value={min} onChange={(e) => onMinChange(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Mín" />
        <input type="number" step="0.01" value={max} onChange={(e) => onMaxChange(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Máx" />
      </div>
    </div>
  );
}
