"use client";

import React from "react";
import { validatePin, recordProductionParameter } from "@/app/_actions/production";

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

  // ── PIN flow
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

  // ── Formulario parámetros
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
    if (!ph && !brix && !temp && !acid) { setSaveError("Ingresa al menos un parámetro"); return; }
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
    if (res.error) { setSaveError(res.error); return; }
    setSaved(true);
    setPh(""); setBrix(""); setTemp(""); setAcid(""); setNotes("");
    setMeasuredAt(new Date().toISOString().slice(0, 16));
    setTimeout(() => { setSaved(false); setUnlocked(false); }, 3000);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      {/* Header tanque */}
      <div className="bg-white rounded-2xl border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-black text-gray-900">🪣 {tank.name}</h1>
          {tank.capacityLt != null && (
            <span className="text-sm text-gray-400">{Number(tank.capacityLt)} Lt</span>
          )}
        </div>

        {prod ? (
          <div className="space-y-3 mt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-800">{prod.name}</span>
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${TYPE_COLOR[prod.productType] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                Tipo {prod.productType}
              </span>
              <span className="text-[11px] bg-blue-100 text-blue-700 border border-blue-200 font-black px-2.5 py-0.5 rounded-full">
                En proceso
              </span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
              <span>🕐 Inicio: {fmtDate(prod.startedAt)}</span>
              <span>⏱ {daysSince(prod.startedAt)} en proceso</span>
            </div>

            {/* Insumos iniciales */}
            {prod.ingredients?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {prod.ingredients.map((i: any) => (
                  <span key={i.id} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {i.rawMaterial?.name} {Number(i.quantity)} {i.rawMaterial?.unit}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 text-center py-4">
            <p className="text-gray-400 text-sm">Sin proceso activo</p>
            <p className="text-gray-300 text-xs mt-1">Tanque disponible</p>
          </div>
        )}
      </div>

      {/* Último parámetro */}
      {lastParam && (
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <p className="text-xs font-black text-gray-400 uppercase mb-3">Última medición</p>
          <p className="text-xs text-gray-400 mb-3">{fmtDate(lastParam.measuredAt)}</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "pH", value: lastParam.ph, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Brix", value: lastParam.brix, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Temp °C", value: lastParam.temperature, color: "text-red-500", bg: "bg-red-50" },
              { label: "Acidez", value: lastParam.acidity, color: "text-green-600", bg: "bg-green-50" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                <p className="text-[10px] font-bold text-gray-500 uppercase">{label}</p>
                <p className={`text-2xl font-black ${color}`}>
                  {value != null ? Number(value) : <span className="text-gray-300 text-lg">—</span>}
                </p>
              </div>
            ))}
          </div>
          {lastParam.notes && (
            <p className="text-xs text-gray-500 mt-3 italic">{lastParam.notes}</p>
          )}
        </div>
      )}

      {/* Historial */}
      {params.length > 1 && (
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <p className="text-xs font-black text-gray-400 uppercase mb-3">Historial ({params.length})</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2 border border-gray-100 whitespace-nowrap">Fecha</th>
                  <th className="p-2 border border-gray-100">pH</th>
                  <th className="p-2 border border-gray-100">Brix</th>
                  <th className="p-2 border border-gray-100">°C</th>
                  <th className="p-2 border border-gray-100">Acidez</th>
                </tr>
              </thead>
              <tbody>
                {params.map((pm: any) => (
                  <tr key={pm.id} className="hover:bg-gray-50">
                    <td className="p-2 border border-gray-100 whitespace-nowrap">{fmtDate(pm.measuredAt)}</td>
                    <td className="p-2 border border-gray-100 text-center font-mono">{pm.ph != null ? Number(pm.ph) : "—"}</td>
                    <td className="p-2 border border-gray-100 text-center font-mono">{pm.brix != null ? Number(pm.brix) : "—"}</td>
                    <td className="p-2 border border-gray-100 text-center font-mono">{pm.temperature != null ? Number(pm.temperature) : "—"}</td>
                    <td className="p-2 border border-gray-100 text-center font-mono">{pm.acidity != null ? Number(pm.acidity) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Botón registrar / formulario */}
      {prod && !unlocked && !saved && (
        <button
          onClick={() => { setPinOpen(true); setPinError(""); setPin(""); }}
          className="w-full bg-black text-white font-bold py-4 rounded-2xl text-base hover:bg-gray-800 active:scale-95 transition-all shadow-md"
        >
          📊 Registrar medición
        </button>
      )}

      {prod && unlocked && !saved && (
        <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-4">
          <p className="font-black text-gray-800">Nueva medición</p>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Fecha y hora</label>
            <input
              type="datetime-local" value={measuredAt}
              onChange={e => setMeasuredAt(e.target.value)}
              className="w-full border rounded-xl p-3 text-sm"
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
                <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
                <input
                  type="number" step="0.01" inputMode="decimal"
                  value={val} onChange={e => set(e.target.value)}
                  placeholder="—"
                  className="w-full border rounded-xl p-3 text-center text-lg font-bold focus:border-blue-400 focus:outline-none"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Notas</label>
            <input
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones..."
              className="w-full border rounded-xl p-3 text-sm"
            />
          </div>
          {saveError && <p className="text-red-500 text-xs">{saveError}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => { setUnlocked(false); setSaveError(""); }}
              className="flex-1 border rounded-xl py-3 text-sm font-bold text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleRecord}
              disabled={saving}
              className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 disabled:bg-gray-300 active:scale-95 transition-all"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-2">
          <p className="text-4xl">✅</p>
          <p className="font-black text-green-700 text-lg">¡Medición registrada!</p>
          <p className="text-green-600 text-sm">Los datos se guardaron correctamente.</p>
        </div>
      )}

      {/* Modal PIN */}
      {pinOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <p className="text-3xl mb-2">🔐</p>
              <h2 className="font-black text-xl">Ingresa el PIN</h2>
              <p className="text-gray-400 text-sm">Para registrar una medición</p>
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handlePinSubmit()}
              placeholder="••••"
              autoFocus
              className="w-full border-2 rounded-xl p-4 text-center text-2xl font-black tracking-[0.5em] focus:border-black focus:outline-none"
            />
            {pinError && <p className="text-red-500 text-sm text-center">{pinError}</p>}

            {/* Teclado numérico visual para móvil */}
            <div className="grid grid-cols-3 gap-2">
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    if (k === "⌫") setPin(p => p.slice(0, -1));
                    else if (k !== "") setPin(p => p.length < 8 ? p + k : p);
                  }}
                  className={`py-4 rounded-xl text-xl font-bold transition-all active:scale-95 ${
                    k === "" ? "invisible" :
                    k === "⌫" ? "bg-gray-100 text-gray-500 hover:bg-gray-200" :
                    "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setPinOpen(false); setPin(""); setPinError(""); }}
                className="flex-1 border rounded-xl py-3 font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handlePinSubmit}
                disabled={pinChecking || !pin}
                className="flex-1 bg-black text-white rounded-xl py-3 font-bold hover:bg-gray-800 disabled:bg-gray-300 active:scale-95 transition-all"
              >
                {pinChecking ? "…" : "Entrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-[10px] text-gray-300 pb-4">
        Pormucha Kombucha · {tank.name}
      </p>
    </div>
  );
}
