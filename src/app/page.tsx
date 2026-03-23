"use client";
import Navbar from "@/components/Navbar";
import { Leaf, Waves, Sun, Zap, ShieldCheck, Sparkles, Truck } from "lucide-react";
// import PackSelector from "@/components/PackSelector";
// import Image from "next/image";
import SubscriptionLanding from "@/components/SubscriptionLanding";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";

export default function LandingPage() {
    return (
        <main className="min-h-screen bg-[#F5F2EB] selection:bg-[#8B3A28] selection:text-white font-sans overflow-x-hidden">

            <div className="absolute top-0 w-full z-50">
                <Navbar />
            </div>

            {/* ========================================= */}
            {/* 1. HERO SECTION COMPLETO CON VIDEO */}
            {/* ========================================= */}
            <section className="relative min-h-screen w-full overflow-hidden text-[#F5F2EB] flex flex-col justify-between pt-32 pb-12 md:pb-16 px-6 md:px-16 lg:px-24">
                <div className="absolute inset-0 z-0 bg-black">
                    <video
                        src="/video-hero.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover brightness-[0.60] grayscale-[0.2]"
                    />
                </div>

                <div className="relative z-10 flex flex-col items-start transition-all md:max-w-4xl">
                    <div className="text-left mb-6">
                        {/* FORMATO ORIGINAL A REPLICAR */}
                        <h1 className="font-serif text-[3.8rem] sm:text-[5rem] md:text-[6.5rem] leading-[0.8] tracking-tighter text-[#EBDAAB]">
                            P<span className="italic font-light">o</span>rmucha <br />
                            <span className="font-light text-[3.2rem] sm:text-[4.2rem] md:text-[5.5rem]">
                                K<span className="italic font-light">o</span>mbucha
                            </span>
                        </h1>
                    </div>
                    <div className="text-left">
                        <p className="text-lg md:text-[1.6rem] font-roboto leading-relaxed text-[#D6D8CB] max-w-2xl font-light">
                            Bebida fermentada naturalmente con probióticos vivos, ligera y refrescante.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 flex flex-col items-center md:items-end gap-10 md:gap-12 mt-16 md:mt-0 ml-auto w-fit">
                    <div className="hidden md:block font-mono text-[0.85rem] tracking-[0.2em] space-y-2.5 text-[#EBDAAB]" style={{ opacity: 0.8 }}>
                        <div className="flex justify-end gap-10 border-b border-white/10 pb-2.5 mb-2.5">
                            <span>100% Fresco</span>
                            <span>&</span>
                            <span>Natural</span>
                        </div>
                        <div className="flex justify-end gap-10">
                            <span>Vida en Equilibrio</span>
                            <span>MX</span>
                        </div>
                        <p className="opacity-60 pt-1 tracking-[0.15em] text-right text-[0.75rem]">Pormuchos momentos compartidos</p>
                    </div>
                    <a href="/tienda" className="bg-[#8B3A18] text-[#F5F2EB] px-10 py-4 sm:px-12 sm:py-5 rounded-md text-lg sm:text-xl font-sans font-bold tracking-widest hover:bg-[#6c2d13] transition-all hover:scale-105 shadow-xl border border-white/10 uppercase">
                        Ir a la tienda
                    </a>
                </div>
            </section>

            {/* ========================================= */}
            {/* 2. BENEFICIOS Y ENVÍOS (TRUST BADGES) */}
            {/* ========================================= */}
            <section className="bg-white py-20 px-6 md:px-12 z-20 relative shadow-sm">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-center font-sans tracking-[0.15em] text-[#8B3A18] uppercase font-bold text-xl md:text-2xl mb-16">
                        Más que deliciosa, beneficiosa
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8">
                        <div className="flex flex-col items-center text-center group cursor-default">
                            <div className="mb-6 p-4 rounded-full bg-[#F5F2EB] text-[#1A1A1A] group-hover:bg-[#8B3A18] group-hover:text-white transition-colors duration-300">
                                <Zap size={36} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-serif text-2xl mb-3 text-[#1A1A1A]">¡Aumenta tu energía!</h3>
                            <p className="font-light text-gray-600 text-sm md:text-base leading-relaxed max-w-[250px]">
                                Con nutrientes orgánicos que revitalizan tu cuerpo y te mantienen en movimiento todo el día.
                            </p>
                        </div>
                        <div className="flex flex-col items-center text-center group cursor-default">
                            <div className="mb-6 p-4 rounded-full bg-[#F5F2EB] text-[#1A1A1A] group-hover:bg-[#8B3A18] group-hover:text-white transition-colors duration-300">
                                <ShieldCheck size={36} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-serif text-2xl mb-3 text-[#1A1A1A]">Fortalece tus defensas</h3>
                            <p className="font-light text-gray-600 text-sm md:text-base leading-relaxed max-w-[250px]">
                                Repleta de antioxidantes que ayudan a proteger y fortalecer el sistema inmunológico natural.
                            </p>
                        </div>
                        <div className="flex flex-col items-center text-center group cursor-default">
                            <div className="mb-6 p-4 rounded-full bg-[#F5F2EB] text-[#1A1A1A] group-hover:bg-[#8B3A18] group-hover:text-white transition-colors duration-300">
                                <Sparkles size={36} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-serif text-2xl mb-3 text-[#1A1A1A]">Equilibra tu cuerpo</h3>
                            <p className="font-light text-gray-600 text-sm md:text-base leading-relaxed max-w-[250px]">
                                Probióticos vivos que favorecen una digestión saludable y mantienen tu interior en sintonía.
                            </p>
                        </div>
                        <div className="flex flex-col items-center text-center group cursor-default">
                            <div className="mb-6 p-4 rounded-full bg-[#F5F2EB] text-[#1A1A1A] group-hover:bg-[#8B3A18] group-hover:text-white transition-colors duration-300">
                                <Truck size={36} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-serif text-2xl mb-3 text-[#1A1A1A]">Envíos a todo México</h3>
                            <p className="font-light text-gray-600 text-sm md:text-base leading-relaxed max-w-[250px]">
                                Llevamos el bienestar desde Campeche hasta la puerta de tu casa, de forma rápida y segura.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================= */}
            {/* 3. SABORES REGULARES */}
            {/* ========================================= */}
            <section className="bg-white py-24 border-t border-[#8B3A18]/10">
                <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                    <div className="hidden lg:block relative h-[650px] bg-gray-100 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="absolute inset-0 bg-[url('/flavors-side.JPG')] bg-cover bg-center hover:scale-105 transition-transform duration-1000" />
                    </div>
                    <div>
                        <h2 className="text-5xl md:text-6xl font-serif mb-12 underline decoration-[#8B3A18] decoration-2 underline-offset-8">
                            Sabores Regulares
                        </h2>
                        <div className="space-y-12">
                            <div className="flex gap-6 group cursor-default">
                                <div className="pt-1 text-[#8B3A18] transition-transform group-hover:scale-110"><Waves size={40} strokeWidth={1} /></div>
                                <div><h3 className="text-3xl font-serif mb-2 text-gray-900 group-hover:text-[#8B3A18] transition-colors">Jamaica</h3><p className="text-gray-600 font-light text-base leading-relaxed max-w-sm">Vibrante y refrescante. El sabor floral que amamos con el boost de probióticos.</p></div>
                            </div>
                            <div className="flex gap-6 group cursor-default">
                                <div className="pt-1 text-[#7D8B28] transition-transform group-hover:scale-110"><Leaf size={40} strokeWidth={1} /></div>
                                <div><h3 className="text-3xl font-serif mb-2 text-gray-900 group-hover:text-[#7D8B28] transition-colors">Té Verde</h3><p className="text-gray-600 font-light text-base leading-relaxed max-w-sm">Antioxidantes poderosos en cada sorbo. Suave, refrescante y lleno de beneficios.</p></div>
                            </div>
                            <div className="flex gap-6 group cursor-default">
                                <div className="pt-1 text-[#E6B800] transition-transform group-hover:scale-110"><Sun size={40} strokeWidth={1} /></div>
                                <div><h3 className="text-3xl font-serif mb-2 text-gray-900 group-hover:text-[#E6B800] transition-colors">Piña</h3><p className="text-gray-600 font-light text-base leading-relaxed max-w-sm">Tropical y dulce natural. El sabor del paraíso en una botella fermentada con maestría.</p></div>
                            </div>
                            <div className="flex gap-6 group cursor-default">
                                <div className="pt-1 text-[#2C2C2C] transition-transform group-hover:scale-110"><Leaf size={40} strokeWidth={1} /></div>
                                <div><h3 className="text-3xl font-serif mb-2 text-gray-900 group-hover:text-[#2C2C2C] transition-colors">Té Negro</h3><p className="text-gray-600 font-light text-base leading-relaxed max-w-sm">Intenso y tradicional. Para los que buscan un sabor robusto con toda la potencia.</p></div>
                            </div>
                        </div>

                        {/* NUEVO BOTÓN DE COMPRA */}
                        <div className="mt-14">
                            <a href="/tienda" className="inline-block bg-[#1A1A1A] text-white px-10 py-4 rounded-md text-lg font-sans font-bold tracking-widest hover:bg-[#8B3A18] transition-colors shadow-xl uppercase">
                                Ir a la tienda
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================= */}
            {/* 4. INSTAGRAM / FILOSOFÍA CON VIDEOS (REELS) */}
            {/* ========================================= */}
            <section className="bg-[#EAE7DD] py-24 px-6 md:px-12 text-[#1A1A1A]">
                <div className="text-center mb-16 space-y-4">
                    {/* TÍTULO ACTUALIZADO CON FORMATO DE BRANDING (Serif, o itálica, interlineado) */}
                    {/* Usamos color oscuro #1A1A1A para contraste en fondo claro */}
                    <h2 className="font-serif text-[3.5rem] md:text-[5.5rem] leading-[0.85] tracking-tighter text-[#1A1A1A]">
                        P<span className="italic font-light">o</span>rmucha<span className="text-sm align-top">®</span> <br />
                        <span className="font-light text-[2.5rem] md:text-[4rem]">
                            en Instagram
                        </span>
                    </h2>
                    <p className="text-xl md:text-2xl font-light tracking-wide text-gray-800 pt-4">
                        Fermentación real. Bienestar cotidiano.
                    </p>
                </div>
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
                    <a href="https://www.instagram.com/pormuchakombucha/" target="_blank" className="group flex flex-col text-center">
                        <div className="aspect-[4/5] bg-gray-300 overflow-hidden mb-8 relative rounded-2xl shadow-xl">
                            <video src="/reel-1.mp4" autoPlay loop muted playsInline className="object-cover w-full h-full transform transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
                        </div>
                        <h3 className="font-sans text-xl tracking-[0.2em] uppercase mb-4 font-bold">HECHA CON TIEMPO</h3>
                        <p className="text-gray-600 font-light leading-relaxed px-4">Pequeños lotes, procesos reales y respeto por la fermentación.</p>
                    </a>
                    <a href="https://www.instagram.com/pormuchakombucha/" target="_blank" className="group flex flex-col text-center">
                        <div className="aspect-[4/5] bg-gray-300 overflow-hidden mb-8 relative rounded-2xl shadow-xl">
                            <video src="/reel-2.mp4" autoPlay loop muted playsInline className="object-cover w-full h-full transform transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
                        </div>
                        <h3 className="font-sans text-xl tracking-[0.2em] uppercase mb-4 font-bold">VIVA POR DENTRO</h3>
                        <p className="text-gray-600 font-light leading-relaxed px-4">Fermentada naturalmente con cultivos vivos que acompañan tu digestión.</p>
                    </a>
                    <a href="https://www.instagram.com/pormuchakombucha/" target="_blank" className="group flex flex-col text-center">
                        <div className="aspect-[4/5] bg-gray-300 overflow-hidden mb-8 relative rounded-2xl shadow-xl">
                            <video src="/reel-3.mp4" autoPlay loop muted playsInline className="object-cover w-full h-full transform transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
                        </div>
                        <h3 className="font-sans text-xl tracking-[0.2em] uppercase mb-4 font-bold">LIGERA Y REFRESCANTE</h3>
                        <p className="text-gray-600 font-light leading-relaxed px-4">Bebida burbujeante, libre de sellos, sin azúcar añadida.</p>
                    </a>
                </div>
            </section>

            {/* ========================================= */}
            {/* 5. GANCHO PSICOLÓGICO (ESTILO EDITORIAL DINÁMICO) */}
            {/* ========================================= */}
            <section className="relative overflow-hidden bg-[#F5F2EB] py-32 flex flex-col items-center justify-center border-t border-[#8B3A18]/5">

                {/* Texto de fondo en movimiento continuo (Marquee) */}
                <motion.div
                    animate={{ x: [0, -2000] }}
                    transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
                    className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap opacity-[0.03] pointer-events-none select-none"
                >
                    <span className="text-[12rem] font-serif font-bold tracking-tighter">
                        CUIDA TU CENTRO • VIVE PORMUCHA • FERMENTACIÓN REAL • CUIDA TU CENTRO • VIVE PORMUCHA • FERMENTACIÓN REAL •
                    </span>
                </motion.div>

                {/* Texto principal con entrada suave y palabras destacadas */}
                <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="relative z-10 text-center px-6 flex flex-col items-center"
                >
                    <span className="font-mono text-[10px] sm:text-xs tracking-[0.4em] text-[#8B3A18] uppercase font-bold">
                        Un estilo de vida
                    </span>
                    <h3 className="font-serif text-4xl sm:text-5xl md:text-6xl text-[#1A1A1A] mt-6 max-w-3xl mx-auto leading-tight">
                        El ritual diario de <br className="hidden md:block" />
                        <span className="italic text-[#8B3A18]">cuidar tu centro.</span>
                    </h3>

                    {/* NUEVO BOTÓN "NOSOTROS" (Estilo Secundario Elegante) */}
                    <div className="mt-12">
                        <a href="/nosotros" className="inline-block border border-[#8B3A18] text-[#8B3A18] px-8 py-3.5 rounded-md text-sm sm:text-base font-sans font-bold tracking-widest hover:bg-[#8B3A18] hover:text-[#F5F2EB] transition-colors shadow-sm hover:shadow-md uppercase">
                            Conoce más sobre nosotros
                        </a>
                    </div>
                </motion.div>
            </section>

            <section className="relative z-30 bg-[#F5F2EB] pb-16 md:pb-24">
                <SubscriptionLanding />
            </section>

            <Footer />

        </main>
    );
}