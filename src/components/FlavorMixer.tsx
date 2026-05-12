"use client";
import { useState } from "react";
import { ArrowLeft, Plus, Minus, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";

export default function FlavorMixer({ pack, flavors, isSubscription, onBack }: any) {
    const { addToCart } = useCart();
    const router = useRouter();

    const [selections, setSelections] = useState<{ [key: string]: number }>(
        flavors.reduce((acc: any, f: any) => ({ ...acc, [f.id]: 0 }), {})
    );

    const totalSelected = Object.values(selections).reduce((a, b) => a + b, 0);
    const isComplete = totalSelected === pack.quantity;

    const handleAddToCart = () => {
        if (!isComplete) return;

        if (isSubscription) {
            // Suscripción: ir directo al checkout del plan
            router.push(`/api/checkout-plan?planId=${pack.id}`);
            return;
        }

        // Compra única: armar composition y agregar al carrito
        const composition = flavors
            .filter((f: any) => selections[f.id] > 0)
            .map((f: any) => ({
                flavorId: f.id,
                name: f.name,
                quantity: selections[f.id],
            }));

        addToCart({
            id: pack.id,
            name: pack.name,
            price: pack.price,
            quantity: 1,
            flavors: selections,
            composition,
        });

        router.push("/checkout");
    };

    const updateQuantity = (id: string, delta: number) => {
        setSelections(prev => {
            const current = prev[id];
            // No bajar de 0 y no pasarse del total del pack
            if (current + delta < 0 || totalSelected + delta > pack.quantity) return prev;
            return { ...prev, [id]: current + delta };
        });
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Cabecera del Mixer */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
                <button onClick={onBack} className="flex items-center gap-2 text-[#8B3A18] font-bold uppercase text-xs tracking-widest hover:opacity-70 transition">
                    <ArrowLeft size={16} /> Volver a Packs
                </button>

                <div className="text-center">
                    <h2 className="font-serif text-3xl text-[#1A1A1A] mb-2">Personaliza tu {pack.name}</h2>
                    <p className="text-gray-500 font-light">Selecciona {pack.quantity} botellas en total</p>
                </div>

                {/* Indicador de progreso */}
                <div className="bg-white px-6 py-3 rounded-full border border-[#8B3A18]/20 shadow-sm">
                    <span className={`font-mono font-bold ${isComplete ? 'text-[#7D8B28]' : 'text-[#8B3A18]'}`}>
                        {totalSelected} / {pack.quantity}
                    </span>
                </div>
            </div>

            {/* Grid de Sabores con Fotos */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                {flavors.map((flavor: any) => (
                    <div key={flavor.id} className="bg-white p-6 rounded-2xl border border-[#8B3A18]/5 shadow-sm flex flex-col items-center">
                        <div className="h-64 w-full relative mb-6">
                            <img
                                src={flavor.image || "/placeholder-bottle.png"}
                                alt={flavor.name}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <h3 className="font-serif text-xl mb-4">{flavor.name}</h3>

                        <div className="flex items-center gap-4 bg-[#F5F2EB] rounded-full p-1 border border-[#8B3A18]/10">
                            <button
                                onClick={() => updateQuantity(flavor.id, -1)}
                                className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#8B3A18] shadow-sm hover:bg-[#8B3A18] hover:text-white transition"
                            >
                                <Minus size={14} />
                            </button>
                            <span className="font-mono font-bold w-6 text-center">{selections[flavor.id]}</span>
                            <button
                                onClick={() => updateQuantity(flavor.id, 1)}
                                className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#8B3A18] shadow-sm hover:bg-[#8B3A18] hover:text-white transition"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Botón de Acción Final */}
            <div className="flex justify-center">
                <button
                    onClick={handleAddToCart}
                    disabled={!isComplete}
                    className={`flex items-center gap-3 px-12 py-4 rounded-full font-bold uppercase tracking-widest transition-all shadow-xl ${isComplete
                            ? 'bg-[#1A1A1A] text-[#EBDAAB] hover:scale-105 active:scale-95'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    <ShoppingCart size={20} />
                    {isSubscription ? "Suscribirme" : "Agregar al Carrito"}
                </button>
            </div>
        </div>
    );
}