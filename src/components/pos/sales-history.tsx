"use client";
import { useState, useEffect, Fragment } from "react";
import { getSalesHistory } from "@/actions/get-sales-history";
import { reprintTicket } from "@/components/pos/ticket-receipt";

const formatMoney = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Helpers para fechas rápidas
const getToday = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

const getWeekStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // domingo
  return d.toISOString().split("T")[0];
};

const getMonthStart = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
};

interface SalesHistoryProps {
  locations: any[];
}

export const SalesHistory = ({ locations }: SalesHistoryProps) => {
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [sales, setSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);

  // Buscar ventas
  const fetchSales = async () => {
    setIsLoading(true);
    try {
      // Pasamos las fechas como YYYY-MM-DD, el server action se encarga del rango
      const result = await getSalesHistory({
        startDate,
        endDate,
        locationId: locationFilter,
      });
      setSales(result);
    } catch (error) {
      console.error("Error al cargar historial:", error);
      alert("Error al cargar historial");
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar ventas del día al montar
  useEffect(() => {
    fetchSales();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Estadísticas
  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  const totalSales = sales.length;
  const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
  const cashSales = sales.filter(s => s.paymentMethod === "CASH").reduce((acc, s) => acc + s.total, 0);
  const cardSales = sales.filter(s => s.paymentMethod === "CARD").reduce((acc, s) => acc + s.total, 0);

  // Presets rapidos
  const applyPreset = (preset: "today" | "week" | "month") => {
    const today = getToday();
    switch (preset) {
      case "today":
        setStartDate(today);
        setEndDate(today);
        break;
      case "week":
        setStartDate(getWeekStart());
        setEndDate(today);
        break;
      case "month":
        setStartDate(getMonthStart());
        setEndDate(today);
        break;
    }
  };

  return (
    <div className="p-6 overflow-y-auto h-full">
      {/* HEADER */}
      <h1 className="text-2xl font-black mb-6">📋 Historial de Ventas</h1>

      {/* FILTROS */}
      <div className="bg-white rounded-2xl shadow-sm border p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Fecha Inicio */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Desde</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-2.5 border rounded-lg font-mono text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          {/* Fecha Fin */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-2.5 border rounded-lg font-mono text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          {/* Sucursal */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sucursal</label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="p-2.5 border rounded-lg font-bold text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="ALL">Todas</option>
              {locations.map((loc: any) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          {/* Botón buscar */}
          <button
            onClick={fetchSales}
            disabled={isLoading}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-black transition-all disabled:opacity-50 shadow-sm"
          >
            {isLoading ? "Buscando..." : "🔍 Buscar"}
          </button>
        </div>

        {/* Presets rápidos */}
        <div className="flex gap-2 mt-3">
          <button onClick={() => applyPreset("today")} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-all">
            Hoy
          </button>
          <button onClick={() => applyPreset("week")} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-all">
            Esta Semana
          </button>
          <button onClick={() => applyPreset("month")} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-all">
            Este Mes
          </button>
        </div>
      </div>

      {/* TARJETAS DE RESUMEN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase">Ventas</p>
          <p className="text-2xl font-black text-gray-900">{totalSales}</p>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase">Ingresos</p>
          <p className="text-2xl font-black text-green-600">${formatMoney(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase">Ticket Promedio</p>
          <p className="text-2xl font-black text-blue-600">${formatMoney(avgTicket)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase">💵 / 💳</p>
          <p className="text-lg font-black">
            <span className="text-green-600">${formatMoney(cashSales)}</span>
            {" / "}
            <span className="text-blue-600">${formatMoney(cardSales)}</span>
          </p>
        </div>
      </div>

      {/* TABLA DE VENTAS */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-2">⏳</p>
            <p className="font-bold">Cargando ventas...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p className="font-bold">No se encontraron ventas en este rango</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Fecha / Hora</th>
                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Sucursal</th>
                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Método</th>
                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Items</th>
                <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase">Total</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase w-12"></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
                const date = new Date(sale.createdAt);
                const isExpanded = expandedSale === sale.id;
                return (
                  <Fragment key={sale.id}>
                    <tr
                      className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setExpandedSale(isExpanded ? null : sale.id)}
                    >
                      <td className="p-4">
                        <p className="font-bold text-sm">{date.toLocaleDateString("es-MX")}</p>
                        <p className="text-xs text-gray-400">{date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</p>
                      </td>
                      <td className="p-4 text-sm">{sale.locationName}</td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          sale.paymentMethod === "CASH"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {sale.paymentMethod === "CASH" ? "💵 Efectivo" : "💳 Tarjeta"}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {sale.items.length} producto{sale.items.length !== 1 ? "s" : ""}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-sm">
                        ${formatMoney(sale.total)}
                      </td>
                      <td className="p-4 text-center text-gray-400">
                        {isExpanded ? "▲" : "▼"}
                      </td>
                    </tr>
                    {/* DETALLE EXPANDIDO */}
                    {isExpanded && (
                      <tr key={`${sale.id}-detail`} className="bg-gray-50">
                        <td colSpan={6} className="p-4">
                          <div className="bg-white rounded-lg border p-4">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-3">Detalle del ticket</p>
                            <div className="space-y-2">
                              {sale.items.map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center text-sm">
                                  <div>
                                    <span className="font-bold">{item.productName}</span>
                                    <span className="text-gray-400 ml-2">x{item.quantity}</span>
                                  </div>
                                  <span className="font-mono">${formatMoney(item.subtotal)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="border-t mt-3 pt-3 flex justify-between font-bold">
                              <span>Total</span>
                              <span className="font-mono">${formatMoney(sale.total)}</span>
                            </div>
                            {sale.userId && (
                              <p className="text-xs text-gray-400 mt-2">Vendedor: {sale.userId}</p>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                reprintTicket(sale);
                              }}
                              className="mt-3 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-all"
                            >
                              🖨️ Reimprimir Ticket
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
