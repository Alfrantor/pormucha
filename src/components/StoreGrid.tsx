"use client";
import { useState } from "react";
import PackSelector from "@/components/PackSelector";

export default function StoreGrid({ packs, flavors }: { packs: any[], flavors: any[] }) {
    const [isSubscription, setIsSubscription] = useState(false);

    return (
        <section id="packs" className="max-w-7xl mx-auto px-6 pb-24">

            {/* TOGGLE SUSCRIPCIÓN */}
            <div className="flex justify-center mb-12">
                <div className="bg-[#EAE7DD] p-1.5 rounded-full flex items-center shadow-inner border border-[#8B3A18]/10 relative">
                    <button
                        onClick={() => setIsSubscription(false)}
                        className={`px-6 py-2 rounded-full text-xs md:text-sm font-bold tracking-widest uppercase transition-all duration-300 z-10 ${!isSubscription ? 'bg-white text-[#1A1A1A] shadow-md' : 'text-gray-500 hover:text-gray-800'
                            }`}
                    >
                        Sin Suscripción
                    </button>
                    <button
                        onClick={() => setIsSubscription(true)}
                        className={`px-6 py-2 rounded-full text-xs md:text-sm font-bold tracking-widest uppercase transition-all duration-300 z-10 ${isSubscription ? 'bg-[#1A1A1A] text-[#EBDAAB] shadow-[0_0_15px_rgba(139,58,24,0.3)] border border-[#8B3A18]/50' : 'text-gray-500 hover:text-[#8B3A18]'
                            }`}
                    >
                        Con Suscripción
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {packs.map((pack) => (
                    <PackSelector
                        key={pack.id}
                        id={pack.id}
                        nombre={pack.name}
                        capacidad={pack.quantity}
                        precio={Number(pack.price)}
                        clubDiscountPercent={pack.clubDiscountPercent}
                        isSubscriptionMode={isSubscription}
                        flavors={flavors}
                    />
                ))}
            </div>
        </section>
    );
}
