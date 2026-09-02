"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ProductionFormulasManager from "@/components/admin/ProductionFormulasManager";
import { archiveProductionFormula } from "@/app/_actions/production-formulas";
import type { ProductionFormulaView } from "@/lib/production-profiles";

type RecipeFilter = "ALL" | "ACIDIFIER" | "SCOOBY" | "FLAVOR" | "BLEND";

export default function ProductionFormulasCatalog({
  formulas,
  rawMaterials,
}: {
  formulas: ProductionFormulaView[];
  rawMaterials: { id: string; name: string; unit?: string | null }[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<RecipeFilter>("ALL");
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [modalKey, setModalKey] = useState(0);
  const [createRecipeType, setCreateRecipeType] = useState<"ACIDIFIER" | "SCOOBY" | "FLAVOR" | "BLEND">("ACIDIFIER");

  const safeFormulas = useMemo(() => (Array.isArray(formulas) ? formulas : []), [formulas]);

  const filteredFormulas = useMemo(() => {
    return safeFormulas
      .filter((formula) => (filter === "ALL" ? true : (formula.recipeType || "ACIDIFIER") === filter))
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return String(a.name || "").localeCompare(String(b.name || ""), "es-MX", { sensitivity: "base" });
      });
  }, [safeFormulas, filter]);

  const selectedVisibleCode = useMemo(() => {
    if (filteredFormulas.length === 0) return "";
    if (selectedCode && filteredFormulas.some((formula) => formula.code === selectedCode)) {
      return selectedCode;
    }
    return filteredFormulas[0]?.code || "";
  }, [filteredFormulas, selectedCode]);

  const selectedFormula = useMemo(
    () => filteredFormulas.find((formula) => formula.code === selectedVisibleCode) || filteredFormulas[0] || null,
    [filteredFormulas, selectedVisibleCode],
  );

  const openCreate = (recipeType: "ACIDIFIER" | "SCOOBY" | "FLAVOR" | "BLEND" = "ACIDIFIER") => {
    setSelectedCode("");
    setCreateRecipeType(recipeType);
    setFilter(recipeType);
    setModalMode("create");
    setModalKey((current) => current + 1);
  };

  const openCreateBlend = () => {
    openCreate("BLEND");
  };

  const openEdit = (code: string) => {
    setSelectedCode(code);
    setModalMode("edit");
    setModalKey((current) => current + 1);
  };

  const closeModal = () => setModalMode(null);

  const handleToggleActive = async (formula: ProductionFormulaView) => {
    const nextActive = !formula.isActive;
    const confirmed = window.confirm(
      nextActive
        ? `¿Deseas reactivar la fórmula ${formula.name}?`
        : `¿Deseas eliminar la fórmula ${formula.name}? Se ocultará del catálogo, pero no se borrará físicamente.`,
    );
    if (!confirmed) return;

    const result = await archiveProductionFormula(formula.code, nextActive);
    if (!result.success) {
      window.alert(result.error || "No se pudo actualizar la fórmula");
      return;
    }

    if (!nextActive && selectedCode === formula.code) {
      const remaining = filteredFormulas.filter((item) => item.code !== formula.code);
      setSelectedCode(remaining[0]?.code || "");
    }
    startTransition(() => router.refresh());
  };

  const counts = useMemo(() => {
    const byType = (type: RecipeFilter) => safeFormulas.filter((formula) => (formula.recipeType || "ACIDIFIER") === type).length;
    return {
      all: safeFormulas.length,
      acidifier: byType("ACIDIFIER"),
      scooby: byType("SCOOBY"),
      flavor: byType("FLAVOR"),
      blend: byType("BLEND"),
    };
  }, [safeFormulas]);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Catálogo</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Fórmulas</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
          onClick={() => openCreate("ACIDIFIER")}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
          >
            Nueva fórmula
          </button>
          <button
            type="button"
            onClick={openCreateBlend}
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50"
          >
            Nuevo blend
          </button>
        </div>
      </section>

      <section className="flex flex-wrap gap-2 rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
        {[
          { value: "ALL" as const, label: "Todos", count: counts.all },
          { value: "ACIDIFIER" as const, label: "Acidificante", count: counts.acidifier },
          { value: "SCOOBY" as const, label: "Scooby", count: counts.scooby },
          { value: "FLAVOR" as const, label: "Saborizante", count: counts.flavor },
          { value: "BLEND" as const, label: "Blend", count: counts.blend },
        ].map((tab) => {
          const active = filter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label} <span className={`ml-1 text-xs ${active ? "text-white/70" : "text-slate-400"}`}>({tab.count})</span>
            </button>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 px-1 pb-4">
            <h2 className="text-lg font-black text-slate-950">Fórmulas registradas</h2>
            <p className="text-xs font-semibold text-slate-500">{filteredFormulas.length} resultados</p>
          </div>

          <div className="space-y-3">
            {filteredFormulas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-sm font-semibold text-slate-500">No hay fórmulas en este filtro.</p>
              </div>
            ) : (
              filteredFormulas.map((formula) => {
                const active = selectedCode === formula.code;
                const recipeLabel =
                  formula.recipeType === "FLAVOR"
                    ? "Saborizante"
                    : formula.recipeType === "SCOOBY"
                      ? "Scooby"
                      : formula.recipeType === "BLEND"
                        ? "Blend"
                        : "Acidificante";
                return (
                  <button
                    key={formula.id}
                    type="button"
                    onClick={() => setSelectedCode(formula.code)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active || selectedVisibleCode === formula.code
                        ? "border-slate-950 bg-slate-950 text-white shadow-md"
                        : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-xs font-black uppercase tracking-[0.25em] ${active ? "text-white/65" : "text-slate-400"}`}>{recipeLabel}</p>
                        <h3 className="mt-1 text-lg font-black">{formula.name || "Sin nombre"}</h3>
                        <p className={`mt-1 text-xs ${active ? "text-white/70" : "text-slate-500"}`}>
                          Código {formula.code} · {formula.isActive ? "Activa" : "Inactiva"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                          formula.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {formula.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
          {!selectedFormula ? (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-sm font-semibold text-slate-500">Selecciona una fórmula para ver sus detalles.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
                    {selectedFormula.recipeType === "FLAVOR"
                      ? "Saborizante"
                      : selectedFormula.recipeType === "SCOOBY"
                        ? "Scooby"
                        : selectedFormula.recipeType === "BLEND"
                          ? "Blend"
                          : "Acidificante"}
                  </p>
                  <h3 className="mt-2 text-3xl font-black text-slate-950">{selectedFormula.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">Código {selectedFormula.code}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(selectedFormula.code)}
                    className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(selectedFormula)}
                    className={`rounded-full px-4 py-2 text-xs font-black ${
                      selectedFormula.isActive ? "bg-rose-100 text-rose-700 hover:bg-rose-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    }`}
                  >
                    {selectedFormula.isActive ? "Eliminar" : "Reactivar"}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <DetailChip label="Estado" value={selectedFormula.isActive ? "Activa" : "Inactiva"} />
                <DetailChip label="Última edición" value={selectedFormula.updatedAt ? new Date(selectedFormula.updatedAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "-"} />
                <DetailChip label="Pasos" value={String(selectedFormula.steps.length)} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-950">Resumen</p>
                <p className="mt-2 text-sm text-slate-600">{selectedFormula.formulaSummary || selectedFormula.description || "Sin resumen."}</p>
              </div>

              {selectedFormula.recipeType === "FLAVOR" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailChip label="Flavour juice %" value={`${Number(selectedFormula.flavorJuicePercent || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })}%`} />
                  <DetailChip label="CO₂" value={`${Number(selectedFormula.co2GramsPerLiter || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })} g/L`} />
                  <DetailChip label="Carbonatación" value={selectedFormula.carbonationMethod || "-"} />
                  <DetailChip label="Objetivo F2" value={`${Number(selectedFormula.f2ConditionDays || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })} días`} />
                  <DetailChip label="pH" value={`${Number(selectedFormula.phMin || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })} - ${Number(selectedFormula.phMax || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })}`} />
                  <DetailChip label="Brix" value={`${Number(selectedFormula.brixMin || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })} - ${Number(selectedFormula.brixMax || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })}`} />
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailChip label="Té" value={selectedFormula.teaType || "-"} />
                  <DetailChip label="Té g/L" value={`${Number(selectedFormula.teaGramsPerLiter || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })} g/L`} />
                  <DetailChip label="Azúcar g/L" value={`${Number(selectedFormula.sugarGramsPerLiter || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })} g/L`} />
                  <DetailChip label="Cultivo" value={`${Number(selectedFormula.yeastPitchRatePercent || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })}%`} />
                  <DetailChip label="Agua cocción" value={`${Number(selectedFormula.brewWaterPercent || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })}%`} />
                  <DetailChip label="Duración" value={`${Number(selectedFormula.durationDays || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })} días`} />
                </div>
              )}

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-black text-slate-950">Pasos</p>
                <div className="mt-3 space-y-3">
                  {selectedFormula.steps.length === 0 ? (
                    <p className="text-sm text-slate-500">No hay pasos registrados.</p>
                  ) : (
                    selectedFormula.steps.map((step) => (
                      <div key={step.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Paso {step.stepNumber}</p>
                        <p className="mt-1 font-black text-slate-950">{step.title}</p>
                        {step.instructions ? <p className="mt-1 text-sm text-slate-600">{step.instructions}</p> : null}
                        {step.resultLiters != null ? <p className="mt-2 text-xs font-semibold text-slate-500">Resultado: {Number(step.resultLiters).toLocaleString("es-MX", { maximumFractionDigits: 2 })} L</p> : null}
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-black text-slate-950">Componentes</p>
                <div className="mt-3 space-y-2">
                  {selectedFormula.recipeType === "FLAVOR" ? (
                    selectedFormula.flavorIngredients.length === 0 ? (
                      <p className="text-sm text-slate-500">Sin ingredientes de sabor.</p>
                    ) : (
                      selectedFormula.flavorIngredients.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                          <div>
                            <p className="font-semibold text-slate-900">{item.rawMaterialName || item.freeTextName || "Ingrediente"}</p>
                            <p className="text-xs text-slate-500">{item.detail || "Sin detalle"}</p>
                          </div>
                          <p className="text-sm font-black text-slate-950">
                            {Number(item.quantity || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })} {item.rawMaterialUnit || item.unitOverride || ""}
                          </p>
                        </div>
                      ))
                    )
                  ) : selectedFormula.blendItems.length === 0 ? (
                    <p className="text-sm text-slate-500">Sin componentes de blend.</p>
                  ) : (
                    selectedFormula.blendItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                        <div>
                          <p className="font-semibold text-slate-900">{item.rawMaterialName || item.freeTextName || "Componente"}</p>
                          <p className="text-xs text-slate-500">{Number(item.sharePercent || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })}% del blend</p>
                        </div>
                        <p className="text-sm font-black text-slate-950">
                          {Number(item.quantity || item.gramsPerLiter || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })} {item.unit || "g"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}
        </section>
      </div>

      {(modalMode === "create" || modalMode === "edit") && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 p-4 pt-6">
          <div className="max-h-[92vh] w-full max-w-[1280px] overflow-y-auto rounded-[1.8rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
                  {modalMode === "create" ? "Nueva fórmula" : "Editar fórmula"}
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  {modalMode === "create" ? "Crear una nueva fórmula" : selectedFormula?.name || "Editar fórmula"}
                </h3>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <ProductionFormulasManager
                key={`${modalKey}-${modalMode}-${modalMode === "edit" ? selectedCode : "new"}`}
                formulas={safeFormulas}
                rawMaterials={rawMaterials}
                initialSelectedCode={modalMode === "edit" ? selectedCode : null}
                initialRecipeType={modalMode === "create" ? createRecipeType : "ACIDIFIER"}
                hideTopAction
                autoCreateNew={modalMode === "create"}
                compactModal
                onDone={closeModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}
