"use client";

import { useState } from "react";
import { setProduccionPin } from "@/app/_actions/production";

export default function ProductionPinCard() {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    const result = await setProduccionPin(pin);
    setSaving(false);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    setMessage("PIN actualizado correctamente");
    setPin("");
    setTimeout(() => {
      setOpen(false);
      setMessage("");
    }, 1200);
  };

  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Seguridad</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">PIN NFC / producción</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Cada usuario configura su PIN desde aquí. Ese PIN se usa después para registrar mediciones en cubetas y procesos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
        >
          {open ? "Ocultar configuración" : "Configurar PIN NFC"}
        </button>
      </div>

      {open && (
        <div className="mt-5 max-w-xl rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="block text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Nuevo PIN</label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="Ingresa un PIN de 4 o más caracteres"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-black tracking-[0.4em] outline-none"
          />
          <p className="mt-2 text-xs text-slate-500">
            El PIN queda guardado en tu perfil de Clerk y sólo aplica para tu usuario.
          </p>

          {message && (
            <p className={`mt-3 text-sm font-semibold ${message.toLowerCase().includes("correctamente") ? "text-emerald-600" : "text-rose-600"}`}>
              {message}
            </p>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setMessage("");
                setPin("");
              }}
              className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || pin.length < 4}
              className="flex-1 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300"
            >
              {saving ? "Guardando..." : "Guardar PIN"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
