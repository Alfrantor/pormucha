"use client";

import { useState } from "react";
import { toast } from "sonner";
import { generateShippingLabel, markOrderAsShipped } from "@/actions/admin-actions";

type SubscriptionShipmentActionsProps = {
  orderId: string;
  trackingUrl?: string | null;
  hasLabel: boolean;
  isShipped: boolean;
};

export function SubscriptionShipmentActions({
  orderId,
  trackingUrl,
  hasLabel,
  isShipped,
}: SubscriptionShipmentActionsProps) {
  const [loading, setLoading] = useState<"label" | "ship" | null>(null);
  const [localTrackingUrl, setLocalTrackingUrl] = useState(trackingUrl || "");
  const [localHasLabel, setLocalHasLabel] = useState(hasLabel);
  const [localIsShipped, setLocalIsShipped] = useState(isShipped);

  const handleGenerateLabel = async () => {
    if (localTrackingUrl) {
      window.open(localTrackingUrl, "_blank");
      return;
    }

    setLoading("label");
    const result = await generateShippingLabel(orderId);
    setLoading(null);

    if (!result.success) {
      toast.error(result.error || "No se pudo generar la guía.");
      return;
    }

    setLocalTrackingUrl(result.labelUrl);
    setLocalHasLabel(true);
    window.open(result.labelUrl, "_blank");
    toast.success("Guía generada. El surtido quedó pendiente de envío.");
  };

  const handleMarkShipped = async () => {
    const confirmed = window.confirm("¿Marcar este surtido como enviado?");
    if (!confirmed) return;

    setLoading("ship");
    const result = await markOrderAsShipped(orderId);
    setLoading(null);

    if (!result.success) {
      toast.error(result.error || "No se pudo marcar como enviado.");
      return;
    }

    setLocalIsShipped(true);
    toast.success("Surtido marcado como enviado.");
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handleGenerateLabel}
        disabled={loading === "label" || localIsShipped}
        className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading === "label" ? "Generando..." : localTrackingUrl ? "Ver guía" : "Generar guía"}
      </button>

      {localHasLabel && !localIsShipped ? (
        <button
          type="button"
          onClick={handleMarkShipped}
          disabled={loading === "ship"}
          className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "ship" ? "Guardando..." : "Marcar enviado"}
        </button>
      ) : null}
    </div>
  );
}
