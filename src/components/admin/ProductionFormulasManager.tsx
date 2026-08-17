"use client";

import { type ReactNode, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProductionFormula } from "@/app/_actions/production-formulas";
import type { ProductionFormulaView } from "@/lib/production-profiles";

type CatalogItem = {
  id: string;
  name: string;
  unit?: string | null;
};

type BlendRowState = {
  rawMaterialId: string;
  freeTextName: string;
  sharePercent: string;
};

type FormulaState = {
  code: string;
  name: string;
  teaType: string;
  teaGramsPerLiter: string;
  sugarGramsPerLiter: string;
  yeastPitchRatePercent: string;
  brewWaterPercent: string;
  durationDays: string;
  phMin: string;
  phMax: string;
  brixTarget: string;
  ttaTarget: string;
  temperatureMin: string;
  temperatureMax: string;
  blendItems: BlendRowState[];
  updatedAt?: string | null;
  updatedByEmail?: string | null;
};

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function formatNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "0";
  const rounded = Number(value.toFixed(digits));
  return rounded.toLocaleString("es-MX", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : Math.min(digits, 2),
    maximumFractionDigits: digits,
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function createEmptyBlendRow(): BlendRowState {
  return {
    rawMaterialId: "",
    freeTextName: "",
    sharePercent: "",
  };
}

function createDefaultFormula(code: string): FormulaState {
  return {
    code,
    name: "",
    teaType: "",
    teaGramsPerLiter: "",
    sugarGramsPerLiter: "",
    yeastPitchRatePercent: "",
    brewWaterPercent: "",
    durationDays: "",
    phMin: "",
    phMax: "",
    brixTarget: "",
    ttaTarget: "",
    temperatureMin: "",
    temperatureMax: "",
    blendItems: [createEmptyBlendRow(), createEmptyBlendRow(), createEmptyBlendRow()],
  };
}

function mapFormulaToState(formula: ProductionFormulaView): FormulaState {
  return {
    code: normalizeCode(formula.code),
    name: formula.name || "",
    teaType: formula.teaType || "",
    teaGramsPerLiter: formula.teaGramsPerLiter != null ? String(formula.teaGramsPerLiter) : "",
    sugarGramsPerLiter: formula.sugarGramsPerLiter != null ? String(formula.sugarGramsPerLiter) : "",
    yeastPitchRatePercent: formula.yeastPitchRatePercent != null ? String(formula.yeastPitchRatePercent) : "",
    brewWaterPercent: formula.brewWaterPercent != null ? String(formula.brewWaterPercent) : "",
    durationDays: formula.durationDays ? String(formula.durationDays) : "",
    phMin: String(formula.phMin ?? ""),
    phMax: String(formula.phMax ?? ""),
    brixTarget: String(formula.brixMax ?? ""),
    ttaTarget: String(formula.acidityMax ?? ""),
    temperatureMin: String(formula.temperatureMin ?? ""),
    temperatureMax: String(formula.temperatureMax ?? ""),
    blendItems:
      formula.blendItems.length > 0
        ? formula.blendItems.map((item) => ({
            rawMaterialId: item.rawMaterialId || "",
            freeTextName: item.freeTextName || "",
            sharePercent: item.sharePercent ? String(item.sharePercent) : "",
          }))
        : [createEmptyBlendRow(), createEmptyBlendRow(), createEmptyBlendRow()],
    updatedAt: formula.updatedAt || null,
    updatedByEmail: formula.updatedByEmail || null,
  };
}

function buildInitialState(formulas: ProductionFormulaView[]) {
  const entries = formulas
    .map((formula) => [normalizeCode(formula.code), mapFormulaToState(formula)] as const)
    .sort((a, b) => a[1].name.localeCompare(b[1].name, "es-MX", { sensitivity: "base" }));

  return {
    forms: Object.fromEntries(entries),
    order: entries.map(([code]) => code),
  };
}

function getNextFormulaCode(existingCodes: string[]) {
  const normalized = new Set(existingCodes.map((code) => normalizeCode(code)));
  let counter = 1;
  while (normalized.has(`F${counter}`)) counter += 1;
  return `F${counter}`;
}

function Field({ label, helper, children }: { label: string; helper?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
      {children}
      {helper ? <span className="mt-1 block text-xs text-slate-400">{helper}</span> : null}
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
  const [desiredLiters, setDesiredLiters] = useState<Record<string, string>>({});

  const currentFormula = selectedCode ? forms[selectedCode] : undefined;
  const isEditing = editingCode === selectedCode;

  const rawMaterialMap = useMemo(() => new Map(rawMaterials.map((item) => [item.id, item])), [rawMaterials]);

  const updateFormula = (code: string, updater: (current: FormulaState) => FormulaState) => {
    setForms((prev) => {
      const current = prev[code] ?? createDefaultFormula(code);
      return { ...prev, [code]: updater(current) };
    });
  };

  const formulaCodes = order.length > 0 ? order : Object.keys(forms);

  const addFormula = () => {
    const code = getNextFormulaCode(Object.keys(forms));
    setForms((prev) => ({ ...prev, [code]: createDefaultFormula(code) }));
    setOrder((prev) => [...prev, code]);
    setSelectedCode(code);
    setEditingCode(code);
    setMessage((prev) => ({ ...prev, [code]: "" }));
    setDesiredLiters((prev) => ({ ...prev, [code]: "20" }));
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
    if (!selectedCode || !currentFormula) return;
    if (!window.confirm("¿Deseas guardar esta fórmula?")) return;

    setSavingCode(selectedCode);
    setMessage((prev) => ({ ...prev, [selectedCode]: "" }));

    const blendItems = currentFormula.blendItems
      .map((item) => ({
        rawMaterialId: item.rawMaterialId || null,
        freeTextName: item.freeTextName.trim(),
        sharePercent: Number(item.sharePercent || 0),
      }))
      .filter((item) => (item.rawMaterialId || item.freeTextName) && item.sharePercent > 0);

    const res = await saveProductionFormula({
      code: currentFormula.code,
      name: currentFormula.name.trim(),
      teaType: currentFormula.teaType.trim(),
      teaGramsPerLiter: Number(currentFormula.teaGramsPerLiter),
      sugarGramsPerLiter: Number(currentFormula.sugarGramsPerLiter || 0),
      yeastPitchRatePercent: Number(currentFormula.yeastPitchRatePercent || 0),
      brewWaterPercent: Number(currentFormula.brewWaterPercent),
      durationDays: Number(currentFormula.durationDays),
      phMin: Number(currentFormula.phMin),
      phMax: Number(currentFormula.phMax),
      brixTarget: Number(currentFormula.brixTarget),
      ttaTarget: Number(currentFormula.ttaTarget),
      temperatureMin: Number(currentFormula.temperatureMin),
      temperatureMax: Number(currentFormula.temperatureMax),
      blendItems,
    });

    setSavingCode(null);
    setMessage((prev) => ({
      ...prev,
      [selectedCode]: res.success ? "Fórmula guardada" : res.error || "No se pudo guardar",
    }));

    if (res.success) {
      setEditingCode(null);
      startTransition(() => router.refresh());
    }
  };

  const litersToCalculate = Number(desiredLiters[selectedCode] || "20") || 20;
  const teaGramsPerLiter = Number(currentFormula?.teaGramsPerLiter || 0);
  const sugarGramsPerLiter = Number(currentFormula?.sugarGramsPerLiter || 0);
  const brewWaterPercent = Number(currentFormula?.brewWaterPercent || 0);
  const yeastPitchRatePercent = Number(currentFormula?.yeastPitchRatePercent || 0);
  const totalTea = teaGramsPerLiter * litersToCalculate;
  const totalSugar = sugarGramsPerLiter * litersToCalculate;
  const hotWater = litersToCalculate * (brewWaterPercent / 100);
  const coldWater = Math.max(0, litersToCalculate - hotWater);
  const starterLiters = litersToCalculate * (yeastPitchRatePercent / 100);
  const totalShare = (currentFormula?.blendItems || []).reduce((sum, item) => sum + Number(item.sharePercent || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" onClick={addFormula} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
          Nueva fórmula
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-slate-950">Fórmulas guardadas</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{formulaCodes.length}</span>
          </div>

          <div className="mt-4 space-y-3">
            {formulaCodes.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Aún no hay fórmulas. Crea la primera.</p>
            ) : (
              formulaCodes.map((code) => {
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
                    <p className={`text-xs font-black uppercase tracking-[0.25em] ${active ? "text-white/65" : "text-slate-400"}`}>Fórmula</p>
                    <h4 className="mt-2 text-lg font-black">{formula?.name?.trim() || "Sin nombre"}</h4>
                    <p className={`mt-2 text-xs ${active ? "text-white/75" : "text-slate-500"}`}>
                      {formula?.teaType?.trim() || "Sin tipo de té"} · {formula?.durationDays || "0"} días
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          {!currentFormula ? (
            <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-lg font-black text-slate-900">No hay ninguna fórmula seleccionada</p>
            </div>
          ) : !isEditing ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Receta por litro</p>
                  <h3 className="mt-2 text-3xl font-black text-slate-950">{currentFormula.name || "Nueva fórmula"}</h3>
                  <p className="mt-2 text-sm text-slate-500">{currentFormula.teaType || "Sin tipo de té definido"}</p>
                </div>
                <button type="button" onClick={startEdit} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                  Editar
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <InfoCard label="Té por litro" value={`${formatNumber(Number(currentFormula.teaGramsPerLiter || 0))} g/L`} />
                <InfoCard label="Azúcar por litro" value={`${formatNumber(Number(currentFormula.sugarGramsPerLiter || 0))} g/L`} />
                <InfoCard label="Fermentación" value={`${formatNumber(Number(currentFormula.durationDays || 0), 0)} días`} />
                <InfoCard label="Cultivo inicial" value={`${formatNumber(Number(currentFormula.yeastPitchRatePercent || 0))}%`} />
                <InfoCard label="Agua de cocción" value={`${formatNumber(Number(currentFormula.brewWaterPercent || 0))}%`} />
                <InfoCard label="Agua fría" value={`${formatNumber(Math.max(0, 100 - Number(currentFormula.brewWaterPercent || 0)))}%`} />
                <InfoCard label="Target pH min" value={formatNumber(Number(currentFormula.phMin || 0))} />
                <InfoCard label="Target pH max" value={formatNumber(Number(currentFormula.phMax || 0))} />
                <InfoCard label="Target Brix" value={formatNumber(Number(currentFormula.brixTarget || 0))} />
                <InfoCard label="Target TTA" value={formatNumber(Number(currentFormula.ttaTarget || 0))} />
                <InfoCard label="Temp min °C" value={formatNumber(Number(currentFormula.temperatureMin || 0))} />
                <InfoCard label="Temp max °C" value={formatNumber(Number(currentFormula.temperatureMax || 0))} />
              </div>

              <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Calculadora</p>
                    <h4 className="mt-2 text-xl font-black text-slate-950">¿Qué se necesita para producir?</h4>
                    <p className="mt-1 text-sm text-slate-500">Cambia los litros y te calculamos el requerimiento exacto con base en esta receta.</p>
                  </div>
                  <Field label="Litros deseados">
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      value={desiredLiters[selectedCode] || "20"}
                      onChange={(event) => setDesiredLiters((prev) => ({ ...prev, [selectedCode]: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 lg:w-52"
                    />
                  </Field>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <CalcCard label="Té total" value={`${formatNumber(totalTea)} g`} />
                  <CalcCard label="Azúcar total" value={`${formatNumber(totalSugar)} g`} />
                  <CalcCard label="Agua de cocción" value={`${formatNumber(hotWater)} L`} />
                  <CalcCard label="Agua fría" value={`${formatNumber(coldWater)} L`} />
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-black text-slate-950">Cultivo inicial</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatNumber(starterLiters)} L equivalentes al {formatNumber(yeastPitchRatePercent)}% del lote.
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-950">Blend de té</p>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${Math.abs(totalShare - 100) < 0.01 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {formatNumber(totalShare)}%
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {currentFormula.blendItems.filter((item) => item.rawMaterialId || item.freeTextName || item.sharePercent).length === 0 ? (
                      <p className="text-sm text-slate-400">Aún no hay componentes de blend registrados.</p>
                    ) : (
                      currentFormula.blendItems
                        .filter((item) => item.rawMaterialId || item.freeTextName || item.sharePercent)
                        .map((item, index) => {
                          const name =
                            (item.rawMaterialId ? rawMaterialMap.get(item.rawMaterialId)?.name : "") ||
                            item.freeTextName ||
                            `Componente ${index + 1}`;
                          const share = Number(item.sharePercent || 0);
                          const grams = totalTea * (share / 100);
                          return (
                            <div key={`${selectedCode}-calc-${index}`} className="flex flex-col justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center">
                              <div>
                                <p className="font-semibold text-slate-900">{name}</p>
                                <p className="text-xs text-slate-500">{formatNumber(share)}% del total de té</p>
                              </div>
                              <p className="text-sm font-black text-slate-950">{formatNumber(grams)} g</p>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                {currentFormula.updatedAt
                  ? `Última edición: ${formatDateTime(currentFormula.updatedAt)}${currentFormula.updatedByEmail ? ` · ${currentFormula.updatedByEmail}` : ""}`
                  : "Aún no se ha guardado esta fórmula"}
              </div>

              {message[selectedCode] ? <p className="text-sm font-semibold text-slate-700">{message[selectedCode]}</p> : null}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Nueva receta</p>
                  <h3 className="mt-2 text-3xl font-black text-slate-950">{currentFormula.name || "Nueva fórmula"}</h3>
                  <p className="mt-2 text-sm text-slate-500">La receta se guarda por litro para poder escalar después a cualquier lote.</p>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={cancelEdit} className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                    Cancelar
                  </button>
                  <button type="button" onClick={saveFormula} disabled={savingCode === selectedCode} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300">
                    {savingCode === selectedCode ? "Guardando..." : "Guardar fórmula"}
                  </button>
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Field label="Nombre">
                      <input
                        value={currentFormula.name}
                        onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, name: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                        placeholder="Ej. Té verde base"
                      />
                    </Field>
                  </div>

                  <Field label="Tipo de té">
                    <input
                      value={currentFormula.teaType}
                      onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, teaType: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      placeholder="Ej. Sencha, Keemun, Té verde"
                    />
                  </Field>

                  <Field label="Té g/L">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentFormula.teaGramsPerLiter}
                      onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, teaGramsPerLiter: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Azúcar g/L">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentFormula.sugarGramsPerLiter}
                      onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, sugarGramsPerLiter: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Cultivo inicial %">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentFormula.yeastPitchRatePercent}
                      onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, yeastPitchRatePercent: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Agua de cocción %" helper="El resto se entiende como agua fría.">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={currentFormula.brewWaterPercent}
                      onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, brewWaterPercent: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Meta de fermentación (días)">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={currentFormula.durationDays}
                      onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, durationDays: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Target pH min">
                    <input
                      type="number"
                      step="0.01"
                      value={currentFormula.phMin}
                      onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, phMin: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Target pH max">
                    <input
                      type="number"
                      step="0.01"
                      value={currentFormula.phMax}
                      onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, phMax: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Target Brix">
                    <input
                      type="number"
                      step="0.01"
                      value={currentFormula.brixTarget}
                      onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, brixTarget: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Target TTA (% g/100mL)">
                    <input
                      type="number"
                      step="0.01"
                      value={currentFormula.ttaTarget}
                      onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, ttaTarget: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Target temp min °C">
                    <input
                      type="number"
                      step="0.01"
                      value={currentFormula.temperatureMin}
                      onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, temperatureMin: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Target temp max °C">
                    <input
                      type="number"
                      step="0.01"
                      value={currentFormula.temperatureMax}
                      onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, temperatureMax: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </Field>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">Blend de té (opcional)</p>
                      <p className="mt-1 text-sm text-slate-500">Selecciona del inventario o escribe el nombre libre y define el porcentaje de participación.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateFormula(selectedCode, (current) => ({
                          ...current,
                          blendItems: [...current.blendItems, createEmptyBlendRow()],
                        }))
                      }
                      className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                    >
                      Agregar ingrediente
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {currentFormula.blendItems.map((item, index) => (
                      <div key={`${selectedCode}-blend-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.2fr_1fr_140px_auto]">
                        <Field label="Ingrediente">
                          <select
                            value={item.rawMaterialId}
                            onChange={(event) =>
                              updateFormula(selectedCode, (current) => ({
                                ...current,
                                blendItems: current.blendItems.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, rawMaterialId: event.target.value } : entry,
                                ),
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                          >
                            <option value="">Selecciona del inventario</option>
                            {rawMaterials.map((material) => (
                              <option key={material.id} value={material.id}>
                                {material.name}
                                {material.unit ? ` (${material.unit})` : ""}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field label="Texto libre">
                          <input
                            value={item.freeTextName}
                            onChange={(event) =>
                              updateFormula(selectedCode, (current) => ({
                                ...current,
                                blendItems: current.blendItems.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, freeTextName: event.target.value } : entry,
                                ),
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                            placeholder="Si no está en inventario"
                          />
                        </Field>

                        <Field label="Participación %">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.sharePercent}
                            onChange={(event) =>
                              updateFormula(selectedCode, (current) => ({
                                ...current,
                                blendItems: current.blendItems.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, sharePercent: event.target.value } : entry,
                                ),
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                          />
                        </Field>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() =>
                              updateFormula(selectedCode, (current) => ({
                                ...current,
                                blendItems:
                                  current.blendItems.length > 1
                                    ? current.blendItems.filter((_, entryIndex) => entryIndex !== index)
                                    : [createEmptyBlendRow()],
                              }))
                            }
                            className="rounded-full bg-rose-50 px-4 py-3 text-xs font-black text-rose-700 hover:bg-rose-100"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {message[selectedCode] ? (
                <p className={`text-sm font-semibold ${message[selectedCode].toLowerCase().includes("guardada") ? "text-emerald-600" : "text-rose-600"}`}>
                  {message[selectedCode]}
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-base font-bold text-slate-950">{value}</p>
    </div>
  );
}

function CalcCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
