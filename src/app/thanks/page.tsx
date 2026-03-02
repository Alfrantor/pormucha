"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image"; // <--- IMPORTANTE: Usamos Image de Next.js

export default function ThanksPage() {
    return (
        <div className="min-h-screen bg-[#fdfaf5] grid md:grid-cols-2 items-center overflow-hidden">

            {/* LADO IZQUIERDO: LA BOTELLA (VISIBLE EN ESCRITORIO) */}
            <motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="hidden md:flex relative w-full h-full items-center justify-center p-12 bg-[#f4f1e9]" // Un tono más oscuro para contraste
            >
                {/* Usamos Image para optimización */}
                <div className="relative w-[80%] h-[80%] aspect-[1/2]">
                    <Image
                        src="/botella-pormucha.png"
                        alt="Botella de Pormucha Kombucha"
                        fill
                        className="object-contain" // Asegura que la botella se vea completa sin cortarse
                        priority // Carga la imagen de inmediato
                    />
                </div>
                {/* Decoración sutil de fondo */}
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#8B3A18]/5 rounded-full blur-3xl" />
            </motion.div>

            {/* LADO DERECHO: EL CONTENIDO */}
            <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="relative flex flex-col items-center justify-center text-center p-6 md:p-16 h-full"
            >
                {/* Icono de Check */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    className="w-20 h-20 bg-[#2d4a3e] rounded-full flex items-center justify-center mx-auto mb-10 shadow-lg"
                >
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                </motion.div>

                <h1 className="text-5xl font-serif text-[#1A1A1A] mb-6 leading-tight max-w-sm">
                    ¡Gracias por <br />
                    <span className="text-[#8B3A18] italic">sumarte!</span>
                </h1>

                <p className="text-lg text-gray-700 font-light mb-12 leading-relaxed max-w-md">
                    Hemos recibido tus datos con éxito. Estás a un paso de vivir momentos compartidos con el sabor de <span className="font-semibold text-[#2d4a3e]">Pormucha Kombucha</span>.
                </p>

                <Link
                    href="/"
                    className="inline-block bg-[#1A1A1A] text-white px-10 py-4 rounded-full font-bold tracking-widest hover:bg-[#8B3A18] transition-all duration-500 shadow-xl hover:scale-105"
                >
                    VOLVER AL INICIO
                </Link>

                {/* IMAGEN DE FONDO SUTIL PARA MÓVILES (OPCIONAL) */}
                <div className="md:hidden absolute inset-0 -z-10 opacity-10">
                    <Image
                        src="/botella-pormucha.png"
                        alt="Background bottle"
                        fill
                        className="object-contain"
                    />
                </div>
            </motion.div>

        </div>
    );
}