"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { useUser } from "@clerk/nextjs";

function ThanksContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const type = searchParams.get("type"); // "suscripcion" o null (compra única)
    const isSubscription = type === "suscripcion";
    const [status, setStatus] = useState<string>("loading");

    const { clearCart } = useCart();
    const { isSignedIn } = useUser();

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
                    // 3. ¡LA MAGIA SUCEDE AQUÍ!
                    // Si el pago es verificado, borramos todo el rastro del carrito
                    clearCart();
                } else {
                    setStatus("pending");
                }
            } catch (err) {
                setStatus("error");
            }
        };

        verify();
    }, [sessionId, clearCart]); // Añadimos clearCart a las dependencias

    return (
        <div className="min-h-screen bg-[#fdfaf5] grid md:grid-cols-2 items-center overflow-hidden">
            {/* ... Resto de tu código de UI se mantiene igual ... */}
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

                {status === "verified" && !isSubscription ? (
                    <p className="text-sm text-[#8B3A18] font-semibold mb-10 max-w-md leading-6">
                        Pronto enviaremos un correo con los datos de tu envío.
                    </p>
                ) : null}

                <div className="flex flex-col gap-4 w-full items-center">
                    {status === "verified" && isSubscription && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="w-full max-w-sm"
                        >
                            {isSignedIn ? (
                                // Ya tiene cuenta → ir directo al perfil
                                <>
                                    <p className="text-sm text-[#8B3A18] font-bold mb-3 uppercase tracking-widest">
                                        ¡Tu suscripción está activa!
                                    </p>
                                    <Link
                                        href="/perfil"
                                        className="block w-full bg-[#2d4a3e] text-white px-10 py-4 rounded-full font-bold tracking-widest hover:bg-[#1A1A1A] transition-all duration-500 shadow-xl hover:scale-105 text-center"
                                    >
                                        IR A MI PERFIL →
                                    </Link>
                                </>
                            ) : (
                                // Caso edge: llegó sin sesión → crear cuenta
                                <>
                                    <p className="text-sm text-[#8B3A18] font-bold mb-3 uppercase tracking-widest">
                                        ¡Paso importante!
                                    </p>
                                    <Link
                                        href={`/sign-up?redirect_url=${encodeURIComponent("/perfil")}`}
                                        className="block w-full bg-[#2d4a3e] text-white px-10 py-4 rounded-full font-bold tracking-widest hover:bg-[#1A1A1A] transition-all duration-500 shadow-xl hover:scale-105 text-center"
                                    >
                                        CREAR MI CUENTA
                                    </Link>
                                </>
                            )}
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
            </motion.div>
        </div>
    );
}

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
