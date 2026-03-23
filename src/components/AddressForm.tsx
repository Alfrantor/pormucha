"use client";
import { useState } from "react";

export default function AddressForm({ client }: { client: any }) {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);

        await fetch("/api/client/update", {
            method: "POST",
            body: JSON.stringify(data),
        });
        setLoading(false);
        alert("Dirección actualizada 🚚");
    };

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 mt-4">
            <input name="street" placeholder="Calle" defaultValue={client.street} className="border p-2 rounded" />
            <input name="number" placeholder="Número" defaultValue={client.number} className="border p-2 rounded" />
            <input name="neighborhood" placeholder="Colonia/Barrio" defaultValue={client.neighborhood} className="border p-2 rounded" />
            <input name="zipCode" placeholder="Código Postal" defaultValue={client.zipCode} className="border p-2 rounded" />
            <input name="city" placeholder="Ciudad" defaultValue={client.city} className="border p-2 rounded" />
            <button type="submit" disabled={loading} className="col-span-2 bg-[#2d4a3e] text-white p-2 rounded">
                {loading ? "Guardando..." : "Guardar Dirección de Envío"}
            </button>
        </form>
    );
}