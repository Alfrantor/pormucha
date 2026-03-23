"use client";
import { useEffect, useState, Suspense } from "react"; // Añadimos Suspense
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

// 1. Envolvemos toda tu lógica actual en un componente interno
function ThanksContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const [status, setStatus] = useState<string>("loading");

    useEffect(() => {
        if (!sessionId) {
            setStatus("no_session");
            return;
        }

        const verify = async () => {
            try {
                const res = await fetch(`/api/checkout/verify?session_id=${sessionId}`);
                const data = await res.json();
                if (data.status === "paid" || data.status === "PAID") {
                    setStatus("verified");
                } else {
                    setStatus("pending");
                }
            } catch (err) {
                setStatus("error");
            }
        };

        verify();
    }, [sessionId]);

    return (
        <div className="min-h-screen bg-[#fdfaf5] grid md:grid-cols-2 items-center overflow-hidden">
            <div className="hidden md:flex relative w-full h-full items-center justify-center p-12 bg-[#f4f1e9]">
                <div className="relative w-[80%] h-[80%] aspect-[1/2]">
                    <Image
                        src="/botella-pormucha.png"
                        alt="Botella de Pormucha Kombucha"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#8B3A18]/5 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="relative flex flex-col items-center justify-center text-center p-6 md:p-16 h-full"
            >
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
                    {status === "verified" ? "¡Pago Confirmado!" : "¡Gracias por sumarte!"}
                </h1>

                <p className="text-lg text-gray-700 font-light mb-12 leading-relaxed max-w-md">
                    {status === "verified"
                        ? "Tu pedido ha sido pagado con éxito y ya estamos preparando tus Kombuchas."
                        : status === "pending"
                            ? "Estamos esperando la confirmación de tu pago. No te preocupes, te avisaremos por correo."
                            : "Hemos recibido tus datos con éxito. Tu pedido se procesará en breve."}
                </p>

                <div className="flex flex-col gap-4 w-full items-center">
                    {status === "verified" && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="w-full max-w-sm"
                        >
                            <p className="text-sm text-[#8B3A18] font-bold mb-3 uppercase tracking-widest">
                                ¡Paso importante!
                            </p>
                            <Link
                                href="/sign-up"
                                className="block w-full bg-[#2d4a3e] text-white px-10 py-4 rounded-full font-bold tracking-widest hover:bg-[#1A1A1A] transition-all duration-500 shadow-xl hover:scale-105 text-center"
                            >
                                CREAR MI CUENTA
                            </Link>
                            <p className="text-xs text-gray-500 mt-3 italic">
                                Usa el mismo correo con el que realizaste tu pago.
                            </p>
                        </motion.div>
                    )}

                    <Link
                        href="/"
                        className={`inline-block px-10 py-4 font-bold tracking-widest transition-all duration-500 ${status === "verified"
                            ? "text-gray-400 hover:text-[#8B3A18] text-sm"
                            : "bg-[#1A1A1A] text-white rounded-full shadow-xl hover:scale-105"
                            }`}
                    >
                        VOLVER AL INICIO
                    </Link>
                </div>

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

// 2. Exportamos la página principal envuelta en Suspense
export default function ThanksPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#fdfaf5] flex items-center justify-center font-serif text-2xl text-gray-400">
                Verificando tu orden...
            </div>
        }>
            <ThanksContent />
        </Suspense>
    );
}