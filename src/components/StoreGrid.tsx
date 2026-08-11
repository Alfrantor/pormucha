"use client";
import { useEffect, useMemo, useState } from "react";
import PackCard from "@/components/PackCard";
import FlavorMixer from "@/components/FlavorMixer";

type StoreFlavor = {
  id: string;
  name: string;
  image?: string | null;
  imageEuro?: string | null;
  stock?: number;
};

type StorePack = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  clubDiscountPercent: number;
  subscriptionPlanId?: string | null;
  image?: string | null;
};

type CatalogPlan = {
  id: string;
  productId?: string | null;
  unitCount?: number | null;
};

export default function StoreGrid({ packs, flavors }: { packs: StorePack[]; flavors: StoreFlavor[] }) {
  const [isSubscription] = useState(false);
  const [activePack, setActivePack] = useState<StorePack | null>(null);
  const [plans, setPlans] = useState<CatalogPlan[]>([]);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const res = await fetch("/api/catalog/plans");
        const data = await res.json();
        if (res.ok && Array.isArray(data.plans)) {
          setPlans(data.plans);
        }
      } catch (error) {
        console.error("Error cargando planes:", error);
      }
    };

    loadPlans();
  }, []);

  const packsWithPlan = useMemo(() => {
    return packs.map((pack) => ({
      ...pack,
      subscriptionPlanId: pack.subscriptionPlanId || plans.find((plan) => plan.productId === pack.id || Number(plan.unitCount) === Number(pack.quantity))?.id || null,
    }));
  }, [packs, plans]);

  const getImage = (pack: StorePack) => {
    if (pack.image) return pack.image;
    if (pack.quantity === 6) return "/pack-6.PNG";
    if (pack.quantity === 8) return "/pack-8.JPG";
    if (pack.quantity === 12) return "/pack-12.PNG";
    if (pack.quantity === 24) return "/pack-24.PNG";
    return "/hero-tienda.jpg";
  };

  const handleBack = () => setActivePack(null);

  return (
    <section id="packs" className="max-w-7xl mx-auto px-6 pb-24">
      {!activePack ? (
        <div className="flex flex-wrap justify-center gap-6">
          {packsWithPlan.map((pack) => (
            <div key={pack.id} className="w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]">
              <PackCard
                id={pack.id}
                nombre={pack.name}
                capacidad={pack.quantity}
                precio={Number(pack.price)}
                clubDiscountPercent={pack.clubDiscountPercent}
                isSubscriptionMode={isSubscription}
                flavors={flavors}
                imagenUrl={getImage(pack)}
                onSelect={() => setActivePack(pack)}
              />
            </div>
          ))}
        </div>
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
