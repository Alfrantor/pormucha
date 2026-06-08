"use client";

import { useState } from "react";
import { Client } from "@prisma/client";
import { Search, Plus, Edit, Trash2, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { ClientModal } from "./ClientModal";
import Link from "next/link";

interface ClientsTableProps {
  clients: any[];
  total: number;
  onClientClick?: (client: any) => void;
  selectedClientId?: string;
}

export function ClientsTable({ clients, total, onClientClick, selectedClientId }: ClientsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("TODOS");
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams();
    if (value) params.set("search", value);
    if (filter !== "TODOS") params.set("classification", filter);
    router.push(`/admin/clientes?${params.toString()}`);
  };

  const handleFilter = (value: string) => {
    setFilter(value);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (value !== "TODOS") params.set("classification", value);
    router.push(`/admin/clientes?${params.toString()}`);
  };

  const statusColors = {
    ACTIVO: "bg-green-50 text-green-700 border-green-200",
    INACTIVO: "bg-gray-50 text-gray-600 border-gray-200",
    BLOQUEADO: "bg-red-50 text-red-700 border-red-200",
  };

  const classificationColors = {
    MINORISTA: "bg-blue-50 text-blue-600",
    MAYORISTA: "bg-purple-50 text-purple-600",
    DISTRIBUIDOR: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
        <button
          onClick={() => {
            setEditingClient(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Nuevo Cliente
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, email, RFC..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filter}
          onChange={(e) => handleFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="TODOS">Todos</option>
          <option value="MINORISTA">Minorista</option>
          <option value="MAYORISTA">Mayorista</option>
          <option value="DISTRIBUIDOR">Distribuidor</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 font-bold text-gray-600 text-sm">Cliente</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-sm">RFC / Email</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-sm">Tipo</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-sm">Clasificación</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-sm">Crédito</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-sm">Estado</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-sm">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No hay clientes registrados
                </td>
              </tr>
            ) : (
              clients.map((client: any) => (
                <tr
                  key={client.id}
                  onClick={() => onClientClick?.(client)}
                  className={`transition-colors ${onClientClick ? "cursor-pointer" : ""} ${
                    selectedClientId === client.id
                      ? "bg-blue-50 border-l-4 border-l-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{client.fullName}</p>
                        {selectedClientId === client.id && (
                          <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-black">SELECCIONADO</span>
                        )}
                      </div>
                      {client.businessName && (
                        <p className="text-xs text-gray-500">{client.businessName}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {client.rfc && <p className="font-mono text-xs">{client.rfc}</p>}
                    <p className="text-xs text-gray-500">{client.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        client.type === "FISICA" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {client.type === "FISICA" ? "Persona" : "Empresa"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        classificationColors[client.classification as keyof typeof classificationColors]
                      }`}
                    >
                      {client.classification}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="text-gray-900">
                      ${client.creditUsed.toFixed(2)} / ${client.creditLimit.toFixed(2)}
                    </div>
                    {client.creditUsed > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className={`h-1.5 rounded-full ${
                            client.creditUsed / client.creditLimit > 0.8
                              ? "bg-red-500"
                              : client.creditUsed / client.creditLimit > 0.5
                                ? "bg-yellow-500"
                                : "bg-green-500"
                          }`}
                          style={{ width: `${Math.min((client.creditUsed / client.creditLimit) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold border ${
                        statusColors[client.status as keyof typeof statusColors]
                      }`}
                    >
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2" onClick={e => e.stopPropagation()}>
                    <Link
                      href={`/admin/clientes/${client.id}`}
                      className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition"
                      title="Ver detalles"
                    >
                      <Eye size={18} />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingClient(client);
                        setShowModal(true);
                      }}
                      className="p-2 hover:bg-yellow-50 text-yellow-600 rounded-lg transition"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modales */}
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
