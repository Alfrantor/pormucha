"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { startTransition, useState } from "react";
import TabProduccion from "@/components/admin/TabProduccion";
import {
  cancelGasificationBatch,
  cancelLabelingBatch,
  completeGasificationBatch,
  completeLabelingBatch,
  createGasificationBatch,
  createLabelingBatch,
} from "@/app/_actions/production-processes";
import { useRouter } from "next/navigation";

type WorkspaceTab = "bebida" | "gasificado" | "etiquetado" | "formulas";

function fmtDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

export default function ProductionWorkspace({
  tanks,
  productions,
  rawMaterials,
  locations,
  formulas,
  flavors,
  gasificationBatches,
  labelingBatches,
  baseBeverageInventory,
  finalBeverageBlends,
  userEmail,
}: any) {
  const router = useRouter();
  const [tab, setTab] = useState<WorkspaceTab>("bebida");
  const safeFormulas = Array.isArray(formulas) ? formulas : [];

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <TabButton active={tab === "bebida"} onClick={() => setTab("bebida")} title="Bebida base" desc="Cubetas, lotes e insumos" />
          <TabButton active={tab === "gasificado"} onClick={() => setTab("gasificado")} title="Gasificado" desc="Carbonatacion y cierre" />
          <TabButton active={tab === "etiquetado"} onClick={() => setTab("etiquetado")} title="Etiquetado" desc="Botellas, etiquetas y salida" />
          <TabButton active={tab === "formulas"} onClick={() => setTab("formulas")} title="Fórmulas" desc="Revisar recetas y pasos" />
        </div>
      </section>

      {tab === "bebida" && (
        <TabProduccion
          tanks={tanks}
          productions={productions}
          rawMaterials={rawMaterials}
          locations={locations}
          formulas={formulas}
          baseBeverageInventory={baseBeverageInventory}
          finalBeverageBlends={finalBeverageBlends}
          userEmail={userEmail}
        />
      )}

      {tab === "gasificado" && (
        <GasificationPanel
          tanks={tanks}
          locations={locations}
          flavors={flavors}
          batches={gasificationBatches}
          finalBeverageBlends={finalBeverageBlends}
          userEmail={userEmail}
          onRefresh={() => startTransition(() => router.refresh())}
        />
      )}

      {tab === "etiquetado" && (
        <LabelingPanel
          locations={locations}
          flavors={flavors}
          batches={labelingBatches}
          userEmail={userEmail}
          onRefresh={() => startTransition(() => router.refresh())}
        />
      )}

      {tab === "formulas" && <FormulaLibraryPanel formulas={safeFormulas} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`min-w-[220px] rounded-[1.4rem] border p-4 text-left transition ${
        active ? "border-slate-950 bg-slate-950 text-white shadow-lg" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
      }`}
    >
      <p className="text-sm font-black">{title}</p>
      <p className={`mt-1 text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>{desc}</p>
    </button>
  );
}

function GasificationPanel({ tanks, locations, flavors, batches, finalBeverageBlends, userEmail, onRefresh }: any) {
  const [form, setForm] = useState({
    name: "",
    flavorId: "",
    tankId: "",
    locationId: "",
    finalBeverageBlendId: "",
    startedAt: new Date().toISOString().slice(0, 16),
    litersProcessed: "",
    bottlesUsed: "",
    pressurePsi: "",
    carbonationVol: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const activeFinalBlends = React.useMemo(
    () => (Array.isArray(finalBeverageBlends) ? finalBeverageBlends : []).filter((blend: any) => String(blend.status) === "ACTIVE"),
    [finalBeverageBlends],
  );

  const submit = async () => {
    setSaving(true);
    setError("");
    const res = await createGasificationBatch({
      name: form.name,
      flavorId: form.flavorId || undefined,
      tankId: form.tankId || undefined,
      locationId: form.locationId || undefined,
      finalBeverageBlendId: form.finalBeverageBlendId || undefined,
      startedAt: form.startedAt,
      litersProcessed: form.litersProcessed ? Number(form.litersProcessed) : undefined,
      bottlesUsed: form.bottlesUsed ? Number(form.bottlesUsed) : undefined,
      pressurePsi: form.pressurePsi ? Number(form.pressurePsi) : undefined,
      carbonationVol: form.carbonationVol ? Number(form.carbonationVol) : undefined,
      notes: form.notes,
      createdBy: userEmail,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error || "No se pudo crear el proceso");
      return;
    }
    setForm({
      name: "",
      flavorId: "",
      tankId: "",
      locationId: "",
      finalBeverageBlendId: "",
      startedAt: new Date().toISOString().slice(0, 16),
      litersProcessed: "",
      bottlesUsed: "",
      pressurePsi: "",
      carbonationVol: "",
      notes: "",
    });
    onRefresh();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Nuevo proceso</p>
        <h3 className="mt-2 text-2xl font-black text-slate-950">Gasificado</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del lote">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          </Field>
          <Field label="Sabor">
            <select value={form.flavorId} onChange={(e) => setForm({ ...form, flavorId: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm">
              <option value="">Selecciona</option>
              {flavors.map((flavor: any) => <option key={flavor.id} value={flavor.id}>{flavor.name}</option>)}
            </select>
          </Field>
          <Field label="Cubeta">
            <select value={form.tankId} onChange={(e) => setForm({ ...form, tankId: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm">
              <option value="">Selecciona</option>
              {tanks.map((tank: any) => <option key={tank.id} value={tank.id}>{tank.name}</option>)}
            </select>
          </Field>
          <Field label="Ubicacion">
            <select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm">
              <option value="">Selecciona</option>
              {locations.map((loc: any) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </select>
          </Field>
          <Field label="Bebida final origen">
            <select value={form.finalBeverageBlendId} onChange={(e) => setForm({ ...form, finalBeverageBlendId: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm">
              <option value="">Selecciona</option>
              {activeFinalBlends.map((blend: any) => (
                <option key={blend.id} value={blend.id}>
                  {blend.name} · {Number(blend.totalLiters || 0).toLocaleString("es-MX")} Lt · Brix {Number(blend.weightedBrix || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Inicio">
            <input type="datetime-local" value={form.startedAt} onChange={(e) => setForm({ ...form, startedAt: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          </Field>
          <Field label="Litros a gasificar">
            <input type="number" value={form.litersProcessed} onChange={(e) => setForm({ ...form, litersProcessed: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          </Field>
          <Field label="Botellas etiquetadas a usar">
            <input type="number" value={form.bottlesUsed} onChange={(e) => setForm({ ...form, bottlesUsed: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          </Field>
          <Field label="PSI objetivo">
            <input type="number" value={form.pressurePsi} onChange={(e) => setForm({ ...form, pressurePsi: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          </Field>
          <Field label="Volumen CO2">
            <input type="number" value={form.carbonationVol} onChange={(e) => setForm({ ...form, carbonationVol: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          </Field>
        </div>
        <Field label="Notas">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
        </Field>
        {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
        <button onClick={submit} disabled={saving} className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300">
          {saving ? "Guardando..." : "Crear proceso de gasificado"}
        </button>
      </section>

      <BatchList
        title="Gasificados registrados"
        empty="Todavia no hay procesos de gasificado."
        batches={batches}
        stats={(batch: any) => [
          `Sabor: ${batch.flavor?.name || "-"}`,
          `Cubeta: ${batch.tank?.name || "-"}`,
          `Litros: ${batch.litersProcessed ?? "-"}`,
          `Botellas: ${batch.bottlesUsed ?? "-"}`,
        ]}
        onComplete={async (batch: any) => {
          await completeGasificationBatch(batch.id, {
            litersProcessed: batch.litersProcessed ?? undefined,
            bottlesUsed: batch.bottlesUsed ?? undefined,
            pressurePsi: batch.pressurePsi ?? undefined,
            carbonationVol: batch.carbonationVol ?? undefined,
            notes: batch.notes || undefined,
          });
          onRefresh();
        }}
        onCancel={async (batch: any) => {
          await cancelGasificationBatch(batch.id, batch.notes || undefined);
          onRefresh();
        }}
      />
    </div>
  );
}

function LabelingPanel({ locations, flavors, batches, userEmail, onRefresh }: any) {
  const [form, setForm] = useState({
    name: "",
    flavorId: "",
    locationId: "",
    startedAt: new Date().toISOString().slice(0, 16),
    unitsReceived: "",
    unitsLabeled: "",
    labelsUsed: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const bottleInventory = React.useMemo(() => {
    return (flavors || [])
      .map((flavor: any) => {
        const total = (flavor.locationStocks || []).reduce((sum: number, stock: any) => sum + Number(stock.quantity || 0), 0);
        return {
          ...flavor,
          total,
        };
      })
      .filter((flavor: any) => flavor.total > 0)
      .sort((a: any, b: any) => b.total - a.total);
  }, [flavors]);
  const totalLabeledBottles = bottleInventory.reduce((sum: number, flavor: any) => sum + flavor.total, 0);

  const submit = async () => {
    setSaving(true);
    setError("");
    const res = await createLabelingBatch({
      name: form.name,
      flavorId: form.flavorId || undefined,
      locationId: form.locationId || undefined,
      startedAt: form.startedAt,
      unitsReceived: form.unitsReceived ? Number(form.unitsReceived) : undefined,
      unitsLabeled: form.unitsLabeled ? Number(form.unitsLabeled) : undefined,
      labelsUsed: form.labelsUsed ? Number(form.labelsUsed) : undefined,
      notes: form.notes,
      createdBy: userEmail,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error || "No se pudo crear el proceso");
      return;
    }
    setForm({
      name: "",
      flavorId: "",
      locationId: "",
      startedAt: new Date().toISOString().slice(0, 16),
      unitsReceived: "",
      unitsLabeled: "",
      labelsUsed: "",
      notes: "",
    });
    onRefresh();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-6">
        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Nuevo proceso</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">Etiquetado</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del lote">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
            </Field>
            <Field label="Sabor">
              <select value={form.flavorId} onChange={(e) => setForm({ ...form, flavorId: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm">
                <option value="">Selecciona</option>
                {flavors.map((flavor: any) => <option key={flavor.id} value={flavor.id}>{flavor.name}</option>)}
              </select>
            </Field>
            <Field label="Ubicacion">
              <select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm">
                <option value="">Selecciona</option>
                {locations.map((loc: any) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
              </select>
            </Field>
            <Field label="Inicio">
              <input type="datetime-local" value={form.startedAt} onChange={(e) => setForm({ ...form, startedAt: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
            </Field>
            <Field label="Botellas recibidas">
              <input type="number" value={form.unitsReceived} onChange={(e) => setForm({ ...form, unitsReceived: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
            </Field>
            <Field label="Botellas etiquetadas">
              <input type="number" value={form.unitsLabeled} onChange={(e) => setForm({ ...form, unitsLabeled: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
            </Field>
            <Field label="Etiquetas usadas">
              <input type="number" value={form.labelsUsed} onChange={(e) => setForm({ ...form, labelsUsed: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
            </Field>
          </div>
          <Field label="Notas">
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          </Field>
          {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
          <button onClick={submit} disabled={saving} className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300">
            {saving ? "Guardando..." : "Crear proceso de etiquetado"}
          </button>
        </section>

        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Inventario generado</p>
              <h4 className="mt-2 text-xl font-black text-slate-950">Botellas etiquetadas</h4>
              <p className="mt-2 text-sm text-slate-500">
                Cada proceso de etiquetado completado entra aqui y queda disponible para envasado, gasificado o movimientos posteriores.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-right text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60">Total</p>
              <p className="mt-2 text-3xl font-black">{totalLabeledBottles}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {bottleInventory.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Aun no hay botellas etiquetadas registradas en inventario.
              </div>
            )}
            {bottleInventory.map((flavor: any) => (
              <div key={flavor.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-black text-slate-950">{flavor.name}</p>
                    <p className="text-xs text-slate-400">Stock disponible para procesos posteriores</p>
                  </div>
                  <p className="text-2xl font-black text-slate-950">{flavor.total}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(flavor.locationStocks || [])
                    .filter((stock: any) => Number(stock.quantity || 0) > 0)
                    .map((stock: any) => (
                      <span key={stock.id} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                        {stock.location?.name || "Sin ubicacion"}: {Number(stock.quantity)}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <BatchList
        title="Etiquetados registrados"
        empty="Todavia no hay procesos de etiquetado."
        batches={batches}
        stats={(batch: any) => [
          `Sabor: ${batch.flavor?.name || "-"}`,
          `Ubicacion: ${batch.location?.name || "-"}`,
          `Recibidas: ${batch.unitsReceived ?? "-"}`,
          `Etiquetadas: ${batch.unitsLabeled ?? "-"}`,
        ]}
        onComplete={async (batch: any) => {
          await completeLabelingBatch(batch.id, {
            unitsReceived: batch.unitsReceived ?? undefined,
            unitsLabeled: batch.unitsLabeled ?? undefined,
            labelsUsed: batch.labelsUsed ?? undefined,
            notes: batch.notes || undefined,
          });
          onRefresh();
        }}
        onCancel={async (batch: any) => {
          await cancelLabelingBatch(batch.id, batch.notes || undefined);
          onRefresh();
        }}
      />
    </div>
  );
}

function FormulaLibraryPanel({ formulas }: { formulas: any[] }) {
  const visibleFormulas = Array.isArray(formulas) ? formulas : [];

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Biblioteca</p>
        <h3 className="mt-2 text-2xl font-black text-slate-950">Fórmulas</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Aquí puedes revisar las fórmulas activas, sus pasos, duración y los insumos que usa cada una.
        </p>

        <div className="mt-5 space-y-3">
          {visibleFormulas.length === 0 && (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              Todavía no hay fórmulas cargadas.
            </div>
          )}

          {visibleFormulas.map((formula: any) => {
            const totalSteps = Array.isArray(formula.steps) ? formula.steps.length : 0;
            const totalItems = Array.isArray(formula.items) ? formula.items.length : 0;

            return (
              <button
                key={formula.id}
                type="button"
                className="w-full rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Tipo {formula.code}</p>
                    <h4 className="mt-1 text-lg font-black text-slate-950">{formula.name}</h4>
                    {formula.description && <p className="mt-1 text-sm text-slate-500">{formula.description}</p>}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${formula.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {formula.isActive ? "Activa" : "Inactiva"}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <MetricChip label="Pasos" value={totalSteps} />
                  <MetricChip label="Insumos" value={totalItems} />
                  <MetricChip label="Días" value={formula.durationDays ?? 0} />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-dashed border-slate-200 bg-slate-50 p-6 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Detalle</p>
        <h3 className="mt-2 text-2xl font-black text-slate-950">Vista rápida</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Más adelante aquí podemos abrir cada fórmula para editar sus pasos y el checklist de preparación.
        </p>

        <div className="mt-5 space-y-4">
          {visibleFormulas.slice(0, 3).map((formula: any) => (
            <div key={formula.id} className="rounded-[1.3rem] border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{formula.name}</p>
                  <p className="text-xs text-slate-500">Tipo {formula.code}</p>
                </div>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white">
                  {formula.targetLiters != null ? `${Number(formula.targetLiters).toLocaleString("es-MX")} Lt` : "Sin objetivo"}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {(Array.isArray(formula.steps) ? formula.steps : []).map((step: any, index: number) => (
                  <div key={step.id || `${formula.id}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <span className="font-black text-slate-950">Paso {step.stepNumber || index + 1}:</span> {step.title || "Sin título"}
                    {step.instructions ? <span className="block text-xs text-slate-500">{step.instructions}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <label className="mb-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function BatchList({ title, empty, batches, stats, onComplete, onCancel }: any) {
  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-2xl font-black text-slate-950">{title}</h3>
      <div className="mt-5 space-y-4">
        {batches.length === 0 && <p className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">{empty}</p>}
        {batches.map((batch: any) => {
          const isInProgress = batch.status === "IN_PROGRESS";
          return (
            <div key={batch.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-slate-950">{batch.name}</p>
                  <p className="text-xs text-slate-500">Inicio: {fmtDate(batch.startedAt)}</p>
                  <p className="text-xs text-slate-500">Fin: {fmtDate(batch.completedAt)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${
                  batch.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : batch.status === "CANCELLED" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {batch.status === "COMPLETED" ? "Completado" : batch.status === "CANCELLED" ? "Cancelado" : "En proceso"}
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {stats(batch).map((item: string) => (
                  <div key={item} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-600">{item}</div>
                ))}
              </div>
              {batch.notes && <p className="mt-3 text-sm text-slate-500">{batch.notes}</p>}
              {isInProgress && (
                <div className="mt-4 flex gap-2">
                  <button onClick={() => onComplete(batch)} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800">
                    Marcar completado
                  </button>
                  <button onClick={() => onCancel(batch)} className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-700 hover:bg-rose-50">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
