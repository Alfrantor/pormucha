"use client";
import { useState } from "react";
import { saveSelectedFlavors } from "@/app/_actions/flavors";

interface Flavor {
    id: string;
    name: string;
}

export default function FlavorSelector({
    subscriptionId,
    unitCount,
    flavors,
    currentSelection
}: {
    subscriptionId: string;
    unitCount: number;
    flavors: Flavor[];
    currentSelection: any;
}) {
    // Inicializamos el estado con lo que ya tenga guardado o ceros
    const [selection, setSelection] = useState<Record<string, number>>(currentSelection || {});
    const [loading, setLoading] = useState(false);

    const totalSelected = Object.values(selection).reduce((a, b) => a + b, 0);

    const updateQuantity = (name: string, delta: number) => {
        const currentQty = selection[name] || 0;
        const newQty = currentQty + delta;

        // Evitar negativos y no pasarse del total del plan
        if (newQty < 0) return;
        if (delta > 0 && totalSelected >= unitCount) return;

        setSelection({ ...selection, [name]: newQty });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await saveSelectedFlavors(subscriptionId, selection, totalSelected, unitCount);
            alert("¡Sabores guardados con éxito!");
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mt-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Personaliza tu Pack</h3>
                <span className={`px-4 py-1 rounded-full font-bold text-sm ${totalSelected === unitCount ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {totalSelected} / {unitCount} bebidas
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {flavors.map((flavor) => (
                    <div key={flavor.id} className="flex items-center justify-between p-4 border rounded-2xl hover:bg-gray-50 transition">
                        <span className="font-medium text-gray-700">{flavor.name}</span>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => updateQuantity(flavor.name, -1)}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                            >-</button>
                            <span className="w-4 text-center font-bold">{selection[flavor.name] || 0}</span>
                            <button
                                onClick={() => updateQuantity(flavor.name, 1)}
                                className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 disabled:bg-gray-300"
                                disabled={totalSelected >= unitCount}
                            >+</button>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={handleSave}
                disabled={loading || totalSelected !== unitCount}
                className="w-full bg-[#8B3A28] text-white py-4 rounded-2xl font-bold hover:bg-[#6b2d1f] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? "Guardando..." : "Confirmar Selección de Sabores"}
            </button>
        </div>
    );
}