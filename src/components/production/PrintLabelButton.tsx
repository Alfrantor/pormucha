"use client";

export default function PrintLabelButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-slate-950 px-5 py-2 text-sm font-black text-white hover:bg-slate-800"
    >
      Imprimir etiqueta
    </button>
  );
}
