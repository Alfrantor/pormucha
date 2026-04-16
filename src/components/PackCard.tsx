// src/components/PackCard.tsx

import Image from "next/image";

export default function PackCard({
    nombre, capacidad, precio, clubDiscountPercent, isSubscriptionMode, onSelect, imagenUrl
}: any) {

    return (
        <div className="bg-white p-8 rounded-3xl border border-[#8B3A18]/10 shadow-[0_10px_30px_rgba(139,58,24,0.05)] flex flex-col group transition-all duration-300 hover:shadow-[0_20px_40px_rgba(139,58,24,0.1)] hover:-translate-y-1 overflow-hidden">

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="font-serif text-2xl text-[#1A1A1A]">{nombre}</h3>
                    <p className="text-gray-500 font-mono text-[11px] uppercase tracking-widest mt-1">
                        {capacidad} Botellas
                    </p>
                </div>
            </div>

            {/* ============================================== */}
            {/* LA CORRECCIÓN: IMAGEN COMPLETA EN EL CONTENEDOR */}
            {/* ============================================== */}
            {/* Quitamos h-56 y p-6. Usamos w-full para que ocupe todo el ancho. */}
            <div className="w-full h-auto bg-[#F5F2EB] rounded-2xl mb-8 flex items-center justify-center relative overflow-hidden group-hover:bg-[#EAE7DD] transition-colors">
                <Image
                    src={imagenUrl || "/images/packs/pack-6-placeholder.png"}
                    alt={`Caja de ${nombre}`}
                    width={350} // Ajusta el tamaño para que se vea grande
                    height={350}
                    className="w-full h-auto object-cover object-center drop-shadow-[0_15px_15px_rgba(139,58,24,0.1)] group-hover:scale-105 transition-transform duration-500"
                />
            </div>

            <div className="mt-auto">
                <div className="flex items-baseline mb-6 gap-1">
                    <span className="text-sm font-light text-gray-500">$</span>
                    <span className="text-4xl font-bold tracking-tight text-[#1A1A1A]">
                        {isSubscriptionMode ? (precio * (1 - clubDiscountPercent / 100)).toFixed(0) : precio.toFixed(0)}
                    </span>
                    <span className="text-sm font-light text-gray-500">MXN</span>
                    {isSubscriptionMode && (
                        <div className="ml-3 px-3 py-1 bg-[#1A1A1A] text-[#EBDAAB] rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse border border-[#8B3A18]/50 shadow-[0_0_10px_rgba(139,58,24,0.3)]">
                            Club -{clubDiscountPercent}%
                        </div>
                    )}
                </div>

                <button
                    onClick={onSelect}
                    className="w-full py-4 bg-[#8B3A18] text-white rounded-full font-bold uppercase tracking-widest text-xs shadow-lg shadow-[#8B3A18]/20 transition-all hover:bg-[#1A1A1A] hover:shadow-[#1A1A1A]/20 active:scale-95"
                >
                    Personalizar Pack
                </button>
            </div>
        </div>
    );
}