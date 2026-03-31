"use client";

// Le añadimos la prop subscriptionId (opcional por si la usas en otros lados sin ella)
export default function ManageSubscriptionButton({ subscriptionId }: { subscriptionId?: string }) {
    const handleManage = async () => {
        try {
            // Nota: Podrías mandar el subscriptionId en el body si tu API lo requiere para hacer deep-linking en Stripe
            const response = await fetch("/api/stripe/portal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscriptionId })
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error("Error al ir al portal:", error);
            alert("No se pudo conectar con Stripe. Intenta más tarde.");
        }
    };

    return (
        <button
            onClick={handleManage}
            className="text-sm font-medium text-gray-500 hover:text-[#8B3A28] underline transition-all"
        >
            Gestionar facturación o cancelar este pack
        </button>
    );
}