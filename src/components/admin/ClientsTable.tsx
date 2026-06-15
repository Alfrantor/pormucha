"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Edit, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ClientModal } from "./ClientModal";

const PAGE_SIZE = 20;

interface ClientsTableProps {
  clients: any[];
  total: number;
  giros: any[];
  onClientClick?: (client: any) => void;
  selectedClientId?: string;
}

export function ClientsTable({ clients, total, giros, onClientClick, selectedClientId }: ClientsTableProps) {
  const [search, setSearch] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [giroFilter, setGiroFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return clients.filter(c => {
      if (q && !c.fullName?.toLowerCase().includes(q) && !c.email?.toLowerCase().includes(q) && !c.rfc?.toLowerCase().includes(q)) return false;
      if (classificationFilter && c.classification !== classificationFilter) return false;
      if (typeFilter && c.type !== typeFilter) return false;
      if (giroFilter && c.giroId !== giroFilter) return false;
      return true;
    });
  }, [clients, search, classificationFilter, typeFilter, giroFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetPage = () => setPage(1);

  const statusColors: Record<string, string> = {
    ACTIVO: "bg-green-50 text-green-700 border-green-200",
    INACTIVO: "bg-gray-50 text-gray-600 border-gray-200",
    BLOQUEADO: "bg-red-50 text-red-700 border-red-200",
  };

  const classColors: Record<string, string> = {
    MINORISTA: "bg-blue-50 text-blue-600",
    MAYORISTA: "bg-purple-50 text-purple-600",
    DISTRIBUIDOR: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
          <p className="text-xs text-gray-400 mt-0.5">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""} · página {safePage} de {totalPages}</p>
        </div>
        <button
          onClick={() => { setEditingClient(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-bold"
        >
          <Plus size={16} /> Nuevo Cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Nombre, email, RFC..."
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage(); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={classificationFilter}
          onChange={e => { setClassificationFilter(e.target.value); resetPage(); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Clasificación</option>
          <option value="MINORISTA">Minorista</option>
          <option value="MAYORISTA">Mayorista</option>
          <option value="DISTRIBUIDOR">Distribuidor</option>
        </select>

        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); resetPage(); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Tipo</option>
          <option value="FISICA">Persona Física</option>
          <option value="JURIDICA">Persona Moral</option>
        </select>

        {giros.length > 0 && (
          <select
            value={giroFilter}
            onChange={e => { setGiroFilter(e.target.value); resetPage(); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Giro</option>
            {giros.map((g: any) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}

        {(search || classificationFilter || typeFilter || giroFilter) && (
          <button
            onClick={() => { setSearch(""); setClassificationFilter(""); setTypeFilter(""); setGiroFilter(""); resetPage(); }}
            className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-black text-gray-400 uppercase tracking-widest">
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">RFC / Email</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Clasificación</th>
              <th className="px-5 py-3">Giro</th>
              <th className="px-5 py-3">Crédito</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-400 text-sm italic">
                  No hay clientes con esos filtros
                </td>
              </tr>
            ) : (
              paginated.map((client: any) => (
                <tr
                  key={client.id}
                  onClick={() => onClientClick?.(client)}
                  className={`transition-colors ${onClientClick ? "cursor-pointer" : ""} ${
                    selectedClientId === client.id
                      ? "bg-blue-50 border-l-4 border-l-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-5 py-3">
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{client.fullName}</p>
                    {client.businessName && <p className="text-xs text-gray-400">{client.businessName}</p>}
                  </td>
                  <td className="px-5 py-3">
                    {client.rfc && <p className="font-mono text-xs text-gray-700">{client.rfc}</p>}
                    <p className="text-xs text-gray-400">{client.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${client.type === "FISICA" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                      {client.type === "FISICA" ? "Física" : "Moral"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${classColors[client.classification] || "bg-gray-50 text-gray-600"}`}>
                      {client.classification}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-gray-500">{client.giro?.name || <span className="text-gray-300">—</span>}</span>
                  </td>
                  <td className="px-5 py-3">
                    {client.creditLimit > 0 ? (
                      <div>
                        <p className="text-xs font-bold text-gray-800">
                          ${client.creditUsed.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
                          <span className="text-gray-400 font-normal"> / ${client.creditLimit.toLocaleString("es-MX", { minimumFractionDigits: 0 })}</span>
                        </p>
                        <div className="w-full bg-gray-100 rounded-full h-1 mt-1">
                          <div
                            className={`h-1 rounded-full ${client.creditUsed / client.creditLimit > 0.8 ? "bg-red-500" : client.creditUsed / client.creditLimit > 0.5 ? "bg-amber-400" : "bg-green-500"}`}
                            style={{ width: `${Math.min((client.creditUsed / client.creditLimit) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">Sin límite</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${statusColors[client.status] || "bg-gray-50 text-gray-500 border-gray-200"}`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <Link href={`/admin/clientes/${client.id}`} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition" title="Ver detalles">
                        <Eye size={15} />
                      </Link>
                      <button
                        onClick={() => { setEditingClient(client); setShowModal(true); }}
                        className="p-1.5 hover:bg-yellow-50 text-yellow-600 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-gray-400">
            Mostrando {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p: number;
              if (totalPages <= 7) {
                p = i + 1;
              } else if (safePage <= 4) {
                p = i < 6 ? i + 1 : totalPages;
              } else if (safePage >= totalPages - 3) {
                p = i === 0 ? 1 : totalPages - 6 + i;
              } else {
                const map = [1, safePage - 2, safePage - 1, safePage, safePage + 1, safePage + 2, totalPages];
                p = map[i];
              }
              return (
                <button
                  key={i}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-xs rounded-lg font-bold transition ${safePage === p ? "bg-blue-600 text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <ClientModal
          client={editingClient}
          onClose={() => { setShowModal(false); setEditingClient(null); }}
        />
      )}
    </div>
  );
}
