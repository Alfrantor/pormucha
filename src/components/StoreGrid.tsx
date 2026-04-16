"use client";
import { useState } from "react";
import PackCard from "@/components/PackCard"; // Renombramos para claridad
import FlavorMixer from "@/components/FlavorMixer"; // Nuevo componente

export default function StoreGrid({ packs, flavors }: { packs: any[], flavors: any[] }) {
    const [isSubscription, setIsSubscription] = useState(false);
    const [activePack, setActivePack] = useState<any>(null);

    // Tu lógica de imágenes
    const getImage = (qty: number) => {
        if (qty === 6) return "/pack-6.JPG";
        if (qty === 8) return "/pack-8.JPG";
        if (qty === 12) return "/pack-12.JPG";
        if (qty === 24) return "/pack-24.JPG";
        return "/hero-tienda.jpg";
    };

    const handleBack = () => setActivePack(null);

    return (
        <section id="packs" className="max-w-7xl mx-auto px-6 pb-24">
            {!activePack ? (
                <>
                    {/* ... Toggle de suscripción ... */}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {packs.map((pack) => (
                            <PackCard
                                key={pack.id}
                                id={pack.id}
                                nombre={pack.name}
                                capacidad={pack.quantity}
                                precio={Number(pack.price)}
                                clubDiscountPercent={pack.clubDiscountPercent}
                                isSubscriptionMode={isSubscription}
                                flavors={flavors}
                                // USAMOS TU FUNCIÓN AQUÍ:
                                imagenUrl={getImage(pack.quantity)}
                                onSelect={() => setActivePack(pack)}
                            />
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