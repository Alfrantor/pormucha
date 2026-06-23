"use client";

import React, { useState, useMemo } from "react";
import { Plus, X, Pencil, Archive, PackageOpen, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import {
  createRawMaterial,
  updateRawMaterial,
  archiveRawMaterial,
  registerRawMaterialMovement,
} from "@/app/_actions/raw-materials";

const UNITS = ["kg", "g", "litros", "ml", "piezas", "cajas", "bolsas", "metros", "latas"];

function totalStock(mat: any): number {
  return (mat.stocks || []).reduce((s: number, st: any) => s + Number(st.quantity), 0);
}

function stockBadge(mat: any) {
  const total = totalStock(mat);
  const min = Number(mat.minStock ?? 0);
  if (total === 0) return "bg-red-100 text-red-700";
  if (min > 0 && total <= min) return "bg-amber-100 text-amber-700";
  return "bg-green-100 text-green-700";
}

const EMPTY_FORM = { name: "", unit: "kg", category: "", description: "", minStock: "", cost: "" };

export function TabMateriasPrimas({ rawMaterials: initial, locations }: { rawMaterials: any[]; locations: any[] }) {
  const [materials, setMaterials] = useState<any[]>(initial);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // ── Modal catálogo ──
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // ── Modal movimiento ──
  const [movModal, setMovModal] = useState<any | null>(null);
  const [movForm, setMovForm] = useState({ type: "IN", locationId: "", quantity: "", reason: "" });
  const [movSaving, setMovSaving] = useState(false);

  // ── Modal historial ──
  const [histModal, setHistModal] = useState<any | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials
      .filter(m => (showArchived ? m.isArchived : !m.isArchived))
      .filter(m => !q || m.name.toLowerCase().includes(q) || (m.category || "").toLowerCase().includes(q));
  }, [materials, search, showArchived]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEdit = (mat: any) => {
    setEditing(mat);
    setForm({
      name: mat.name,
      unit: mat.unit,
      category: mat.category || "",
      description: mat.description || "",
      minStock: mat.minStock != null ? String(Number(mat.minStock)) : "",
      cost: mat.cost != null ? String(Number(mat.cost)) : "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.unit) { toast.error("Nombre y unidad son obligatorios"); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      unit: form.unit,
      category: form.category.trim() || undefined,
      description: form.description.trim() || undefined,
      minStock: form.minStock ? parseFloat(form.minStock) : 0,
      cost: form.cost ? parseFloat(form.cost) : undefined,
    };
    if (editing) {
      const res = await updateRawMaterial(editing.id, payload);
      setSaving(false);
      if (res.success) {
        setMaterials(prev => prev.map(m => m.id !== editing.id ? m : { ...m, ...payload }));
        toast.success("Material actualizado");
        setModalOpen(false);
      } else { toast.error(res.error || "Error"); }
    } else {
      const res = await createRawMaterial(payload);
      setSaving(false);
      if (res.success) {
        setMaterials(prev => [{ id: res.id, ...payload, stocks: [], movements: [], isArchived: false, createdAt: new Date().toISOString() }, ...prev]);
        toast.success("Material creado");
        setModalOpen(false);
      } else { toast.error(res.error || "Error"); }
    }
  };

  const handleArchive = async (mat: any) => {
    const res = await archiveRawMaterial(mat.id, !mat.isArchived);
    if (res.success) {
      setMaterials(prev => prev.map(m => m.id !== mat.id ? m : { ...m, isArchived: !mat.isArchived }));
      toast.success(mat.isArchived ? "Material restaurado" : "Material archivado");
    } else { toast.error(res.error || "Error"); }
  };

  const openMov = (mat: any) => {
    setMovModal(mat);
    setMovForm({ type: "IN", locationId: locations[0]?.id || "", quantity: "", reason: "" });
  };

  const handleMov = async () => {
    if (!movForm.locationId || !movForm.quantity || !movForm.reason.trim()) {
      toast.error("Completa todos los campos"); return;
    }
    setMovSaving(true);
    const res = await registerRawMaterialMovement({
      rawMaterialId: movModal.id,
      locationId: movForm.locationId,
      type: movForm.type as "IN" | "OUT",
      quantity: parseFloat(movForm.quantity),
      reason: movForm.reason.trim(),
    });
    setMovSaving(false);
    if (res.success) {
      setMaterials(prev => prev.map(m => {
        if (m.id !== movModal.id) return m;
        const stocks = [...(m.stocks || [])];
        const idx = stocks.findIndex((s: any) => s.locationId === movForm.locationId);
        if (idx >= 0) stocks[idx] = { ...stocks[idx], quantity: res.newQuantity };
        else stocks.push({ locationId: movForm.locationId, quantity: res.newQuantity });
        const newMov = { id: Date.now().toString(), type: movForm.type, quantity: parseFloat(movForm.quantity), reason: movForm.reason, createdAt: new Date().toISOString() };
        return { ...m, stocks, movements: [newMov, ...(m.movements || [])] };
      }));
      toast.success(movForm.type === "IN" ? "Entrada registrada" : "Salida registrada");
      setMovModal(null);
    } else { toast.error(res.error || "Error"); }
  };

  const lowStockCount = materials.filter(m => !m.isArchived && (() => {
    const total = totalStock(m);
    const min = Number(m.minStock ?? 0);
    return min > 0 && total <= min;
  })()).length;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Materia Prima</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            {filtered.length} materiales · {lowStockCount > 0 && <span className="text-amber-600">{lowStockCount} bajo mínimo</span>}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowArchived(v => !v)}
            className={`px-3 py-2 text-[10px] font-bold uppercase rounded-xl transition-all border ${showArchived ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
          >
            {showArchived ? "Ver activos" : "Ver archivados"}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-black uppercase rounded-xl hover:bg-gray-700 transition-all"
          >
            <Plus size={13} /> Nuevo material
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar material o categoría..."
          className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-gray-300 bg-white"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <PackageOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold text-sm">{search ? "Sin resultados" : "No hay materiales aún"}</p>
            {!search && <p className="text-xs mt-1">Crea el primero con "+ Nuevo material"</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Material</th>
                <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoría</th>
                <th className="px-5 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock total</th>
                <th className="px-5 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Mínimo</th>
                <th className="px-5 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Costo unit.</th>
                <th className="px-5 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(mat => {
                const total = totalStock(mat);
                const badge = stockBadge(mat);
                return (
                  <tr key={mat.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-black text-gray-900">{mat.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{mat.unit}</p>
                      {mat.description && <p className="text-[10px] text-gray-400 mt-0.5">{mat.description}</p>}
                    </td>
                    <td className="px-5 py-4">
                      {mat.category ? (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-bold">{mat.category}</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-sm font-black px-2.5 py-1 rounded-full ${badge}`}>
                        {total % 1 === 0 ? total : total.toFixed(2)} {mat.unit}
                      </span>
                      {/* Stock por ubicación */}
                      {(mat.stocks || []).length > 1 && (
                        <div className="mt-1 space-y-0.5">
                          {mat.stocks.map((s: any) => (
                            <p key={s.locationId} className="text-[9px] text-gray-400">
                              {s.location?.name || s.locationId}: {Number(s.quantity).toFixed(2)}
                            </p>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-xs font-bold text-gray-500">
                        {Number(mat.minStock) > 0 ? `${Number(mat.minStock)} ${mat.unit}` : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-xs font-bold text-gray-500">
                        {mat.cost != null ? `$${Number(mat.cost).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openMov(mat)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black uppercase rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                          title="Registrar movimiento"
                        >
                          <ArrowDownCircle size={12} className="text-green-500" />
                          <ArrowUpCircle size={12} className="text-red-400" />
                          Mov.
                        </button>
                        <button
                          onClick={() => setHistModal(mat)}
                          className="px-2.5 py-1.5 text-[10px] font-black uppercase rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                          title="Ver historial"
                        >
                          Historial
                        </button>
                        <button onClick={() => openEdit(mat)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition" title="Editar">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleArchive(mat)} className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition" title={mat.isArchived ? "Restaurar" : "Archivar"}>
                          <Archive size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal crear / editar ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">{editing ? "Editar material" : "Nuevo material"}</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Nombre *</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ej: Té negro, Azúcar, SCOBY..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Unidad *</label>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Categoría</label>
                  <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="Ej: Fermentados, Base..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Stock mínimo</label>
                  <input type="number" min="0" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))}
                    placeholder="0" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Costo unitario</label>
                  <input type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                    placeholder="$0.00" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Descripción</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2} placeholder="Notas o especificaciones..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none" />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-gray-900 text-white py-3 rounded-2xl font-black hover:bg-gray-700 transition disabled:opacity-50">
                {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear material"}
              </button>
              <button onClick={() => setModalOpen(false)} className="px-5 py-3 rounded-2xl border-2 border-gray-200 font-black text-gray-500 hover:bg-gray-50 transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal movimiento ── */}
      {movModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black">Registrar movimiento</h3>
                <p className="text-sm text-gray-400 font-bold">{movModal.name}</p>
              </div>
              <button onClick={() => setMovModal(null)} className="p-2 rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>

            {/* Tipo */}
            <div className="grid grid-cols-2 gap-2">
              {(["IN", "OUT"] as const).map(t => (
                <button key={t} onClick={() => setMovForm(f => ({ ...f, type: t }))}
                  className={`py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2 transition ${movForm.type === t
                    ? t === "IN" ? "bg-green-500 text-white border-green-500" : "bg-red-500 text-white border-red-500"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                  {t === "IN" ? <><ArrowDownCircle size={16} /> Entrada</> : <><ArrowUpCircle size={16} /> Salida</>}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {/* Ubicación */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Ubicación</label>
                <select value={movForm.locationId} onChange={e => setMovForm(f => ({ ...f, locationId: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white">
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              {/* Cantidad */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Cantidad ({movModal.unit})</label>
                <input type="number" min="0.01" step="0.01" value={movForm.quantity} onChange={e => setMovForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder="0" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-black focus:outline-none focus:border-gray-400" />
              </div>
              {/* Razón */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Motivo</label>
                <input type="text" value={movForm.reason} onChange={e => setMovForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Ej: Compra proveedor, Producción lote #12..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={handleMov} disabled={movSaving}
                className={`flex-1 py-3 rounded-2xl font-black text-white transition disabled:opacity-50 ${movForm.type === "IN" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}>
                {movSaving ? "Registrando..." : movForm.type === "IN" ? "Registrar entrada" : "Registrar salida"}
              </button>
              <button onClick={() => setMovModal(null)} className="px-5 py-3 rounded-2xl border-2 border-gray-200 font-black text-gray-500 hover:bg-gray-50 transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal historial ── */}
      {histModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black">Historial</h3>
                <p className="text-sm text-gray-400 font-bold">{histModal.name}</p>
              </div>
              <button onClick={() => setHistModal(null)} className="p-2 rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>

            {(histModal.movements || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8 font-bold">Sin movimientos registrados</p>
            ) : (
              <div className="space-y-2">
                {histModal.movements.map((mov: any) => (
                  <div key={mov.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl ${mov.type === "IN" ? "bg-green-50" : "bg-red-50"}`}>
                    <span className="mt-0.5 shrink-0">{mov.type === "IN" ? <ArrowDownCircle size={16} className="text-green-600" /> : <ArrowUpCircle size={16} className="text-red-500" />}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black ${mov.type === "IN" ? "text-green-800" : "text-red-700"}`}>
                        {mov.type === "IN" ? "+" : "-"}{Number(mov.quantity).toFixed(2)} {histModal.unit}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{mov.reason}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {new Date(mov.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setHistModal(null)} className="w-full py-3 rounded-2xl border-2 border-gray-200 font-black text-gray-500 hover:bg-gray-50 transition">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
