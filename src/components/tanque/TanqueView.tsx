"use client";

import React from "react";
import { validatePin, recordProductionParameter } from "@/app/_actions/production";
import { getContainerStatus, getContainerStatusClasses, getContainerStatusLabel } from "@/lib/container-status";
import { resolvePublicAppUrl } from "@/lib/public-app-url";

function fmtDate(d: string) {
  return new Date(d).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

function daysSince(startedAt: string) {
  const diff = Date.now() - new Date(startedAt).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days === 0) return `${hours}h`;
  return `${days}d ${hours}h`;
}

const TYPE_COLOR: Record<string, string> = {
  A: "bg-purple-100 text-purple-700 border-purple-200",
  B: "bg-amber-100 text-amber-700 border-amber-200",
  C: "bg-teal-100 text-teal-700 border-teal-200",
};

export default function TanqueView({ tank }: { tank: any }) {
  const prod = tank.productions?.[0] || null;
  const params = prod?.parameters || [];
  const lastParam = params[0] || null;
  const status = getContainerStatus(tank, prod);
  const statusLabel = getContainerStatusLabel(status);
  const publicAppUrl = typeof window !== "undefined" ? resolvePublicAppUrl(window.location.origin) : resolvePublicAppUrl();
  const qrUrl = `${publicAppUrl}/cubeta/${tank.id}`;
  const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl)}`;

  const [pinOpen, setPinOpen] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [pinError, setPinError] = React.useState("");
  const [pinChecking, setPinChecking] = React.useState(false);
  const [unlocked, setUnlocked] = React.useState(false);

  const handlePinSubmit = async () => {
    if (!pin) return;
    setPinChecking(true);
    setPinError("");
    const ok = await validatePin(pin);
    setPinChecking(false);
    if (!ok) {
      setPinError("PIN incorrecto");
      setPin("");
      return;
    }
    setUnlocked(true);
    setPinOpen(false);
    setPin("");
  };

  const [ph, setPh] = React.useState("");
  const [brix, setBrix] = React.useState("");
  const [temp, setTemp] = React.useState("");
  const [acid, setAcid] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [measuredAt, setMeasuredAt] = React.useState(() => new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");

  const handleRecord = async () => {
    if (!prod) return;
    if (!ph && !brix && !temp && !acid) {
      setSaveError("Ingresa al menos un parámetro");
      return;
    }
    setSaving(true);
    setSaveError("");
    const res = await recordProductionParameter({
      productionId: prod.id,
      ph: ph ? Number(ph) : undefined,
      brix: brix ? Number(brix) : undefined,
      temperature: temp ? Number(temp) : undefined,
      acidity: acid ? Number(acid) : undefined,
      notes,
      measuredAt,
    });
    setSaving(false);
    if (res.error) {
      setSaveError(res.error);
      return;
    }
    setSaved(true);
    setPh("");
    setBrix("");
    setTemp("");
    setAcid("");
    setNotes("");
    setMeasuredAt(new Date().toISOString().slice(0, 16));
    setTimeout(() => {
      setSaved(false);
      setUnlocked(false);
    }, 3000);
  };

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 py-8">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900">Cubeta {tank.name}</h1>
          {tank.capacityLt != null && <span className="text-sm text-gray-400">{Number(tank.capacityLt)} Lt</span>}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${getContainerStatusClasses(status)}`}>
            {statusLabel}
          </span>
          <span className="text-xs text-gray-400">Estado actual</span>
        </div>

        {prod ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-gray-800">{prod.name}</span>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${TYPE_COLOR[prod.productType] || "border-gray-200 bg-gray-100 text-gray-600"}`}>
                Tipo {prod.productType}
              </span>
              <span className="rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-[11px] font-black text-blue-700">
                Proceso activo
              </span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
              <span>Inicio: {fmtDate(prod.startedAt)}</span>
              <span>{daysSince(prod.startedAt)} en proceso</span>
            </div>

            {prod.ingredients?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {prod.ingredients.map((i: any) => (
                  <span key={i.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                    {i.rawMaterial?.name} {Number(i.quantity)} {i.rawMaterial?.unit}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 py-4 text-center">
            <p className="text-sm text-gray-400">No tiene procesos activos</p>
            <p className="mt-1 text-xs text-gray-300">La cubeta está libre para un nuevo proceso</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase text-gray-400">QR de consulta</p>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Escanea para ver estado y proceso</p>
            <p className="mt-2 break-all text-xs text-gray-400">{qrUrl}</p>
          </div>
          <img src={qrImgSrc} alt={`QR de cubeta ${tank.name}`} className="h-28 w-28 rounded-xl border border-gray-100" />
        </div>
      </div>

      {lastParam && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-black uppercase text-gray-400">Última medición</p>
          <p className="mb-3 text-xs text-gray-400">{fmtDate(lastParam.measuredAt)}</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "pH", value: lastParam.ph, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Brix", value: lastParam.brix, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Temp °C", value: lastParam.temperature, color: "text-red-500", bg: "bg-red-50" },
              { label: "Acidez", value: lastParam.acidity, color: "text-green-600", bg: "bg-green-50" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                <p className="text-[10px] font-bold uppercase text-gray-500">{label}</p>
                <p className={`text-2xl font-black ${color}`}>
                  {value != null ? Number(value) : <span className="text-lg text-gray-300">—</span>}
                </p>
              </div>
            ))}
          </div>
          {lastParam.notes && <p className="mt-3 text-xs italic text-gray-500">{lastParam.notes}</p>}
        </div>
      )}

      {params.length > 1 && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-black uppercase text-gray-400">Historial ({params.length})</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="whitespace-nowrap border border-gray-100 p-2 text-left">Fecha</th>
                  <th className="border border-gray-100 p-2">pH</th>
                  <th className="border border-gray-100 p-2">Brix</th>
                  <th className="border border-gray-100 p-2">°C</th>
                  <th className="border border-gray-100 p-2">Acidez</th>
                </tr>
              </thead>
              <tbody>
                {params.map((pm: any) => (
                  <tr key={pm.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap border border-gray-100 p-2">{fmtDate(pm.measuredAt)}</td>
                    <td className="border border-gray-100 p-2 text-center font-mono">{pm.ph != null ? Number(pm.ph) : "—"}</td>
                    <td className="border border-gray-100 p-2 text-center font-mono">{pm.brix != null ? Number(pm.brix) : "—"}</td>
                    <td className="border border-gray-100 p-2 text-center font-mono">{pm.temperature != null ? Number(pm.temperature) : "—"}</td>
                    <td className="border border-gray-100 p-2 text-center font-mono">{pm.acidity != null ? Number(pm.acidity) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {prod && !unlocked && !saved && (
        <button
          onClick={() => {
            setPinOpen(true);
            setPinError("");
            setPin("");
          }}
          className="w-full rounded-2xl bg-black py-4 text-base font-bold text-white shadow-md transition-all hover:bg-gray-800 active:scale-95"
        >
          Registrar medición
        </button>
      )}

      {prod && unlocked && !saved && (
        <div className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
          <p className="font-black text-gray-800">Nueva medición</p>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-500">Fecha y hora</label>
            <input
              type="datetime-local"
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
              className="w-full rounded-xl border p-3 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "pH", val: ph, set: setPh },
              { label: "Brix", val: brix, set: setBrix },
              { label: "Temperatura (°C)", val: temp, set: setTemp },
              { label: "Acidez", val: acid, set: setAcid },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="mb-1 block text-xs font-bold text-gray-500">{label}</label>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  placeholder="—"
                  className="w-full rounded-xl border p-3 text-center text-lg font-bold focus:border-blue-400 focus:outline-none"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-500">Notas</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones..."
              className="w-full rounded-xl border p-3 text-sm"
            />
          </div>
          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setUnlocked(false);
                setSaveError("");
              }}
              className="flex-1 rounded-xl border py-3 text-sm font-bold text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleRecord}
              disabled={saving}
              className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:bg-gray-300 active:scale-95"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {saved && (
        <div className="space-y-2 rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-4xl">OK</p>
          <p className="text-lg font-black text-green-700">Medición registrada</p>
          <p className="text-sm text-green-600">Los datos se guardaron correctamente.</p>
        </div>
      )}

      {pinOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="text-center">
              <p className="mb-2 text-3xl">PIN</p>
              <h2 className="text-xl font-black">Ingresa el PIN</h2>
              <p className="text-sm text-gray-400">Para registrar una medición</p>
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
              placeholder="••••"
              autoFocus
              className="w-full rounded-xl border-2 p-4 text-center text-2xl font-black tracking-[0.5em] focus:border-black focus:outline-none"
            />
            {pinError && <p className="text-center text-sm text-red-500">{pinError}</p>}

            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    if (k === "⌫") setPin((p) => p.slice(0, -1));
                    else if (k !== "") setPin((p) => (p.length < 8 ? p + k : p));
                  }}
                  className={`rounded-xl py-4 text-xl font-bold transition-all active:scale-95 ${
                    k === "" ? "invisible" : k === "⌫" ? "bg-gray-100 text-gray-500 hover:bg-gray-200" : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPinOpen(false);
                  setPin("");
                  setPinError("");
                }}
                className="flex-1 rounded-xl border py-3 font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handlePinSubmit}
                disabled={pinChecking || !pin}
                className="flex-1 rounded-xl bg-black py-3 font-bold text-white transition-all hover:bg-gray-800 disabled:bg-gray-300 active:scale-95"
              >
                {pinChecking ? "..." : "Entrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="pb-4 text-center text-[10px] text-gray-300">Pormucha Kombucha · Cubeta {tank.name}</p>
    </div>
  );
}
