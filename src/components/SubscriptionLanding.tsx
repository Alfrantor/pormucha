"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Turnstile } from "@marsidev/react-turnstile";

type SubscriptionLandingProps = {
  eyebrow?: string;
  titleLine1?: string;
  titleLine2?: string;
  highlightLine?: string;
  quote?: string;
  description?: string;
  anchorId?: string;
};

export default function SubscriptionLanding({
  eyebrow = "Pormuchos momentos compartidos",
  titleLine1 = "Suscríbete a",
  titleLine2 = "Pormucha",
  highlightLine = "Comunidad",
  quote = "\"Pormuchos momentos compartidos\"",
  description = "Sé el primero en enterarte de nuevos sabores estacionales, beneficios para la salud y promociones exclusivas.",
  anchorId = "suscripcion",
}: SubscriptionLandingProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!turnstileToken) {
      toast.error("Verificación en proceso", {
        description: "Por favor, espera un segundo mientras comprobamos la seguridad de la red.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, turnstileToken }),
      });

      if (response.ok) {
        toast.success("¡Bienvenido a la Comunidad Viva!", {
          description: "Te has suscrito correctamente.",
        });

        setFormData({ name: "", email: "", phone: "" });

        setTimeout(() => {
          router.push("/thanks");
        }, 1500);
      } else {
        const data = await response.json();
        throw new Error(data.error || "Error al procesar la solicitud");
      }
    } catch (error: unknown) {
      toast.error("Aviso", {
        description: error instanceof Error ? error.message : "No pudimos procesar tu suscripción. Intenta de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id={anchorId} className="bg-[#EAE7DD] py-20 px-6 overflow-hidden border-y border-[#8B3A18]/10 relative">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="space-y-6 pt-6 pl-4 sm:pt-8 sm:pl-6 md:pt-10 md:pl-10 lg:pt-0 lg:pl-0"
        >
          <p className="font-mono text-[10px] tracking-[0.4em] text-[#8B3A18] uppercase">{eyebrow}</p>
          <h2 className="font-serif text-[3.5rem] md:text-[5rem] lg:text-[6rem] leading-[0.85] tracking-tight text-[#1A1A1A]">
            {titleLine1}
            <br />
            <span className="block mt-2">{titleLine2}</span>
            <span className="font-light text-[2.2rem] md:text-[3.5rem] lg:text-[4rem] text-[#8B3A18] block">
              {highlightLine}
            </span>
          </h2>

          <p className="text-lg text-gray-700 font-light max-w-md italic mt-8">{quote}</p>
          <p className="text-base text-gray-600 font-light max-w-md">{description}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-white p-8 md:p-10 rounded-2xl shadow-2xl border border-[#8B3A18]/10 relative z-10"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 mb-2">Nombre Completo</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Juan Pérez"
                className="w-full bg-[#F5F2EB] border-none rounded-lg p-4 focus:ring-2 focus:ring-[#8B3A28] transition-all outline-none text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 mb-2">Correo</label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="hola@pormucha.com"
                  className="w-full bg-[#F5F2EB] border-none rounded-lg p-4 focus:ring-2 focus:ring-[#8B3A28] outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 mb-2">Teléfono</label>
                <input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="981 123 4567"
                  className="w-full bg-[#F5F2EB] border-none rounded-lg p-4 focus:ring-2 focus:ring-[#8B3A28] outline-none text-sm"
                />
              </div>
            </div>

            <div className="flex justify-center py-2">
              <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!} onSuccess={(token) => setTurnstileToken(token)} />
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-[#1A1A1A] text-white py-5 rounded-lg font-bold tracking-[0.2em] hover:bg-[#8B3A18] transition-all duration-500 transform hover:scale-[1.02] shadow-xl mt-4 disabled:opacity-50"
            >
              {loading ? "PROCESANDO..." : "SUSCRIBIRME AHORA"}
            </button>
            <p className="text-[10px] text-center text-gray-400 mt-4 uppercase tracking-tighter">
              Al suscribirte aceptas recibir noticias de Pormucha Kombucha.
            </p>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
