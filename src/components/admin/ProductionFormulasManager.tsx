"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProductionFormula } from "@/app/_actions/production-formulas";
import { PRODUCTION_PROFILES, formatFormulaDuration, type ProductionFormulaView, type ProductionType } from "@/lib/production-profiles";

type FormulaFormState = {
  id?: string;
  code: ProductionType;
  name: string;
  description: string;
  formulaSummary: string;
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
  items: Array<{
    rawMaterialId: string;
    quantity: string;
    defaultLocationId: string;
    notes: string;
  }>;
};

function createDefaultFormula(code: ProductionType): FormulaFormState {
  const base = PRODUCTION_PROFILES[code];
  return {
    code,
    name: base.title,
    description: "",
    formulaSummary: base.formulaSummary,
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
    items: [],
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
    items: formula.items.map((item) => ({
      rawMaterialId: item.rawMaterialId,
      quantity: String(item.quantity),
      defaultLocationId: item.defaultLocationId || "",
      notes: item.notes || "",
    })),
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
      items: formula.items.map((item) => ({
        rawMaterialId: item.rawMaterialId,
        quantity: Number(item.quantity),
        defaultLocationId: item.defaultLocationId || null,
        notes: item.notes,
      })),
    });

    setSavingCode(null);
    setMessages((prev) => ({ ...prev, [code]: res.success ? "Formula guardada" : res.error || "No se pudo guardar" }));
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
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Formula {code}</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{formula.name || `Formula ${code}`}</h2>
                  <p className="mt-2 text-sm text-slate-500">Define tiempos, rangos de control e insumos base para este proceso.</p>
                  <p className="mt-2 text-xs font-semibold text-violet-700">
                    Duracion actual: {formatFormulaDuration({ durationDays: Number(formula.durationDays || 0), durationHours: Number(formula.durationHours || 0) })}
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
                <Field label="Duracion (dias)">
                  <input type="number" min="0" value={formula.durationDays} onChange={(e) => updateFormula(code, (current) => ({ ...current, durationDays: e.target.value }))} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
                </Field>
                <Field label="Nombre">
                  <input value={formula.name} onChange={(e) => updateFormula(code, (current) => ({ ...current, name: e.target.value }))} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
                </Field>
                <Field label="Duracion (horas)">
                  <input type="number" min="0" value={formula.durationHours} onChange={(e) => updateFormula(code, (current) => ({ ...current, durationHours: e.target.value }))} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
                </Field>
              </div>

              <Field label="Resumen operativo">
                <textarea value={formula.formulaSummary} onChange={(e) => updateFormula(code, (current) => ({ ...current, formulaSummary: e.target.value }))} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
              </Field>

              <Field label="Descripcion interna">
                <textarea value={formula.description} onChange={(e) => updateFormula(code, (current) => ({ ...current, description: e.target.value }))} rows={2} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
              </Field>

              <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900">Parametros objetivo</h3>
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
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900">Insumos base</h3>
                  <button
                    onClick={() =>
                      updateFormula(code, (current) => ({
                        ...current,
                        items: [...current.items, { rawMaterialId: "", quantity: "", defaultLocationId: "", notes: "" }],
                      }))
                    }
                    className="text-xs font-bold text-blue-700 hover:underline"
                  >
                    Agregar insumo
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {formula.items.length === 0 && <p className="text-xs italic text-slate-400">Todavia no hay insumos configurados.</p>}
                  {formula.items.map((item, index) => (
                    <div key={`${code}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Materia prima">
                          <select
                            value={item.rawMaterialId}
                            onChange={(e) =>
                              updateFormula(code, (current) => ({
                                ...current,
                                items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, rawMaterialId: e.target.value } : row),
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                          >
                            <option value="">Selecciona</option>
                            {rawMaterials.map((rawMaterial: any) => (
                              <option key={rawMaterial.id} value={rawMaterial.id}>{rawMaterial.name} ({rawMaterial.unit})</option>
                            ))}
                          </select>
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
                                items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: e.target.value } : row),
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                          />
                        </Field>
                        <Field label="Ubicacion por defecto">
                          <select
                            value={item.defaultLocationId}
                            onChange={(e) =>
                              updateFormula(code, (current) => ({
                                ...current,
                                items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, defaultLocationId: e.target.value } : row),
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                          >
                            <option value="">Sin ubicacion fija</option>
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
                                items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, notes: e.target.value } : row),
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
                              items: current.items.filter((_, rowIndex) => rowIndex !== index),
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
                {savingCode === code ? "Guardando..." : `Guardar formula ${code}`}
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
        <input type="number" step="0.01" value={min} onChange={(e) => onMinChange(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Min" />
        <input type="number" step="0.01" value={max} onChange={(e) => onMaxChange(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Max" />
      </div>
    </div>
  );
}
