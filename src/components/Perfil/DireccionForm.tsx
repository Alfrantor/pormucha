"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateClientAddress } from "@/app/_actions/client";

export const DireccionForm = ({
  cliente,
  shippingAddress,
}: {
  cliente: any;
  shippingAddress?: any;
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const data = Object.fromEntries(formData);
      await updateClientAddress(data);
      router.refresh();
      alert("Datos de envío actualizados con éxito.");
    } catch {
      alert("Hubo un error al actualizar la dirección.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = "border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 w-full text-gray-800";
  const labelStyle = "text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Dirección de envío</h3>
          <p className="text-sm text-gray-500 mt-1">Aquí defines a dónde se surtirá tu suscripción.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-slate-600">
          Perfil
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col">
          <label className={labelStyle}>Teléfono de contacto</label>
          <input name="phone" defaultValue={cliente?.phone || ""} className={inputStyle} placeholder="55 1234 5678" required />
        </div>
        <div className="flex flex-col">
          <label className={labelStyle}>Calle / Avenida</label>
          <input name="street" defaultValue={shippingAddress?.street || ""} className={inputStyle} placeholder="Av. Siempre Viva" required />
        </div>
        <div className="flex flex-col">
          <label className={labelStyle}>Número</label>
          <input name="number" defaultValue={shippingAddress?.number || ""} className={inputStyle} placeholder="123" required />
        </div>
        <div className="flex flex-col">
          <label className={labelStyle}>Colonia / Barrio</label>
          <input name="neighborhood" defaultValue={shippingAddress?.neighborhood || ""} className={inputStyle} placeholder="Col. Centro" required />
        </div>
        <div className="flex flex-col">
          <label className={labelStyle}>Código postal</label>
          <input name="zipCode" defaultValue={shippingAddress?.zipCode || ""} className={inputStyle} placeholder="01000" required />
        </div>
        <div className="flex flex-col">
          <label className={labelStyle}>Ciudad</label>
          <input name="city" defaultValue={shippingAddress?.city || ""} className={inputStyle} placeholder="CDMX" required />
        </div>
        <div className="flex flex-col">
          <label className={labelStyle}>Estado</label>
          <input name="state" defaultValue={shippingAddress?.state || ""} className={inputStyle} placeholder="Estado de México" required />
        </div>
        <div className="flex flex-col">
          <label className={labelStyle}>Referencias</label>
          <input name="reference" defaultValue={shippingAddress?.reference || ""} className={inputStyle} placeholder="Portón gris, junto a la tienda" />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-8 bg-black text-white px-10 py-3 rounded-lg font-bold hover:bg-gray-800 transition-all disabled:bg-gray-400"
      >
        {loading ? "Guardando..." : "Guardar dirección de entrega"}
      </button>
    </form>
  );
};
