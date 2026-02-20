"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export const DateRangeFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estado inicial leyendo la URL o vacío
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");

  // Aplicar filtro cuando cambian las fechas
  const applyFilter = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/admin?${params.toString()}`);
  };

  // Limpiar filtro
  const clearFilter = () => {
    setFrom("");
    setTo("");
    router.push("/admin");
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end md:items-center mb-8">
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Desde</label>
        <input 
          type="date" 
          value={from} 
          onChange={(e) => setFrom(e.target.value)} 
          className="p-2 border rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Hasta</label>
        <input 
          type="date" 
          value={to} 
          onChange={(e) => setTo(e.target.value)} 
          className="p-2 border rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      <div className="flex gap-2">
        <button 
            onClick={applyFilter} 
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition"
        >
            FILTRAR
        </button>
        {(from || to) && (
            <button 
                onClick={clearFilter} 
                className="text-red-500 px-4 py-2 text-sm font-bold hover:bg-red-50 transition"
            >
                Limpiar
            </button>
        )}
      </div>
    </div>
  );
};