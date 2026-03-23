"use client";

export default function ManageSubscriptionButton() {
    const handleManage = async () => {
        try {
            const response = await fetch("/api/stripe/portal", { method: "POST" });
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
            className="mt-6 text-sm font-medium text-gray-500 hover:text-[#8B3A28] underline transition-all"
        >
            Gestionar facturación o cancelar suscripción
        </button>
    );
}