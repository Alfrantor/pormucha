"use client";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Minus, Plus, ShoppingBag, ArrowRight, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";

interface PackProps {
    id: string;
    nombre: string;
    capacidad: number;
    precio: number;
    clubDiscountPercent?: number;
    isSubscriptionMode?: boolean;
    flavors: { id: string, name: string, stock: number }[];
}

export default function PackSelector({ id, nombre, capacidad, precio, clubDiscountPercent = 0, isSubscriptionMode = false, flavors }: PackProps) {
    const { addToCart } = useCart();
    const [seleccion, setSeleccion] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        flavors.forEach(f => {
            initial[f.name] = 0;
        });
        return initial;
    });
    const [isExpanded, setIsExpanded] = useState(false);

    const SABORES = flavors.map(f => f.name);
    const totalActual = Object.values(seleccion).reduce((a, b) => a + b, 0);
    const remaining = capacidad - totalActual;

    const getImage = (qty: number) => {
        if (qty === 6) return "/pack-6.JPG";
        if (qty === 8) return "/pack-8.JPG";
        if (qty === 12) return "/pack-12.JPG";
        if (qty === 24) return "/pack-24.JPG";
        return "/hero-tienda.jpg";
    };

    const cambiarCantidad = (sabor: string, delta: number) => {
        const actual = seleccion[sabor] || 0;
        const flavorData = flavors.find(f => f.name === sabor);
        const flavorStock = flavorData?.stock || 0;

        if (delta > 0 && totalActual < capacidad) {
            if (actual < flavorStock) {
                setSeleccion({ ...seleccion, [sabor]: actual + 1 });
            } else {
                toast.error(`No hay más stock de ${sabor}`, {
                    description: `Solo tenemos ${flavorStock} piezas disponibles.`
                });
            }
        } else if (delta < 0 && actual > 0) {
            setSeleccion({ ...seleccion, [sabor]: actual - 1 });
        }
    };

    const displayPrice = isSubscriptionMode && clubDiscountPercent > 0
        ? precio * (1 - clubDiscountPercent / 100)
        : precio;

    const handleAddToCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (totalActual !== capacidad) return;

        if (isSubscriptionMode) {
            window.location.href = "/suscripciones";
            return;
        }

        // --- NUEVA LÓGICA DE DESGLOSE ---
        // Convertimos el Record<nombre, cantidad> en un array de {flavorId, quantity}
        const composition = Object.entries(seleccion)
            .filter(([_, qty]) => qty > 0) // Solo los sabores elegidos
            .map(([name, qty]) => {
                const flavorData = flavors.find(f => f.name === name);
                return {
                    flavorId: flavorData?.id,
                    name: name, // Lo guardamos también para mostrarlo en el carrito
                    quantity: qty
                };
            });
        console.log("📦 Enviando al carrito:", {
            id,
            name: nombre,
            price: displayPrice,
            quantity: 1,
            composition: composition,
            flavors: seleccion,
        });

        addToCart({
            id, // ID del Product (Pack)
            name: nombre,
            price: displayPrice,
            quantity: 1,
            // Enviamos la composición detallada para Prisma
            composition: composition,
            // Mantenemos flavors por compatibilidad si lo usas en el resumen visual del carrito
            flavors: seleccion,
        });

        toast.success(`Hecho. Pack de ${capacidad} en tu carrito`, {
            description: "¡Estás a un paso de la fermentación real!"
        });

        // Reset (Opcional: puedes dejar los nombres fijos o dinámicos)
        const resetSeleccion: Record<string, number> = {};
        flavors.forEach(f => resetSeleccion[f.name] = 0);
        setSeleccion(resetSeleccion);

        setIsExpanded(false);
    };

    return (
        <div
            onClick={() => !isExpanded && setIsExpanded(true)}
            className={clsx(
                "relative flex flex-col transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] font-sans group select-none rounded-2xl",
                "bg-[#1A1A1A] shadow-2xl",
                capacidad === 12 && !isExpanded ? "ring-2 ring-[#EBDAAB]/60 shadow-[0_0_35px_rgba(235,218,171,0.2)]" : "",
                isExpanded ? "scale-[1.02] ring-2 ring-[#8B3A18] z-30 min-h-[500px]" : "cursor-pointer hover:scale-105 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] min-h-[420px]"
            )}
        >
            {/* CINTA DE GARANTÍA PARA EL PACK DE 6 */}
            {capacidad === 6 && (
                <div className="absolute top-0 left-0 w-44 h-44 overflow-hidden z-[40] pointer-events-none rounded-tl-2xl">
                    <div className="absolute top-[28px] -left-[54px] w-[210px] bg-[#9e1c1c] text-white text-[8px] sm:text-[9px] font-sans font-black tracking-wide text-center py-2 transform -rotate-45 border-b-[3px] border-[#EBDAAB] shadow-2xl leading-snug flex flex-col justify-center items-center">
                        <span className="text-[6px] tracking-[0.2em] font-medium opacity-90 -mb-0.5">GARANTÍA DE</span>
                        <span>100% SATISFACCIÓN</span>
                    </div>
                </div>
            )}

            {/* FONDO IMAGEN Y GRADIENTE */}
            <div className="absolute inset-0 z-0 rounded-2xl overflow-hidden pointer-events-none">
                <div
                    className={clsx(
                        "w-full h-full bg-cover bg-center transition-transform duration-1000",
                        isExpanded ? "scale-110 opacity-30 blur-sm" : "scale-100 opacity-60 group-hover:scale-105 group-hover:opacity-40"
                    )}
                    style={{ backgroundImage: `url('${getImage(capacidad)}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                {capacidad === 12 && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#8B3A18]/20 via-[#EBDAAB]/10 to-transparent mix-blend-overlay pointer-events-none" />
                        {!isExpanded && (
                            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-80">
                                {/* DESTELLOS BASE */}
                                <Sparkles size={16} fill="currentColor" className="text-[#EBDAAB] absolute top-[15%] left-[20%] animate-pulse" style={{ animationDuration: '2s' }} />
                                <Sparkles size={12} fill="currentColor" className="text-white absolute top-[40%] right-[15%] animate-pulse" style={{ animationDuration: '3s' }} />
                                <Sparkles size={14} fill="currentColor" className="text-yellow-600 absolute bottom-[35%] left-[25%] animate-pulse" style={{ animationDuration: '2.5s' }} />
                                <Sparkles size={24} fill="currentColor" className="text-[#EBDAAB] absolute top-[10%] right-[30%] opacity-0 animate-[ping_4s_infinite]" />

                                {/* DESTELLOS ADICIONALES ON HOVER */}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                                    <Sparkles size={18} fill="currentColor" className="text-[#EBDAAB] absolute top-[25%] right-[20%] animate-pulse" style={{ animationDuration: '1.5s' }} />
                                    <Sparkles size={10} fill="currentColor" className="text-yellow-400 absolute top-[50%] left-[10%] animate-pulse" style={{ animationDuration: '1.8s' }} />
                                    <Sparkles size={22} fill="currentColor" className="text-white absolute bottom-[20%] right-[30%] animate-pulse" style={{ animationDuration: '2.2s' }} />
                                    <Sparkles size={14} fill="currentColor" className="text-[#EBDAAB] absolute top-[60%] left-[40%] animate-pulse" style={{ animationDuration: '2.8s' }} />
                                    <Sparkles size={12} fill="currentColor" className="text-yellow-600 absolute top-[18%] left-[45%] animate-pulse" style={{ animationDuration: '2.4s' }} />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* FLYING SPARKLES EXPERIENCIA DE HOVER */}
            {capacidad === 12 && !isExpanded && (
                <div className="absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute top-4 left-4 transition-transform duration-1000 ease-out group-hover:-translate-x-16 group-hover:-translate-y-16 group-hover:rotate-12">
                        <Sparkles size={28} fill="currentColor" className="text-[#EBDAAB] animate-pulse blur-[1px]" />
                    </div>
                    <div className="absolute top-4 right-4 transition-transform duration-1000 delay-75 ease-out group-hover:translate-x-16 group-hover:-translate-y-12 group-hover:-rotate-12">
                        <Sparkles size={36} fill="currentColor" className="text-white animate-[pulse_1.5s_infinite] drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                    </div>
                    <div className="absolute bottom-16 left-4 transition-transform duration-1000 delay-150 ease-out group-hover:-translate-x-14 group-hover:translate-y-10 group-hover:-rotate-45">
                        <Sparkles size={22} fill="currentColor" className="text-yellow-400 animate-[pulse_2s_infinite] drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                    </div>
                    <div className="absolute top-1/2 right-4 transition-transform duration-1000 delay-100 ease-out group-hover:translate-x-14 group-hover:-translate-y-8 group-hover:rotate-45">
                        <Sparkles size={24} fill="currentColor" className="text-yellow-600 animate-[pulse_2.5s_infinite] blur-[1px]" />
                    </div>
                    <div className="absolute bottom-1/4 right-8 transition-transform duration-[1200ms] delay-200 ease-out group-hover:translate-x-16 group-hover:translate-y-12 group-hover:rotate-90">
                        <Sparkles size={32} fill="currentColor" className="text-[#EBDAAB] animate-pulse drop-shadow-[0_0_15px_rgba(235,218,171,0.8)]" />
                    </div>
                </div>
            )}

            {/* CONTENIDO SUPERIOR (Siempre Visible) */}
            <div className="relative z-10 p-6 flex flex-col justify-between h-full flex-grow">
                <div>
                    <div className="flex justify-end items-start mb-2 gap-3">
                        <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-[#EBDAAB] border border-white/10">
                            {capacidad} BOTELLAS
                        </span>
                        {!isExpanded && (
                            <div className="bg-[#8B3A18] w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-xl">
                                <Plus size={16} strokeWidth={3} />
                            </div>
                        )}
                    </div>

                    <h3 className={clsx(
                        "font-serif font-light text-white transition-all duration-500",
                        isExpanded ? "text-3xl mt-2" : "text-4xl mt-6 group-hover:text-[#EBDAAB]",
                        capacidad === 6 && !isExpanded && "ml-12",
                        capacidad === 6 && isExpanded && "ml-6"
                    )}>
                        {nombre}
                    </h3>
                    {!isExpanded && (
                        <div className={clsx("mt-3 flex items-center", capacidad === 6 && "ml-12")}>
                            {capacidad === 6 && <p className="font-sans text-xs tracking-[0.2em] uppercase text-gray-300 font-light opacity-90 transition-opacity">El Kit de Introducción</p>}
                            {capacidad === 8 && <p className="font-sans text-xs tracking-[0.2em] uppercase text-gray-300 font-light opacity-90 transition-opacity">Para compartir</p>}
                            {capacidad === 12 && (
                                <div className="flex items-center gap-2 text-[#EBDAAB] font-bold">
                                    <Sparkles size={14} className="animate-pulse" />
                                    <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#EBDAAB] to-yellow-600">El Favorito de Casa</p>
                                </div>
                            )}
                            {capacidad === 24 && <p className="font-sans text-xs tracking-[0.2em] uppercase text-gray-300 font-light opacity-90 transition-opacity">Kombucha Lover Pro</p>}
                        </div>
                    )}
                </div>

                {/* BOTÓN Y PRECIOS CUANDO ESTÁ CERRADO */}
                {!isExpanded && (
                    <div className="mt-auto pt-6 flex flex-col items-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 pb-2">
                        <div className="flex items-baseline gap-2 mb-6 relative">
                            <span className="text-4xl font-serif text-white">${isSubscriptionMode ? displayPrice.toFixed(2) : precio}</span>
                            <span className="text-xs text-gray-400 font-bold tracking-widest uppercase">MXN</span>
                            {isSubscriptionMode && clubDiscountPercent > 0 && (
                                <span className="absolute -top-4 left-1 text-[11px] line-through text-[#8B3A18] font-bold">
                                    ${precio}
                                </span>
                            )}
                        </div>

                        <div className="w-full px-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold tracking-[0.2em] uppercase text-[10px] md:text-xs py-4 rounded-xl flex items-center justify-center gap-2 text-center group-hover:bg-[#8B3A18] group-hover:border-[#8B3A18] transition-colors duration-300">
                            <span>{isSubscriptionMode ? "SUSCRIBIRME HOY" : "PERSONALIZA TUS SABORES"}</span>
                            <ArrowRight size={14} className="flex-shrink-0" />
                        </div>
                    </div>
                )}

                {/* FORMULARIO DE SABORES CUANDO ESTÁ EXPANDIDO */}
                <div className={clsx(
                    "flex flex-col flex-grow transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]",
                    isExpanded ? "opacity-100 translate-y-0 mt-4 h-auto" : "opacity-0 translate-y-10 absolute pointer-events-none"
                )}>
                    <div className="mb-4">
                        <p className="text-[#EBDAAB] text-xs font-bold uppercase tracking-widest flex justify-between items-center border-b border-white/10 pb-2">
                            <span>Faltan por elegir:</span>
                            <span className="bg-[#8B3A18] text-white px-2 py-0.5 rounded text-sm">{remaining}</span>
                        </p>
                    </div>

                    <div className="flex-grow space-y-3">
                        {flavors.map(flavor => {
                            const qty = seleccion[flavor.name] || 0;
                            const isOutOfStock = flavor.stock <= 0;

                            return (
                                <div key={flavor.id} className={clsx(
                                    "flex justify-between items-center bg-black/40 backdrop-blur-md border border-white/5 rounded-xl p-3 hover:bg-black/60 transition-colors",
                                    isOutOfStock && "opacity-50 grayscale"
                                )}>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white tracking-wide">{flavor.name}</span>
                                        {isOutOfStock && <span className="text-[10px] text-red-400 font-bold uppercase tracking-tighter">Agotado</span>}
                                        {!isOutOfStock && flavor.stock < 10 && (
                                            <span className="text-[9px] text-[#EBDAAB] font-bold uppercase tracking-tighter">Últimas {flavor.stock}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 bg-white/10 rounded-full px-1 py-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); cambiarCantidad(flavor.name, -1); }}
                                            disabled={qty === 0}
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-black/50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                        >
                                            <Minus size={14} strokeWidth={3} />
                                        </button>
                                        <span className="w-4 text-center text-base font-bold text-white font-mono">{qty}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); cambiarCantidad(flavor.name, 1); }}
                                            disabled={totalActual >= capacidad || isOutOfStock || qty >= flavor.stock}
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-[#8B3A18] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                        >
                                            <Plus size={14} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10">
                        <div className="flex justify-between items-end mb-4">
                            <span className="text-xs text-gray-400 font-bold tracking-widest uppercase">Total a pagar</span>
                            <div className="flex flex-col items-end">
                                {isSubscriptionMode && clubDiscountPercent > 0 && (
                                    <span className="text-xs line-through text-[#8B3A18] font-bold">
                                        ${precio}
                                    </span>
                                )}
                                <span className="text-2xl font-serif text-white">${isSubscriptionMode ? displayPrice.toFixed(2) : precio}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleAddToCart}
                            disabled={totalActual !== capacidad}
                            className={clsx(
                                "w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-[10px] md:text-xs tracking-[0.2em] transition-all duration-300 uppercase shadow-2xl",
                                totalActual === capacidad
                                    ? "bg-[#EBDAAB] text-[#1A1A1A] hover:bg-white hover:scale-[1.02]"
                                    : "bg-white/10 text-white/40 cursor-not-allowed"
                            )}
                        >
                            <ShoppingBag size={16} strokeWidth={2.5} />
                            {totalActual === capacidad
                                ? (isSubscriptionMode ? "IR A PLANES" : "AGREGAR AL CARRITO")
                                : "SELECCIONA SABORES DENTRO"}
                        </button>

                        {/* Botón sutil para cancelar/cerrar */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                            className="w-full text-center text-[10px] text-white/40 uppercase tracking-widest mt-4 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}