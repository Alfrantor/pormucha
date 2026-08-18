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

type AcidifierBlendRow = {
  rawMaterialId: string;
  freeTextName: string;
  sharePercent: string;
};

type FlavorIngredientRow = {
  rawMaterialId: string;
  freeTextName: string;
  amountPerLiter: string;
  unit: string;
  detail: string;
};

type FormulaState = {
  code: string;
  recipeType: "ACIDIFIER" | "FLAVOR";
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
  blendItems: AcidifierBlendRow[];
  flavorJuicePercent: string;
  flavorItemName: string;
  co2GramsPerLiter: string;
  carbonationMethod: string;
  f2ConditionDays: string;
  flavorIngredients: FlavorIngredientRow[];
  updatedAt?: string | null;
  updatedByEmail?: string | null;
};

const UNIT_OPTIONS = ["g", "kg", "ml", "L", "%", "piezas"];

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
  return new Date(value).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

function createEmptyBlendRow(): AcidifierBlendRow {
  return { rawMaterialId: "", freeTextName: "", sharePercent: "" };
}

function createEmptyFlavorRow(): FlavorIngredientRow {
  return { rawMaterialId: "", freeTextName: "", amountPerLiter: "", unit: "g", detail: "" };
}

function createDefaultFormula(code: string): FormulaState {
  return {
    code,
    recipeType: "ACIDIFIER",
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
    flavorJuicePercent: "",
    flavorItemName: "",
    co2GramsPerLiter: "",
    carbonationMethod: "Forced (in tank)",
    f2ConditionDays: "",
    flavorIngredients: [createEmptyFlavorRow(), createEmptyFlavorRow(), createEmptyFlavorRow()],
  };
}

