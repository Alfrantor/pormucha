"use client"
import { useCart } from "@/context/CartContext";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export default function FloatingCart() {
    const { cart } = useCart();
    const pathname = usePathname();
    
    // Total de productos en el carrito
    const itemQuantity = cart.reduce((acc, current) => acc + current.quantity, 0);

    // Ocultar el flotante si ya estamos en la página de checkout
    if (pathname === "/checkout" || pathname?.startsWith("/pos") || pathname?.startsWith("/admin")) return null;

    return (
        <AnimatePresence>
            {itemQuantity > 0 && (
                <Link href="/checkout">
                    <motion.div
                        initial={{ scale: 0, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0, opacity: 0, y: 50 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="fixed bottom-6 right-6 md:bottom-8 md:right-10 z-[100] flex items-center justify-center w-16 h-16 bg-[#8B3A18] text-white rounded-full shadow-[0_10px_40px_rgba(139,58,24,0.5)] hover:bg-black hover:-translate-y-2 transition-all duration-300 cursor-pointer border border-[#EBDAAB]/30"
                    >
                        <ShoppingBag size={24} strokeWidth={2} />
                        
                        <motion.div
                            key={itemQuantity}
                            initial={{ scale: 0.5, rotate: -15 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                            className="absolute -top-1 -right-1 bg-[#EAE7DD] text-[#8B3A18] text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-[#8B3A18] shadow-md font-mono"
                        >
                            {itemQuantity}
                        </motion.div>
                    </motion.div>
                </Link>
            )}
        </AnimatePresence>
    );
}
