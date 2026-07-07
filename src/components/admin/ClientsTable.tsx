"use client";

import { useMemo, useState } from "react";
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
    return clients.filter((c) => {
      if (
        q &&
        !c.fullName?.toLowerCase().includes(q) &&
        !c.email?.toLowerCase().includes(q) &&
        !c.rfc?.toLowerCase().includes(q) &&
        !c.businessName?.toLowerCase().includes(q)
      ) {
        return false;
      }
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

  const getTypeLabel = (type: string) => {
    if (type === "FISICA") return "Física";
    if (type === "JURIDICA") return "Moral";
    return "Público general";
  };

  const getTypeClassName = (type: string) => {
    if (type === "FISICA") return "bg-blue-50 text-blue-700";
    if (type === "JURIDICA") return "bg-purple-50 text-purple-700";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} · página {safePage} de {totalPages}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingClient(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Nombre, correo, RFC o razón social..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={classificationFilter}
          onChange={(e) => {
            setClassificationFilter(e.target.value);
            resetPage();
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Clasificación</option>
          <option value="MINORISTA">Minorista</option>
          <option value="MAYORISTA">Mayorista</option>
          <option value="DISTRIBUIDOR">Distribuidor</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            resetPage();
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tipo</option>
          <option value="FISICA">Persona física</option>
          <option value="JURIDICA">Persona moral</option>
          <option value="PUBLICO_GENERAL">Público en general</option>
        </select>

        {giros.length > 0 && (
          <select
            value={giroFilter}
            onChange={(e) => {
              setGiroFilter(e.target.value);
              resetPage();
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Giro</option>
            {giros.map((g: any) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}

        {(search || classificationFilter || typeFilter || giroFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setClassificationFilter("");
              setTypeFilter("");
              setGiroFilter("");
              resetPage();
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-500 transition hover:bg-gray-50 hover:text-gray-800"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-black uppercase tracking-widest text-gray-400">
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">RFC / Contacto</th>
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
                <td colSpan={8} className="px-6 py-10 text-center text-sm italic text-gray-400">
                  No hay clientes con esos filtros
                </td>
              </tr>
            ) : (
              paginated.map((client: any) => (
                <tr
                  key={client.id}
                  onClick={() => onClientClick?.(client)}
                  className={`transition-colors ${onClientClick ? "cursor-pointer" : ""} ${
                    selectedClientId === client.id ? "border-l-4 border-l-blue-500 bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-5 py-3">
                    <p className="text-sm font-semibold leading-tight text-gray-900">{client.fullName}</p>
                    {client.businessName && <p className="text-xs text-gray-400">{client.businessName}</p>}
                  </td>
                  <td className="px-5 py-3">
                    {client.rfc && <p className="font-mono text-xs text-gray-700">{client.rfc}</p>}
                    <p className="text-xs text-gray-400">{client.email || client.phone || "Sin dato adicional"}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${getTypeClassName(client.type)}`}>
                      {getTypeLabel(client.type)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${classColors[client.classification] || "bg-gray-50 text-gray-600"}`}>
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
                          <span className="font-normal text-gray-400">
                            {" "}
                            / ${client.creditLimit.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
                          </span>
                        </p>
                        <div className="mt-1 h-1 w-full rounded-full bg-gray-100">
                          <div
                            className={`h-1 rounded-full ${
                              client.creditUsed / client.creditLimit > 0.8
                                ? "bg-red-500"
                                : client.creditUsed / client.creditLimit > 0.5
                                  ? "bg-amber-400"
                                  : "bg-green-500"
                            }`}
                            style={{ width: `${Math.min((client.creditUsed / client.creditLimit) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">Sin límite</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${statusColors[client.status] || "border-gray-200 bg-gray-50 text-gray-500"}`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <Link href={`/admin/clients/${client.id}`} className="rounded-lg p-1.5 text-blue-600 transition hover:bg-blue-50" title="Ver detalles">
                        <Eye size={15} />
                      </Link>
                      <button
                        onClick={() => {
                          setEditingClient(client);
                          setShowModal(true);
                        }}
                        className="rounded-lg p-1.5 text-yellow-600 transition hover:bg-yellow-50"
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-gray-400">
            Mostrando {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="rounded-lg border border-gray-200 p-1.5 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
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
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition ${
                    safePage === p ? "bg-blue-600 text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="rounded-lg border border-gray-200 p-1.5 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <ClientModal
          client={editingClient}
          onClose={() => {
            setShowModal(false);
            setEditingClient(null);
          }}
        />
      )}
    </div>
  );
}
