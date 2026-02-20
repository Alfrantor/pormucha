"use client";

import { useState } from "react";
import { transferStock } from "@/actions/inventory-transfer";
import { toast } from "sonner"; // Opcional: si usas notificaciones

interface Props {
  locations: any[];
  flavors: any[];
  userEmail: string;
}

export const InventoryTransferForm = ({ locations, flavors, userEmail }: Props) => {
  // Estado para controlar el Origen seleccionado
  const [originId, setOriginId] = useState(locations[0]?.id || "");

  return (
    <div className="bg-indigo-900 text-white p-8 rounded-[2rem] shadow-xl">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        🚚 Transferir Stock (Entre Ubicaciones)
      </h3>
      <p className="opacity-70 mb-6 text-sm">
        Mueve productos entre almacenes. El sistema validará que tengas stock suficiente en el origen seleccionado.
      </p>

      <form 
        action={async (formData) => {
            const result = await transferStock(formData);
            if (result?.error) {
                alert(`❌ Error: ${result.error}`); // O usa toast.error()
            } else {
                alert("✅ Transferencia exitosa"); // O usa toast.success()
            }
        }} 
        className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white/10 p-6 rounded-xl border border-white/20"
      >
        <input type="hidden" name="userEmail" value={userEmail} />

        {/* 1. ORIGEN (Controlado por React State) */}
        <div className="flex flex-col">
          <label className="text-xs font-bold uppercase opacity-70 mb-1">Desde (Origen)</label>
          <select 
            name="fromLocationId" 
            value={originId}
            onChange={(e) => setOriginId(e.target.value)}
            className="p-3 bg-white text-black rounded-lg text-sm font-bold outline-none border-r-8 border-transparent cursor-pointer"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} {loc.isDefault ? "(Principal)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* 2. PRODUCTO (Dinámico según Origen) */}
        <div className="flex flex-col md:col-span-2">
          <label className="text-xs font-bold uppercase opacity-70 mb-1">Producto</label>
          <select 
            name="flavorId" 
            className="p-3 bg-white text-black rounded-lg text-sm font-bold outline-none cursor-pointer"
          >
            {flavors.map((f) => {
              // AQUÍ ESTÁ LA MAGIA: Buscamos el stock basándonos en 'originId'
              const stockInOrigin = f.locationStocks.find((s: any) => s.locationId === originId)?.quantity || 0;
              
              return (
                <option key={f.id} value={f.id}>
                  {f.name} (Disp. en Origen: {stockInOrigin})
                </option>
              );
            })}
          </select>
        </div>

        {/* 3. DESTINO */}
        <div className="flex flex-col">
          <label className="text-xs font-bold uppercase opacity-70 mb-1">Hacia (Destino)</label>
          <select 
            name="toLocationId" 
            className="p-3 bg-white text-black rounded-lg text-sm font-bold outline-none cursor-pointer"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} {loc.isDefault ? "(Principal)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* 4. CANTIDAD Y BOTÓN */}
        <div className="flex gap-2 items-end">
          <div className="w-20">
            <label className="text-xs font-bold uppercase opacity-70 mb-1">Cant.</label>
            <input 
              name="quantity" 
              type="number" 
              min="1" 
              className="w-full p-3 bg-white text-black rounded-lg font-bold text-center outline-none" 
              required 
            />
          </div>
          <button 
            type="submit" 
            className="flex-1 bg-green-500 hover:bg-green-400 text-white p-3 rounded-lg font-black transition-all shadow-lg active:scale-95"
          >
            MOVER
          </button>
        </div>
      </form>
    </div>
  );
};