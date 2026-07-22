"use client";
import { useState } from "react";
import PackCard from "@/components/PackCard"; // Renombramos para claridad
import FlavorMixer from "@/components/FlavorMixer"; // Nuevo componente

export default function StoreGrid({ packs, flavors }: { packs: any[], flavors: any[] }) {
    const [isSubscription, setIsSubscription] = useState(false);
    const [activePack, setActivePack] = useState<any>(null);

    // Tu lógica de imágenes
    const getImage = (qty: number) => {
        if (qty === 6) return "/pack-6.PNG";
        if (qty === 8) return "/pack-8.JPG";
        if (qty === 12) return "/pack-12.PNG";
        if (qty === 24) return "/pack-24.PNG";
        return "/hero-tienda.jpg";
    };

    const handleBack = () => setActivePack(null);

    return (
        <section id="packs" className="max-w-7xl mx-auto px-6 pb-24">
            {!activePack ? (
                <>
                    {/* ... Toggle de suscripción ... */}

                    <div className="flex flex-wrap justify-center gap-6">
                        {packs.map((pack) => (
                            <div key={pack.id} className="w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]">
                                <PackCard
                                    id={pack.id}
                                    nombre={pack.name}
                                    capacidad={pack.quantity}
                                    precio={Number(pack.price)}
                                    clubDiscountPercent={pack.clubDiscountPercent}
                                    isSubscriptionMode={isSubscription}
                                    flavors={flavors}
                                    imagenUrl={getImage(pack.quantity)}
                                    onSelect={() => setActivePack(pack)}
                                />
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <FlavorMixer
                    pack={activePack}
                    flavors={flavors}
                    isSubscription={isSubscription}
                    onBack={handleBack}
                />
            )}
        </section>
    );
}
