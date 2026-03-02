"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function SubscriptionLanding() {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast.success("¡Bienvenido a la Comunidad Viva!", {
                    description: "Te has suscrito correctamente.",
                });
                setFormData({ name: "", email: "", phone: "" }); // Limpiar formulario
            } else {
                throw new Error();
            }
        } catch (error) {
            toast.error("Hubo un error", {
                description: "No pudimos procesar tu suscripción. Intenta de nuevo.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="bg-[#EAE7DD] py-20 px-6 overflow-hidden border-y border-[#8B3A18]/10">
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">

                {/* TEXTO PERSUASIVO */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="space-y-6"
                >
                    <h2 className="font-serif text-5xl md:text-6xl text-[#1A1A1A] leading-tight">
                        Únete <br />
                        <span className="text-[#8B3A18] italic">Pormucha Comunidad</span>
                    </h2>
                    <p className="text-lg text-gray-700 font-light max-w-md italic">
                        "Pormuchos momentos compartidos"
                    </p>
                    <p className="text-base text-gray-600 font-light max-w-md">
                        Sé el primero en enterarte de nuevos sabores estacionales, beneficios para la salud y promociones exclusivas.
                    </p>
                </motion.div>

                {/* FORMULARIO */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="bg-white p-8 md:p-10 rounded-2xl shadow-2xl border border-[#8B3A18]/10"
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