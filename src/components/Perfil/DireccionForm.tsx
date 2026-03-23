"use client";
import { updateClientAddress } from "@/app/_actions/client";
import { useState } from "react";

export const DireccionForm = ({ cliente }: { cliente: any }) => {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = Object.fromEntries(new FormData(e.currentTarget));
        await updateClientAddress(formData);
        setLoading(false);
        alert("Datos de envío actualizados con éxito");
    };

    const inputStyle = "border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-black/5 w-full";
    const labelStyle = "text-sm font-medium text-gray-700 mb-1";

    return (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm mt-8">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Datos de Envío</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fila 1 */}
                <div className="flex flex-col">
                    <label className={labelStyle}>Teléfono de contacto</label>
                    <input name="phone" defaultValue={cliente?.phone || ""} className={inputStyle} placeholder="55 1234 5678" required />
                </div>
                <div className="flex flex-col">
                    <label className={labelStyle}>Calle / Avenida</label>
                    <input name="street" defaultValue={cliente?.street || ""} className={inputStyle} placeholder="Av. Siempre Viva" required />
                </div>

                {/* Fila 2 */}
                <div className="flex flex-col">
                    <label className={labelStyle}>Número (Ext/Int)</label>
                    <input name="number" defaultValue={cliente?.number || ""} className={inputStyle} placeholder="123 apto 4" required />
                </div>
                <div className="flex flex-col">
                    <label className={labelStyle}>Colonia / Barrio</label>
                    <input name="neighborhood" defaultValue={cliente?.neighborhood || ""} className={inputStyle} placeholder="Col. Centro" required />
                </div>

                {/* Fila 3 */}
                <div className="flex flex-col">
                    <label className={labelStyle}>Código Postal</label>
                    <input name="zipCode" defaultValue={cliente?.zipCode || ""} className={inputStyle} placeholder="01000" required />
                </div>
                <div className="flex flex-col">
                    <label className={labelStyle}>Ciudad</label>
                    <input name="city" defaultValue={cliente?.city || ""} className={inputStyle} placeholder="CDMX" required />
                </div>

                {/* Fila 4 */}
                <div className="flex flex-col">
                    <label className={labelStyle}>Estado</label>
                    <input name="state" defaultValue={cliente?.state || ""} className={inputStyle} placeholder="Estado de México" required />
                </div>
                <div className="flex flex-col">
                    <label className={labelStyle}>Referencias (Opcional)</label>
                    <input name="reference" defaultValue={cliente?.reference || ""} className={inputStyle} placeholder="Portón gris, junto a la tienda" />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="mt-8 bg-black text-white px-10 py-3 rounded-lg font-bold hover:bg-gray-800 transition-all disabled:bg-gray-400"
            >
                {loading ? "Guardando..." : "Guardar Dirección de Entrega"}
            </button>
        </form>
    );
};