/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { ArrowLeft, Plus, Minus, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";

const EURO_PACK_IDS = new Set([
  "cmndgsukm0002ra6onjg8fpn7",
  "cmndgxvzi000ara6o2iy0l49t",
]);

const MIXED_PACK_ID = "cmndgzu57000bra6oegxoojkw";
const FALLBACK_FLAVOR_IMAGE = "/botella-pormucha.png";

function getEuroImage(flavor: any) {
  return flavor.imageEuro || flavor.image || FALLBACK_FLAVOR_IMAGE;
}

export default function FlavorMixer({ pack, flavors, isSubscription, onBack }: any) {
  const { addToCart } = useCart();
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [packStyle, setPackStyle] = useState<"euro" | "bala">("euro");

  const [selections, setSelections] = useState<{ [key: string]: number }>(
    flavors.reduce((acc: any, f: any) => ({ ...acc, [f.id]: 0 }), {})
  );

  const totalSelected = Object.values(selections).reduce((a, b) => a + b, 0);
  const isComplete = totalSelected === pack.quantity;
  const usesEuroOnly = EURO_PACK_IDS.has(pack.id);
  const canToggleStyle = pack.id === MIXED_PACK_ID;

  const getFlavorImage = (flavor: any) => {
    if (usesEuroOnly) return getEuroImage(flavor);
    if (canToggleStyle && packStyle === "euro") return getEuroImage(flavor);
    return flavor.image || FALLBACK_FLAVOR_IMAGE;
  };

  const handleAddToCart = async () => {
    if (!isComplete) return;

    if (isSubscription) {
      if (!isSignedIn) {
        router.push(`/sign-in?redirect_url=${encodeURIComponent("/suscripciones")}`);
        return;
      }

      try {
        setIsLoading(true);
        const res = await fetch("/api/checkout-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: pack.subscriptionPlanId || pack.id }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else if (res.status === 422 && data.redirectTo) {
          alert("Antes de suscribirte, completa tu perfil y tu dirección de envío.");
          router.push(data.redirectTo);
        } else {
          alert(data.error || "Error al iniciar el pago. Intenta de nuevo.");
        }
      } catch {
        alert("Error de conexión.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

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
      packQuantity: pack.quantity,
      quantity: 1,
      flavors: selections,
      composition,
    });

    alert("Producto agregado al carrito");
  };

  const updateQuantity = (id: string, delta: number) => {
    setSelections((prev) => {
      const current = prev[id];
      if (current + delta < 0 || totalSelected + delta > pack.quantity) return prev;
      return { ...prev, [id]: current + delta };
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <button onClick={onBack} className="flex items-center gap-2 text-[#8B3A18] font-bold uppercase text-xs tracking-widest hover:opacity-70 transition">
          <ArrowLeft size={16} /> Volver a Packs
        </button>

        <div className="text-center">
          <h2 className="font-serif text-3xl text-[#1A1A1A] mb-2">Personaliza tu {pack.name}</h2>
          <p className="text-gray-500 font-light">Selecciona {pack.quantity} botellas en total</p>
          {canToggleStyle && (
            <div className="mt-4 inline-flex rounded-full border border-[#8B3A18]/15 bg-white p-1 shadow-sm">
              <button
                onClick={() => setPackStyle("euro")}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition ${
                  packStyle === "euro" ? "bg-[#8B3A18] text-white" : "text-[#8B3A18]"
                }`}
              >
                Euro
              </button>
              <button
                onClick={() => setPackStyle("bala")}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition ${
                  packStyle === "bala" ? "bg-[#1A1A1A] text-white" : "text-[#1A1A1A]"
                }`}
              >
                Bala
              </button>
            </div>
          )}
        </div>

        <div className="bg-white px-6 py-3 rounded-full border border-[#8B3A18]/20 shadow-sm">
          <span className={`font-mono font-bold ${isComplete ? "text-[#7D8B28]" : "text-[#8B3A18]"}`}>
            {totalSelected} / {pack.quantity}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        {flavors.map((flavor: any) => (
          <div key={flavor.id} className="bg-white p-6 rounded-2xl border border-[#8B3A18]/5 shadow-sm flex flex-col items-center">
            <div className="h-64 w-full relative mb-6">
              <Image
                src={getFlavorImage(flavor)}
                alt={flavor.name}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 280px"
                className="object-contain"
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

      <div className="flex justify-center">
        <button
          onClick={handleAddToCart}
          disabled={!isComplete || isLoading}
          className={`flex items-center gap-3 px-12 py-4 rounded-full font-bold uppercase tracking-widest transition-all shadow-xl ${
            isComplete && !isLoading ? "bg-[#1A1A1A] text-[#EBDAAB] hover:scale-105 active:scale-95" : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          <ShoppingCart size={20} />
          {isLoading ? "Preparando..." : isSubscription ? "Suscribirme" : "Agregar al Carrito"}
        </button>
      </div>
    </div>
  );
}
