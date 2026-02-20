"use client";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";

interface PackProps {
    id: string;
    nombre: string;
    capacidad: number;
    precio: number;
}

export default function PackSelector({ id, nombre, capacidad, precio }: PackProps) {
    const { addToCart } = useCart();
    const [seleccion, setSeleccion] = useState<Record<string, number>>({
        "Piña": 0, "Té Negro": 0, "Té Verde": 0, "Jamaica": 0
    });
    const [isExpanded, setIsExpanded] = useState(false);

    const SABORES = Object.keys(seleccion);
    const totalActual = Object.values(seleccion).reduce((a, b) => a + b, 0);
    const remaining = capacidad - totalActual;

    // Helper para obtener la imagen según capacidad
    const getImage = (qty: number) => {
        if (qty === 6) return "/pack-6.jpg";
        if (qty === 8) return "/pack-8.jpg";
        if (qty === 12) return "/pack-12.jpg";
        if (qty === 24) return "/pack-24.jpg";
        return "/pack-default.jpg";
    };

    const cambiarCantidad = (sabor: string, delta: number) => {
        const actual = seleccion[sabor];
        if (delta > 0 && totalActual < capacidad) {
            setSeleccion({ ...seleccion, [sabor]: actual + 1 });
        } else if (delta < 0 && actual > 0) {
            setSeleccion({ ...seleccion, [sabor]: actual - 1 });
        }
    };

    const handleAddToCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (totalActual !== capacidad) return;

        addToCart({
            id,
            name: nombre,
            price: precio,
            flavors: seleccion,
            quantity: 1,

        });
        toast.success(`Pack de ${capacidad} agregado`, {
            description: "Tu selección ha sido guardada en el carrito"
        });
        setSeleccion({ "Piña": 0, "Té Negro": 0, "Té Verde": 0, "Jamaica": 0 });
        setIsExpanded(false);
    };

    return (
        <div
            onClick={() => setIsExpanded(!isExpanded)}
            className={clsx(
                "cursor-pointer group relative flex flex-col p-8 transition-all duration-500 overflow-hidden",
                "bg-white border rounded-xl", // Agregué rounded-xl para bordes suaves
                isExpanded
                    ? "border-black shadow-xl scale-[1.02] z-10"
                    : "border-transparent hover:border-gray-200 shadow-sm hover:shadow-2xl hover:-translate-y-2"
            )}
        >
            {/* ============================================== */}
            {/* 1. IMAGEN DE FONDO (Capa Absoluta)             */}
            {/* ============================================== */}
            <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out pointer-events-none">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url('${getImage(capacidad)}')` }}
                />
                {/* Overlay oscuro para leer el texto blanco */}
                <div className="absolute inset-0 bg-black/50 transition-colors duration-500" />
            </div>

            {/* ============================================== */}
            {/* 2. CONTENIDO (Texto y Lógica)                  */}
            {/* ============================================== */}
            {/* Wrapper con z-10 para estar SOBRE la imagen */}
            <div className="relative z-10 flex flex-col h-full justify-between">

                {/* Header del Card */}
                <div className="text-center space-y-4 mb-2 group-hover:text-white transition-colors duration-300">
                    <span className="font-serif text-6xl md:text-7xl font-medium block text-gray-900 group-hover:text-white transition-colors">
                        {capacidad}
                    </span>
                    <span className="text-xs tracking-[0.2em] font-sans text-gray-500 uppercase block group-hover:text-white/80 transition-colors">
                        BEBIDAS
                    </span>
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl font-serif text-gray-900 group-hover:text-white transition-colors">${precio}</span>
                        <span className="text-[10px] text-gray-400 font-sans tracking-wide group-hover:text-white/70 transition-colors">
                            ${Math.round(precio / capacidad)} c/u
                        </span>
                    </div>
                </div>

                {/* Selector de Sabores (Visible solo al expandir) */}
                <div className={clsx(
                    "overflow-hidden transition-all duration-500 ease-in-out font-sans",
                    isExpanded ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0"
                )}>
                    <div className="space-y-3 mb-6">
                        <p className="text-center text-xs text-gray-500 mb-4 font-medium tracking-wide group-hover:text-white/90">
                            ELIGE TUS SABORES ({remaining} restantes)
                        </p>
                        {SABORES.map(sabor => (
                            <div key={sabor} className="flex justify-between items-center group/item hover:bg-gray-50/10 p-2 rounded-lg transition-colors">
                                <span className="text-sm font-medium text-gray-600 group-hover:text-white">{sabor}</span>
                                <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-full px-2 py-1 shadow-sm">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); cambiarCantidad(sabor, -1); }}
                                        disabled={seleccion[sabor] === 0}
                                        className="p-1 text-gray-600 hover:text-red-500 disabled:opacity-20 transition-colors"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="w-4 text-center text-sm font-bold text-gray-900">{seleccion[sabor]}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); cambiarCantidad(sabor, 1); }}
                                        disabled={totalActual >= capacidad}
                                        className="p-1 text-gray-600 hover:text-green-600 disabled:opacity-20 transition-colors"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="relative pt-2">
                        <button
                            onClick={handleAddToCart}
                            disabled={totalActual !== capacidad}
                            className={clsx(
                                "w-full py-4 text-xs font-bold tracking-[0.2em] text-white transition-all duration-300 rounded shadow-lg",
                                totalActual === capacidad
                                    ? "bg-[#8B3A28] hover:bg-[#722f20] hover:scale-105"
                                    : "bg-gray-400 cursor-not-allowed opacity-50"
                            )}
                        >
                            {totalActual === capacidad ? "AGREGAR AL CARRITO" : "COMPLETA TU PACK"}
                        </button>
                        {/* Barra de progreso sutil */}
                        <div className="absolute bottom-0 left-0 h-1 bg-gray-100/30 w-full overflow-hidden rounded-full mt-2">
                            <div
                                className="h-full bg-[#8B3A28] transition-all duration-300"
                                style={{ width: `${(totalActual / capacidad) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Indicador de "Seleccionar" cuando está cerrado */}
                {!isExpanded && (
                    <div className="absolute bottom-4 left-0 w-full text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0 delay-100">
                        <span className="text-[10px] uppercase tracking-widest text-white font-bold border-b border-white pb-1">
                            Personalizar
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}