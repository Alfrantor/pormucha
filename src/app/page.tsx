"use client";
import { useRef } from "react";
import SubscriptionLanding from "@/components/SubscriptionLanding";
import { motion, useScroll, useTransform } from "framer-motion";
import { Instagram } from "lucide-react";

export default function ComingSoonPage() {
    const ref = useRef(null);

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end end"]
    });

    // --- TRANSFORMACIONES MAGICAS ---
    const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
    const contentY = useTransform(scrollYProgress, [0, 0.5], ["0%", "-5%"]);
    const contentOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

    return (
        <main ref={ref} className="relative min-h-[140vh] bg-[#F5F2EB] selection:bg-[#8B3A28] selection:text-white overflow-x-hidden">

            {/* ========================================= */}
            {/* SECCIÓN HERO CINEMATOGRÁFICA (50/50) */}
            {/* ========================================= */}
            <section className="relative min-h-[100svh] w-full flex items-center z-10 py-6 md:py-0 overflow-hidden">

                {/* CONTENEDOR DEL VIDEO: Mitad Izquierda */}
                <motion.div
                    style={{ y: videoY }}
                    className="absolute inset-y-0 left-0 w-full md:w-3/5 z-0"
                >
                    <div className="relative w-full h-full overflow-hidden">
                        <video
                            src="/video-hero.mp4"
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover brightness-[0.85] grayscale-[0.1]"
                        />
                        {/* DEGRADADO MAESTRO */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent/10 to-[#F5F2EB] z-10 hidden md:block" />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#F5F2EB] md:hidden z-10" />
                    </div>
                </motion.div>

                {/* CONTENIDO TEXTUAL: Mitad Derecha */}
                <div className="relative z-20 w-full h-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 px-6">
                    <div className="hidden md:block pointer-events-none" />

                    <motion.div
                        style={{ opacity: contentOpacity, y: contentY }}
                        className="flex flex-col justify-center items-start md:pl-8 lg:pl-16 w-full h-[85svh] md:h-auto"
                    >
                        {/* Ajuste Móvil Vertical: h-full y flex-col justify-between empujan 
                          el título arriba y el texto abajo. En PC (md) vuelven a centrarse. 
                        */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className="flex flex-col justify-between md:justify-center h-full w-full md:h-auto"
                        >
                            {/* BLOQUE SUPERIOR: TÍTULO */}
                            <div className="mt-12 md:mt-0">
                                <h2 className="font-mono text-[10px] tracking-[0.6em] text-[#8B3A18] uppercase mb-6 font-bold hidden md:block">
                                </h2>

                                {/* Ajuste Tablet: Bajamos de 7rem a 4.5rem en "md" para que no se corte en el iPad, sube a 8.5rem en monitores grandes (xl) */}
                                <h1 className="font-serif text-[3.5rem] sm:text-[4.5rem] md:text-[4.5rem] lg:text-[6rem] xl:text-[8.5rem] leading-[0.8] tracking-tight text-white md:text-[#1A1A1A] drop-shadow-md md:drop-shadow-none transition-colors">
                                    P<span className="italic font-light">o</span>rmucha <br />
                                    <span className="font-light text-[2.5rem] sm:text-[3rem] md:text-[3.5rem] lg:text-[4.5rem] xl:text-[5.5rem] text-[#EAE7DD] md:text-[#8B3A18]">
                                        K<span className="italic font-light">o</span>mbucha
                                    </span>
                                </h1>

                                <div className="h-[1px] w-28 bg-[#8B3A18] my-10 opacity-30 hidden md:block" />
                            </div>

                            {/* BLOQUE INFERIOR: FRASE PERSUASIVA */}
                            <div className="mb-10 md:mb-0 md:mt-6 w-full max-w-[90%] sm:max-w-md">
                                <p className="text-lg sm:text-xl md:text-2xl font-light leading-relaxed text-white md:text-gray-700 italic border-l-2 border-white/40 md:border-[#8B3A18]/20 pl-4 md:pl-6 bg-black/30 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none p-4 md:p-0 rounded-lg md:rounded-none shadow-lg md:shadow-none">
                                    "Estamos fermentando algo increíble. La frescura viva ahora en línea."
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>

                {/* INDICADOR DE SCROLL */}
                <motion.div
                    className="hidden sm:flex absolute bottom-6 md:bottom-10 right-6 md:right-10 flex-col items-center gap-4 opacity-20"
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <span className="font-mono text-[8px] uppercase tracking-[0.5em] rotate-90 mb-12 text-[#1A1A1A]">Desliza</span>
                    <div className="w-[1px] h-12 md:h-20 bg-[#1A1A1A]" />
                </motion.div>
            </section>

            {/* ========================================= */}
            {/* BLOQUE DE VALOR: EL GANCHO PSICOLÓGICO */}
            {/* ========================================= */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center py-16 md:py-20 bg-[#F5F2EB] px-6"
            >
                <span className="font-mono text-[10px] tracking-[0.4em] text-[#8B3A18] uppercase font-bold">Beneficio de Lanzamiento</span>
                <h3 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] mt-6 max-w-3xl mx-auto leading-tight">
                    Queremos que seas el primero en probar la frescura.
                </h3>
                <p className="text-gray-600 mt-4 text-base sm:text-lg font-light max-w-xl mx-auto leading-relaxed">
                    Registra tus datos y obtén un <strong className="text-[#8B3A18] font-bold">descuento especial</strong> el día de nuestra apertura en línea oficial.
                </p>
            </motion.div>

            {/* SECCIÓN SUSCRIPCIÓN */}
            <section className="relative z-30 bg-[#F5F2EB] pb-16 md:pb-20">
                <SubscriptionLanding />
            </section>

            {/* ========================================= */}
            {/* FOOTER */}
            {/* ========================================= */}
            <footer className="relative z-30 py-12 md:py-16 px-6 md:px-8 bg-[#F5F2EB] border-t border-[#8B3A18]/10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8">
                    <p className="opacity-40 font-mono text-[8px] sm:text-[9px] tracking-[0.3em] sm:tracking-[0.5em] uppercase text-[#1A1A1A] text-center">
                        © 2026 PORMUCHA KOMBUCHA — FERMENTACIÓN REAL
                    </p>

                    <a
                        href="https://www.instagram.com/pormuchakombucha/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-4 text-[#1A1A1A] no-underline"
                    >
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50 group-hover:opacity-100 transition-opacity">Nuestra Comunidad</span>
                        <div className="p-3 rounded-full border border-[#1A1A1A]/10 group-hover:bg-[#8B3A18] group-hover:border-[#8B3A18] transition-all duration-500">
                            <Instagram size={18} className="group-hover:text-white transition-colors" />
                        </div>
                    </a>
                </div>
            </footer>
        </main>
    );
}