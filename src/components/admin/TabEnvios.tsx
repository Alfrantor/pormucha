"use client";

import React, { useState } from "react";
import { ArrowRight, Package, Truck, Check } from "lucide-react";
import { createTransfer, receiveTransfer } from "@/actions/admin-actions";

export function TabEnvios({ activeFlavors, activeLocations, transfers, userEmail }: any) {
  const pendingTransfers = transfers.filter((t: any) => t.status === "PENDING");
  const completedTransfers = transfers.filter((t: any) => t.status === "COMPLETED" || t.status === "CANCELLED");

  return (
    <div className="space-y-8 animate-fade-in">
      <h2 className="text-2xl font-black">🚚 Envíos y Custodia (Transfers)</h2>

      {/* CREAR NUEVO ENVÍO */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm border-blue-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
        <h3 className="font-bold text-blue-900 uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
          <Truck size={14} /> Nuevo Envío en Tránsito
        </h3>
        
        <form action={createTransfer} onSubmit={(e) => { 
            const flavorId = (e.currentTarget.elements.namedItem("flavorId") as HTMLSelectElement).value;
            const fromLocationId = (e.currentTarget.elements.namedItem("fromLocationId") as HTMLSelectElement).value;
            const quantity = parseInt((e.currentTarget.elements.namedItem("quantitySent") as HTMLInputElement).value);
            
            const selectedFlavor = activeFlavors.find((f: any) => f.id === flavorId);
            const availableStock = selectedFlavor?.locationStocks?.find((s: any) => s.locationId === fromLocationId)?.quantity || 0;

            if (quantity > availableStock) {
              e.preventDefault();
              alert(`❌ ERROR: No hay suficiente stock en el origen.\n\nEl origen seleccionado solo cuenta con ${availableStock} botellas de este sabor, e intentas enviar ${quantity}.`);
              return;
            }

            if (!confirm(`¿Estás seguro de generar este envío por ${quantity} botellas?\n\nAl confirmar, las piezas se descontarán inmediatamente del inventario de origen y quedarán En Tránsito.`)) {
              e.preventDefault(); 
            }
          }} className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <input type="hidden" name="senderEmail" value={userEmail} />
          
          <div className="col-span-12 md:col-span-3">
            <select name="flavorId" className="w-full p-2.5 bg-gray-50 rounded-lg text-sm font-bold border border-transparent hover:border-gray-200 outline-none" required>
              <option value="">-- Seleccionar Sabor --</option>
              {activeFlavors.map((f: any) => (<option key={f.id} value={f.id}>{f.name}</option>))}
            </select>
          </div>
          
          <div className="col-span-12 md:col-span-2">
            <select name="fromLocationId" className="w-full p-2.5 bg-gray-50 rounded-lg text-sm font-bold border outline-none text-red-700" required>
              <option value="">-- ORIGEN --</option>
              {activeLocations.map((loc: any) => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
            </select>
          </div>

          <div className="col-span-12 md:col-span-1 flex items-center justify-center">
            <ArrowRight className="text-gray-300 hidden md:block" />
          </div>

          <div className="col-span-12 md:col-span-2">
             <select name="toLocationId" className="w-full p-2.5 bg-gray-50 rounded-lg text-sm font-bold border outline-none text-blue-700" required>
              <option value="">-- DESTINO --</option>
              {activeLocations.map((loc: any) => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
            </select>
          </div>

          <div className="col-span-12 md:col-span-1">
            <input name="quantitySent" type="number" min="1" placeholder="Cant." className="w-full p-2.5 rounded-lg bg-white border text-sm font-bold" required />
          </div>

          <div className="col-span-12 md:col-span-3">
             <input name="observations" type="text" placeholder="Notas (Ej: Lotes, Placas...)" className="w-full p-2.5 rounded-lg bg-white border text-sm" />
          </div>

          <div className="col-span-12 flex justify-end">
             <button className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2">
               Generar Envío
             </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PENDIENTES */}
        <div>
           <h3 className="font-bold text-orange-600 uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
             <Package size={14} /> En Tránsito (Pendientes de Recibir)
           </h3>
           <div className="space-y-4">
             {pendingTransfers.length === 0 && <p className="text-gray-400 text-sm italic">No hay envíos en tránsito.</p>}
             {pendingTransfers.map((t: any) => (
                <div key={t.id} className="bg-white border-2 border-orange-200 p-4 rounded-xl shadow-sm relative">
                  <span className="absolute -top-3 right-4 bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-full shrink-0">
                    EN TRÁNSITO
                  </span>
                  <div className="flex justify-between items-start mb-3">
                     <div>
                        <p className="font-black text-sm">{t.flavor.name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{new Date(t.createdAt).toLocaleString()}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-xl font-black text-orange-600">{t.quantitySent} PZS</p>
                        <p className="text-[10px] text-gray-400">Enviado por: {t.senderEmail?.split('@')[0]}</p>
                     </div>
                  </div>

                  <div className="bg-gray-50 p-2 rounded flex items-center justify-between text-xs font-bold mb-3 border">
                     <span className="text-red-700">{t.fromLocation.name}</span>
                     <ArrowRight size={12} className="text-gray-400 mx-2" />
                     <span className="text-blue-700">{t.toLocation.name}</span>
                  </div>

                  {t.observations && (
                    <p className="text-xs text-gray-500 italic mb-4">Notas: {t.observations}</p>
                  )}

                  <hr className="my-3 border-orange-100" />
                  
                  <form action={receiveTransfer} onSubmit={(e) => { if (!confirm('¿Estás seguro de recibir este envío? Ingresará a tu inventario.')) e.preventDefault(); }} className="flex flex-col gap-2 bg-orange-50/50 p-3 rounded-lg border border-orange-100">
                     <p className="text-[10px] font-bold text-orange-800 uppercase mb-1">Cerrar Transferencia (Recibir)</p>
                     <input type="hidden" name="transferId" value={t.id} />
                     <input type="hidden" name="receiverEmail" value={userEmail} />
                     <div className="flex gap-2">
                        <input name="quantityReceived" type="number" min="0" max={t.quantitySent} defaultValue={t.quantitySent} className="w-20 p-2 rounded bg-white border text-sm font-black text-center text-green-700 outline-none" required title="Piezas que llegaron bien" />
                        <input name="observations" type="text" placeholder="Observaciones (Merma, Roto...)" className="flex-1 p-2 rounded bg-white border text-xs outline-none" />
                        <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-bold text-xs flex items-center gap-1 shrink-0">
                          <Check size={14} /> Recibir
                        </button>
                     </div>
                     <p className="text-[10px] text-gray-500">Si llegaron piezas rotas, ajusta el número. La diferencia se marcará como merma automáticamente.</p>
                  </form>
                </div>
             ))}
           </div>
        </div>

        {/* HISTORIAL COMPLETADOS */}
        <div>
           <h3 className="font-bold text-gray-800 uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
             <Check size={14} /> Historial (Llegaron a Destino)
           </h3>
           <div className="space-y-4">
             {completedTransfers.length === 0 && <p className="text-gray-400 text-sm italic">No hay historial reciente.</p>}
             {completedTransfers.map((t: any) => {
                const isShort = t.quantityReceived < t.quantitySent;
                return (
                 <div key={t.id} className="bg-white border p-4 rounded-xl shadow-sm opacity-80">
                  <div className="flex justify-between items-start mb-2">
                     <div>
                        <p className="font-black text-sm">{t.flavor.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{new Date(t.createdAt).toLocaleString()} ➔ {new Date(t.updatedAt).toLocaleTimeString()}</p>
                     </div>
                     <div className="text-right">
                        <p className={`text-lg font-black ${isShort ? 'text-red-600' : 'text-green-600'}`}>{t.quantityReceived} / {t.quantitySent}</p>
                        <p className="text-[10px] text-gray-400">Recibió: {t.receiverEmail?.split('@')[0]}</p>
                     </div>
                  </div>
                  <div className="flex items-center text-[10px] font-bold text-gray-600 mt-2 gap-1 mb-1">
                     <span>{t.fromLocation.name}</span> <ArrowRight size={10} /> <span>{t.toLocation.name}</span>
                  </div>
                  {t.observations && (
                    <p className="text-[10px] text-gray-500 whitespace-pre-line mt-2 bg-gray-50 p-2 rounded italic">
                      {t.observations}
                    </p>
                  )}
                </div>
               );
             })}
           </div>
        </div>

      </div>
    </div>
  );
}
