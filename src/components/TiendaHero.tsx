"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useRef } from "react";

export default function TiendaHero() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"]
    });

    const yBackground = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacityText = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
    const yText = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

    return (
        <section ref={ref} className="relative h-[70vh] w-full flex items-center justify-center text-center overflow-hidden mb-16 border-b border-[#8B3A18]/20">
            {/* FONDO CON PARALLAX */}
            <motion.div 
                style={{ y: yBackground }}
                className="absolute inset-0 z-0 bg-black"
            >
                <div className="w-full h-full bg-[url('/hero-tienda.jpg')] bg-cover bg-center brightness-[0.55]" />
                
                {/* Degradado para transición suave hacia el contenido inferior */}
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#F5F2EB] to-transparent z-10" />
            </motion.div>

            {/* DECORACIÓN EXTRA (Banners/Burbujas tenues) */}
            <div className="absolute top-1/4 left-10 w-96 h-96 bg-[#8B3A18] rounded-full blur-[150px] opacity-20 pointer-events-none z-10" />
            <div className="absolute bottom-10 right-20 w-80 h-80 bg-[#EBDAAB] rounded-full blur-[120px] opacity-10 pointer-events-none z-10" />

            {/* CONTENIDO TEXTUAL DINÁMICO */}
            <motion.div 
                style={{ opacity: opacityText, y: yText }}
                className="relative z-20 w-full max-w-5xl px-6 flex flex-col items-center mt-12 md:mt-16"
            >
                {/* Etiqueta superior animada */}
                <motion.span 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-8 px-4 py-1.5 border border-white/30 rounded-full text-[10px] font-mono tracking-[0.3em] uppercase text-[#EBDAAB] backdrop-blur-sm"
                >
                    Exclusivo Online
                </motion.span>

                {/* Título Monumental */}
                <motion.h1 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                    className="font-serif text-[4rem] sm:text-[5rem] md:text-[6.5rem] leading-[0.85] tracking-tight text-white mb-6 drop-shadow-2xl"
                >
                    Arma tu <span className="text-[#EBDAAB] italic font-light pr-2">Pack.</span>
                </motion.h1>

                {/* Subtítulo descriptivo animado */}
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="text-lg md:text-2xl font-light font-roboto text-[#EAE7DD] max-w-2xl leading-relaxed drop-shadow-md border-l border-[#8B3A18] pl-6 py-2"
                >
                    Selecciona desde 6 hasta 24 botellas del sabor de tu preferencia y llévalo directo a tu puerta.
                </motion.p>
                
                {/* Botón Flotante para SCROLL */}
                <motion.a 
                    href="#packs"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1 }}
                    className="mt-16 flex flex-col items-center gap-3 text-white/50 hover:text-white transition-colors cursor-pointer group"
                >
                    <span className="text-[9px] uppercase tracking-widest font-bold">Ver opciones</span>
                    <motion.div 
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="p-3 border border-white/20 rounded-full group-hover:border-white/60 transition-colors"
                    >
                        <ArrowDown size={16} />
                    </motion.div>
                </motion.a>
            </motion.div>
        </section>
    );
}