function mapFormulaToState(formula: ProductionFormulaView): FormulaState {
  return {
    code: normalizeCode(formula.code),
    recipeType: formula.recipeType === "FLAVOR" ? "FLAVOR" : "ACIDIFIER",
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
    flavorJuicePercent: formula.flavorJuicePercent != null ? String(formula.flavorJuicePercent) : "",
    flavorItemName: formula.flavorItemName || "",
    co2GramsPerLiter: formula.co2GramsPerLiter != null ? String(formula.co2GramsPerLiter) : "",
    carbonationMethod: formula.carbonationMethod || "Forced (in tank)",
    f2ConditionDays: formula.f2ConditionDays != null ? String(formula.f2ConditionDays) : "",
    flavorIngredients:
      formula.flavorIngredients.length > 0
        ? formula.flavorIngredients.map((item) => ({
            rawMaterialId: item.rawMaterialId || "",
            freeTextName: item.freeTextName || "",
            amountPerLiter: item.quantity != null ? String(item.quantity) : "",
            unit: item.unitOverride || item.rawMaterialUnit || "g",
            detail: typeof item.notes === "string" && item.notes.startsWith("FLAVOR_INGREDIENT|") ? item.notes.split("|")[1] || "" : "",
          }))
        : [createEmptyFlavorRow(), createEmptyFlavorRow(), createEmptyFlavorRow()],
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
  const formulaCodes = order.length > 0 ? order : Object.keys(forms);

  const updateFormula = (code: string, updater: (current: FormulaState) => FormulaState) => {
    setForms((prev) => {
      const current = prev[code] ?? createDefaultFormula(code);
      return { ...prev, [code]: updater(current) };
    });
  };

  const addFormula = () => {
    const code = getNextFormulaCode(Object.keys(forms));
    setForms((prev) => ({ ...prev, [code]: createDefaultFormula(code) }));
    setOrder((prev) => [...prev, code]);
    setSelectedCode(code);
    setEditingCode(code);
    setMessage((prev) => ({ ...prev, [code]: "" }));
    setDesiredLiters((prev) => ({ ...prev, [code]: "20" }));
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
    if (!window.confirm("¿Deseas guardar esta receta?")) return;

    setSavingCode(selectedCode);
    setMessage((prev) => ({ ...prev, [selectedCode]: "" }));

    const result = await saveProductionFormula({
      code: currentFormula.code,
      recipeType: currentFormula.recipeType,
      name: currentFormula.name.trim(),
      teaType: currentFormula.teaType.trim(),
      teaGramsPerLiter: Number(currentFormula.teaGramsPerLiter),
      sugarGramsPerLiter: Number(currentFormula.sugarGramsPerLiter || 0),
      yeastPitchRatePercent: Number(currentFormula.yeastPitchRatePercent || 0),
      brewWaterPercent: Number(currentFormula.brewWaterPercent || 0),
      durationDays: Number(currentFormula.durationDays || 0),
      phMin: Number(currentFormula.phMin || 0),
      phMax: Number(currentFormula.phMax || 0),
      brixTarget: Number(currentFormula.brixTarget || 0),
      ttaTarget: Number(currentFormula.ttaTarget || 0),
      temperatureMin: Number(currentFormula.temperatureMin || 0),
      temperatureMax: Number(currentFormula.temperatureMax || 0),
      blendItems: currentFormula.blendItems.map((item) => ({
        rawMaterialId: item.rawMaterialId || null,
        freeTextName: item.freeTextName.trim(),
        sharePercent: Number(item.sharePercent || 0),
      })),
      flavorJuicePercent: Number(currentFormula.flavorJuicePercent || 0),
      flavorItemName: currentFormula.flavorItemName.trim(),
      co2GramsPerLiter: Number(currentFormula.co2GramsPerLiter || 0),
      carbonationMethod: currentFormula.carbonationMethod,
      f2ConditionDays: Number(currentFormula.f2ConditionDays || 0),
      flavorIngredients: currentFormula.flavorIngredients.map((item) => ({
        rawMaterialId: item.rawMaterialId || null,
        freeTextName: item.freeTextName.trim(),
        amountPerLiter: Number(item.amountPerLiter || 0),
        unit: item.unit,
        detail: item.detail.trim(),
      })),
    });

    setSavingCode(null);
    setMessage((prev) => ({
      ...prev,
      [selectedCode]: result.success ? "Receta guardada" : result.error || "No se pudo guardar",
    }));

    if (result.success) {
      setEditingCode(null);
      startTransition(() => router.refresh());
    }
  };

  const litersToCalculate = Number(desiredLiters[selectedCode] || "20") || 20;
  const totalTea = Number(currentFormula?.teaGramsPerLiter || 0) * litersToCalculate;
  const totalSugar = Number(currentFormula?.sugarGramsPerLiter || 0) * litersToCalculate;
  const hotWater = litersToCalculate * (Number(currentFormula?.brewWaterPercent || 0) / 100);
  const coldWater = Math.max(0, litersToCalculate - hotWater);
  const starterLiters = litersToCalculate * (Number(currentFormula?.yeastPitchRatePercent || 0) / 100);
  const totalShare = (currentFormula?.blendItems || []).reduce((sum, item) => sum + Number(item.sharePercent || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" onClick={addFormula} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
          Nueva receta
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-slate-950">Recetas guardadas</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{formulaCodes.length}</span>
          </div>
          <div className="mt-4 space-y-3">
            {formulaCodes.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Aún no hay recetas. Crea la primera.</p>
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
                    <p className={`text-xs font-black uppercase tracking-[0.25em] ${active ? "text-white/65" : "text-slate-400"}`}>
                      {formula.recipeType === "FLAVOR" ? "Sabor" : "Acidificante"}
                    </p>
                    <h4 className="mt-2 text-lg font-black">{formula.name || "Sin nombre"}</h4>
                    <p className={`mt-2 text-xs ${active ? "text-white/75" : "text-slate-500"}`}>
                      {formula.recipeType === "FLAVOR"
                        ? `${formula.f2ConditionDays || "0"} días F2`
                        : `${formula.teaType || "Sin té"} · ${formula.durationDays || "0"} días`}
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
              <p className="text-lg font-black text-slate-900">No hay ninguna receta seleccionada</p>
            </div>
          ) : !isEditing ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
                    {currentFormula.recipeType === "FLAVOR" ? "Receta de sabor" : "Receta acidificante"}
                  </p>
                  <h3 className="mt-2 text-3xl font-black text-slate-950">{currentFormula.name || "Nueva receta"}</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {currentFormula.recipeType === "FLAVOR"
                      ? currentFormula.flavorItemName || "Sabor sin item principal definido"
                      : currentFormula.teaType || "Sin tipo de té definido"}
                  </p>
                </div>
                <button type="button" onClick={() => setEditingCode(selectedCode)} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                  Editar
                </button>
              </div>

              {currentFormula.recipeType === "FLAVOR" ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <InfoCard label="Flavour juice %" value={`${formatNumber(Number(currentFormula.flavorJuicePercent || 0))}%`} />
                    <InfoCard label="CO₂ (g/L)" value={`${formatNumber(Number(currentFormula.co2GramsPerLiter || 0))} g/L`} />
                    <InfoCard label="Carbonatación" value={currentFormula.carbonationMethod || "-"} />
                    <InfoCard label="F2 condition target" value={`${formatNumber(Number(currentFormula.f2ConditionDays || 0), 0)} días`} />
                    <InfoCard label="Ingredientes F2" value={`${currentFormula.flavorIngredients.filter((item) => item.rawMaterialId || item.freeTextName).length}`} />
                    <InfoCard label="Calculadora" value={`${formatNumber(litersToCalculate, 0)} L`} />
                  </div>

                  <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Calculadora F2</p>
                        <h4 className="mt-2 text-xl font-black text-slate-950">Requerimientos por volumen</h4>
                      </div>
                      <Field label="Litros deseados">
                        <input
                          type="number"
                          min="1"
                          step="0.1"
                          value={desiredLiters[selectedCode] || "20"}
                          onChange={(event) => setDesiredLiters((prev) => ({ ...prev, [selectedCode]: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 lg:w-52"
                        />
                      </Field>
                    </div>
                    <div className="mt-4 space-y-2">
                      {currentFormula.flavorIngredients.filter((item) => item.rawMaterialId || item.freeTextName).length === 0 ? (
                        <p className="text-sm text-slate-400">No hay ingredientes de sabor cargados.</p>
                      ) : (
                        currentFormula.flavorIngredients
                          .filter((item) => item.rawMaterialId || item.freeTextName)
                          .map((item, index) => {
                            const name = (item.rawMaterialId ? rawMaterialMap.get(item.rawMaterialId)?.name : "") || item.freeTextName || `Ingrediente ${index + 1}`;
                            const total = Number(item.amountPerLiter || 0) * litersToCalculate;
                            return (
                              <div key={`${selectedCode}-flavor-view-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
                                <div>
                                  <p className="font-semibold text-slate-900">{name}</p>
                                  <p className="text-xs text-slate-500">{item.detail || "Sin detalle"}</p>
                                </div>
                                <p className="font-black text-slate-950">
                                  {formatNumber(total)} {item.unit || "g"}
                                </p>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                      </div>
                      <Field label="Litros deseados">
                        <input
                          type="number"
                          min="1"
                          step="0.1"
                          value={desiredLiters[selectedCode] || "20"}
                          onChange={(event) => setDesiredLiters((prev) => ({ ...prev, [selectedCode]: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 lg:w-52"
                        />
                      </Field>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <CalcCard label="Té total" value={`${formatNumber(totalTea)} g`} />
                      <CalcCard label="Azúcar total" value={`${formatNumber(totalSugar)} g`} />
                      <CalcCard label="Agua caliente" value={`${formatNumber(hotWater)} L`} />
                      <CalcCard label="Agua fría" value={`${formatNumber(coldWater)} L`} />
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-black text-slate-950">Cultivo inicial</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatNumber(starterLiters)} L equivalentes al {formatNumber(Number(currentFormula.yeastPitchRatePercent || 0))}% del lote.
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
                              const name = (item.rawMaterialId ? rawMaterialMap.get(item.rawMaterialId)?.name : "") || item.freeTextName || `Componente ${index + 1}`;
                              const share = Number(item.sharePercent || 0);
                              const grams = totalTea * (share / 100);
                              return (
                                <div key={`${selectedCode}-calc-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                                  <div>
                                    <p className="font-semibold text-slate-900">{name}</p>
                                    <p className="text-xs text-slate-500">{formatNumber(share)}% del total de té</p>
                                  </div>
                                  <p className="font-black text-slate-950">{formatNumber(grams)} g</p>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                {currentFormula.updatedAt
                  ? `Última edición: ${formatDateTime(currentFormula.updatedAt)}${currentFormula.updatedByEmail ? ` · ${currentFormula.updatedByEmail}` : ""}`
                  : "Aún no se ha guardado esta receta"}
              </div>

              {message[selectedCode] ? <p className="text-sm font-semibold text-slate-700">{message[selectedCode]}</p> : null}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Nueva receta</p>
                  <h3 className="mt-2 text-3xl font-black text-slate-950">{currentFormula.name || "Nueva receta"}</h3>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={cancelEdit} className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                    Cancelar
                  </button>
                  <button type="button" onClick={saveFormula} disabled={savingCode === selectedCode} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300">
                    {savingCode === selectedCode ? "Guardando..." : "Guardar receta"}
                  </button>
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Field label="Nombre">
                      <input value={currentFormula.name} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, name: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900" />
                    </Field>
                  </div>

                  <Field label="Tipo de receta">
                    <select
                      value={currentFormula.recipeType}
                      onChange={(event) =>
                        updateFormula(selectedCode, (current) => ({
                          ...current,
                          recipeType: event.target.value === "FLAVOR" ? "FLAVOR" : "ACIDIFIER",
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                    >
                      <option value="ACIDIFIER">Acidificante</option>
                      <option value="FLAVOR">Sabor</option>
                    </select>
                  </Field>

                  <Field label="Código">
                    <input value={currentFormula.code} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, code: normalizeCode(event.target.value) }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900" />
                  </Field>
                </div>

                {currentFormula.recipeType === "FLAVOR" ? (
                  <div className="mt-6 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Porcentaje de jugo/sabor">
                        <input type="number" step="0.01" value={currentFormula.flavorJuicePercent} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, flavorJuicePercent: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Fruta o jugo base">
                        <input value={currentFormula.flavorItemName} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, flavorItemName: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="CO₂ (g/L)">
                        <input type="number" step="0.01" value={currentFormula.co2GramsPerLiter} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, co2GramsPerLiter: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Carbonatación">
                        <select value={currentFormula.carbonationMethod} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, carbonationMethod: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                          <option>Forced (in tank)</option>
                          <option>Natural</option>
                          <option>Mixta</option>
                        </select>
                      </Field>
                      <Field label="Objetivo F2 (días)">
                        <input type="number" step="1" min="0" value={currentFormula.f2ConditionDays} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, f2ConditionDays: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Target pH min">
                        <input type="number" step="0.01" value={currentFormula.phMin} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, phMin: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Target pH max">
                        <input type="number" step="0.01" value={currentFormula.phMax} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, phMax: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Target Brix">
                        <input type="number" step="0.01" value={currentFormula.brixTarget} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, brixTarget: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Target TTA (% g/100mL)">
                        <input type="number" step="0.01" value={currentFormula.ttaTarget} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, ttaTarget: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Target temp min °C">
                        <input type="number" step="0.01" value={currentFormula.temperatureMin} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, temperatureMin: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Target temp max °C">
                        <input type="number" step="0.01" value={currentFormula.temperatureMax} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, temperatureMax: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                    </div>

                    <div className="border-t border-slate-200 pt-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-950">Ingredientes de sabor F2</p>
                          <p className="mt-1 text-sm text-slate-500">Ingredientes que se agregan por litro cuando la base pasa a F2.</p>
                        </div>
                        <button type="button" onClick={() => updateFormula(selectedCode, (current) => ({ ...current, flavorIngredients: [...current.flavorIngredients, createEmptyFlavorRow()] }))} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800">
                          Agregar ingrediente
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {currentFormula.flavorIngredients.map((item, index) => (
                          <div key={`${selectedCode}-flavor-edit-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.1fr_1fr_140px_140px_auto]">
                            <Field label="Ingrediente">
                              <select value={item.rawMaterialId} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, flavorIngredients: current.flavorIngredients.map((entry, entryIndex) => entryIndex === index ? { ...entry, rawMaterialId: event.target.value } : entry) }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
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
                              <input value={item.freeTextName} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, flavorIngredients: current.flavorIngredients.map((entry, entryIndex) => entryIndex === index ? { ...entry, freeTextName: event.target.value } : entry) }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
                            </Field>
                            <Field label="Cantidad / L">
                              <input type="number" step="0.01" value={item.amountPerLiter} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, flavorIngredients: current.flavorIngredients.map((entry, entryIndex) => entryIndex === index ? { ...entry, amountPerLiter: event.target.value } : entry) }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
                            </Field>
                            <Field label="Unidad">
                              <select value={item.unit} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, flavorIngredients: current.flavorIngredients.map((entry, entryIndex) => entryIndex === index ? { ...entry, unit: event.target.value } : entry) }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                                {UNIT_OPTIONS.map((unit) => (
                                  <option key={unit} value={unit}>{unit}</option>
                                ))}
                              </select>
                            </Field>
                            <div className="flex items-end">
                              <button type="button" onClick={() => updateFormula(selectedCode, (current) => ({ ...current, flavorIngredients: current.flavorIngredients.length > 1 ? current.flavorIngredients.filter((_, entryIndex) => entryIndex !== index) : [createEmptyFlavorRow()] }))} className="rounded-full bg-rose-50 px-4 py-3 text-xs font-black text-rose-700 hover:bg-rose-100">
                                Quitar
                              </button>
                            </div>
                            <div className="md:col-span-5">
                              <Field label="Detalle (opcional)">
                                <input value={item.detail} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, flavorIngredients: current.flavorIngredients.map((entry, entryIndex) => entryIndex === index ? { ...entry, detail: event.target.value } : entry) }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
                              </Field>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Tipo de té">
                        <input value={currentFormula.teaType} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, teaType: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Té g/L">
                        <input type="number" step="0.01" value={currentFormula.teaGramsPerLiter} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, teaGramsPerLiter: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Azúcar g/L">
                        <input type="number" step="0.01" value={currentFormula.sugarGramsPerLiter} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, sugarGramsPerLiter: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Cultivo inicial %">
                        <input type="number" step="0.01" value={currentFormula.yeastPitchRatePercent} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, yeastPitchRatePercent: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Agua de cocción %" helper="El resto se entiende como agua fría.">
                        <input type="number" step="0.01" value={currentFormula.brewWaterPercent} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, brewWaterPercent: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Meta de fermentación (días)">
                        <input type="number" step="1" min="1" value={currentFormula.durationDays} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, durationDays: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Target pH min">
                        <input type="number" step="0.01" value={currentFormula.phMin} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, phMin: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Target pH max">
                        <input type="number" step="0.01" value={currentFormula.phMax} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, phMax: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Target Brix">
                        <input type="number" step="0.01" value={currentFormula.brixTarget} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, brixTarget: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Target TTA (% g/100mL)">
                        <input type="number" step="0.01" value={currentFormula.ttaTarget} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, ttaTarget: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Target temp min °C">
                        <input type="number" step="0.01" value={currentFormula.temperatureMin} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, temperatureMin: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                      <Field label="Target temp max °C">
                        <input type="number" step="0.01" value={currentFormula.temperatureMax} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, temperatureMax: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                      </Field>
                    </div>

                    <div className="border-t border-slate-200 pt-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-950">Blend de té</p>
                          <p className="mt-1 text-sm text-slate-500">Selecciona del inventario o escribe el nombre libre y define el porcentaje de participación.</p>
                        </div>
                        <button type="button" onClick={() => updateFormula(selectedCode, (current) => ({ ...current, blendItems: [...current.blendItems, createEmptyBlendRow()] }))} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800">
                          Agregar ingrediente
                        </button>
                      </div>
                      <div className="mt-4 space-y-3">
                        {currentFormula.blendItems.map((item, index) => (
                          <div key={`${selectedCode}-blend-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.2fr_1fr_140px_auto]">
                            <Field label="Ingrediente">
                              <select value={item.rawMaterialId} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, blendItems: current.blendItems.map((entry, entryIndex) => entryIndex === index ? { ...entry, rawMaterialId: event.target.value } : entry) }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
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
                              <input value={item.freeTextName} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, blendItems: current.blendItems.map((entry, entryIndex) => entryIndex === index ? { ...entry, freeTextName: event.target.value } : entry) }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
                            </Field>
                            <Field label="Participación %">
                              <input type="number" min="0" max="100" step="0.01" value={item.sharePercent} onChange={(event) => updateFormula(selectedCode, (current) => ({ ...current, blendItems: current.blendItems.map((entry, entryIndex) => entryIndex === index ? { ...entry, sharePercent: event.target.value } : entry) }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
                            </Field>
                            <div className="flex items-end">
                              <button type="button" onClick={() => updateFormula(selectedCode, (current) => ({ ...current, blendItems: current.blendItems.length > 1 ? current.blendItems.filter((_, entryIndex) => entryIndex !== index) : [createEmptyBlendRow()] }))} className="rounded-full bg-rose-50 px-4 py-3 text-xs font-black text-rose-700 hover:bg-rose-100">
                                Quitar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {message[selectedCode] ? (
                <p className={`text-sm font-semibold ${message[selectedCode].toLowerCase().includes("guard") ? "text-emerald-600" : "text-rose-600"}`}>
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
