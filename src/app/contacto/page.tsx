"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, Instagram, MessageCircle, Send } from "lucide-react";

export default function ContactoPage() {
    return (
        <main className="min-h-screen bg-[#F5F2EB] font-sans selection:bg-[#8B3A28] selection:text-white flex flex-col">
            {/*================ NAVBAR ESTÁTICO (ABSOLUTO AL INICIO) ================*/}
            <div className="absolute top-0 w-full z-50">
                <Navbar />
            </div>

            {/*================ CONTENIDO DE LA PÁGINA ================*/}
            {/* Agregamos padding-top amplio (pt-32 o pt-40) porque el Navbar es absolute top-0 */}
            <section className="flex-grow pt-40 pb-24 px-6 relative z-10 flex items-center justify-center">
                <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
                    
                    {/* ===== MITAD IZQUIERDA: Textos de Contacto e Información ===== */}
                    <div className="flex flex-col text-[#1A1A1A] max-w-xl">
                        <span className="font-mono text-[10px] md:text-xs tracking-[0.4em] text-[#8B3A18] uppercase font-bold mb-4 block">
                            Atención en línea
                        </span>
                        
                        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-tight mb-6">
                            ¿Tienes dudas? <br/>
                            <span className="italic font-light text-[#8B3A18]">Contáctanos.</span>
                        </h1>
                        
                        <p className="font-roboto text-lg md:text-xl font-light leading-relaxed text-gray-700 mb-12">
                            Estamos para ayudarte para cualquier duda sobre el producto, tu suscripción y tu compra.
                        </p>

                        {/* Bloques de Contacto (Iconos) */}
                        <div className="space-y-8 mt-4">
                            
                            {/* INSTAGRAM */}
                            <a 
                                href="https://instagram.com/pormuchakombucha" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="group flex items-center gap-6 p-4 rounded-xl hover:bg-white/60 transition-colors border border-transparent hover:border-[#8B3A18]/10"
                            >
                                <div className="w-14 h-14 shrink-0 rounded-full bg-[#8B3A18] text-[#F5F2EB] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                    <Instagram strokeWidth={1.5} size={26} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase font-bold text-gray-400 mb-1">Instagram</span>
                                    <span className="text-xl font-serif text-[#1A1A1A]">@pormuchakombucha</span>
                                </div>
                            </a>

                            {/* WHATSAPP */}
                            <a 
                                href="https://wa.me/529810000000" // Cambiar a tu número real de Pormucha
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="group flex items-center gap-6 p-4 rounded-xl hover:bg-white/60 transition-colors border border-transparent hover:border-[#8B3A18]/10"
                            >
                                <div className="w-14 h-14 shrink-0 rounded-full bg-[#8B3A18] text-[#F5F2EB] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                    <MessageCircle strokeWidth={1.5} size={26} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase font-bold text-gray-400 mb-1">WhatsApp de Soporte</span>
                                    <span className="text-xl font-serif text-[#1A1A1A]">Haz clic para chatear</span>
                                </div>
                            </a>

                            {/* CORREO ELECTRÓNICO */}
                            <a 
                                href="mailto:ventas@pormuchakombucha.com" 
                                className="group flex items-center gap-6 p-4 rounded-xl hover:bg-white/60 transition-colors border border-transparent hover:border-[#8B3A18]/10"
                            >
                                <div className="w-14 h-14 shrink-0 rounded-full bg-[#8B3A18] text-[#F5F2EB] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                    <Mail strokeWidth={1.5} size={26} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase font-bold text-gray-400 mb-1">Correo Electrónico</span>
                                    <span className="text-xl font-serif text-[#1A1A1A]">ventas@pormuchakombucha.com</span>
                                </div>
                            </a>

                        </div>
                    </div>

                    {/* ===== MITAD DERECHA: Formulario ===== */}
                    <div className="bg-white p-8 md:p-12 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.05)] border border-[#8B3A18]/5 w-full relative overflow-hidden group">
                        
                        {/* Pequeño detalle visual de fondo dentro del formulario */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#F5F2EB] rounded-full blur-3xl opacity-50 group-hover:bg-[#EBDAAB]/30 transition-colors duration-1000 pointer-events-none" />

                        <form className="relative z-10 flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
                            
                            {/* Nombre */}
                            <div className="flex flex-col gap-2">
                                <label className="font-mono text-[10px] tracking-[0.2em] font-bold text-[#8B3A18] uppercase">
                                    Nombre Completo
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Ej. Ana García"
                                    className="w-full bg-[#F5F2EB]/50 border-b-2 border-transparent border-b-[#8B3A18]/20 px-4 py-4 rounded-t-lg outline-none focus:border-b-[#8B3A18] focus:bg-[#F5F2EB] transition-all"
                                    required
                                />
                            </div>

                            {/* Teléfono */}
                            <div className="flex flex-col gap-2">
                                <label className="font-mono text-[10px] tracking-[0.2em] font-bold text-[#8B3A18] uppercase">
                                    Teléfono
                                </label>
                                <input 
                                    type="tel" 
                                    placeholder="Ej. +52 123 456 7890"
                                    className="w-full bg-[#F5F2EB]/50 border-b-2 border-transparent border-b-[#8B3A18]/20 px-4 py-4 rounded-t-lg outline-none focus:border-b-[#8B3A18] focus:bg-[#F5F2EB] transition-all"
                                />
                            </div>

                            {/* Correo Electrónico */}
                            <div className="flex flex-col gap-2">
                                <label className="font-mono text-[10px] tracking-[0.2em] font-bold text-[#8B3A18] uppercase">
                                    Correo Electrónico
                                </label>
                                <input 
                                    type="email" 
                                    placeholder="tucorreo@ejemplo.com"
                                    className="w-full bg-[#F5F2EB]/50 border-b-2 border-transparent border-b-[#8B3A18]/20 px-4 py-4 rounded-t-lg outline-none focus:border-b-[#8B3A18] focus:bg-[#F5F2EB] transition-all"
                                    required
                                />
                            </div>

                            {/* Mensaje */}
                            <div className="flex flex-col gap-2 mb-4">
                                <label className="font-mono text-[10px] tracking-[0.2em] font-bold text-[#8B3A18] uppercase">
                                    ¿En qué te podemos ayudar?
                                </label>
                                <textarea 
                                    rows={4}
                                    placeholder="Escribe aquí todas tus dudas o comentarios..."
                                    className="w-full bg-[#F5F2EB]/50 border-b-2 border-transparent border-b-[#8B3A18]/20 px-4 py-4 rounded-t-lg outline-none focus:border-b-[#8B3A18] focus:bg-[#F5F2EB] transition-all resize-none"
                                    required
                                />
                            </div>

                            {/* Botón de Enviar */}
                            <button 
                                type="submit" 
                                className="w-full bg-[#1A1A1A] text-[#F5F2EB] py-5 rounded-lg flex items-center justify-center gap-3 hover:bg-[#8B3A18] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group/btn"
                            >
                                <span className="font-sans font-bold uppercase tracking-widest text-sm">Enviar Mensaje</span>
                                <Send size={18} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                            </button>
                            <p className="text-center text-xs text-gray-400 mt-2 font-light">
                                Te responderemos lo más pronto posible.
                            </p>
                        </form>
                    </div>

                </div>
            </section>

            {/*================ FOOTER GLOBAL ================*/}
            <Footer />

        </main>
    );
}
