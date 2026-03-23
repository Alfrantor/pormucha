"use client";

import { useState } from "react";

interface SubscribeButtonProps {
    planId: string;
    isFeatured: boolean;
    // clientId?: string; // Descomenta esto si ya tienes sistema de login
}

export default function SubscribeButton({ planId, isFeatured }: SubscribeButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleSubscribe = async () => {
        try {
            setIsLoading(true);

            // Llamamos a la nueva ruta de API que conectará con Stripe
            const res = await fetch("/api/checkout-plan", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    planId,
                    // clientId: clientId // Aquí enviarías el ID del usuario logueado
                }),
            });

            const data = await res.json();

            // Si Stripe nos devuelve la URL, redirigimos al cliente allá
            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error("Error del servidor:", data.error);
                alert("Hubo un error al iniciar el pago. Intenta de nuevo.");
            }
        } catch (error) {
            console.error("Error de red:", error);
            alert("Error de conexión.");
        } finally {
            setIsLoading(false);
        }
    };

    // Usamos exactamente los mismos estilos que ya tenías diseñados
    return (
        <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className={`block w-full text-center py-4 rounded-xl font-bold tracking-widest uppercase transition-colors shrink-0 
            ${isFeatured
                    ? "bg-[#EBDAAB] text-[#1A1A1A] hover:bg-white"
                    : "bg-[#8B3A18] text-[#EAE7DD] hover:bg-[#6c2d13]"
                } 
            ${isLoading ? "opacity-70 cursor-wait" : ""}`}
        >
            {isLoading ? "Preparando..." : "Empezar Plan"}
        </button>
    );
}