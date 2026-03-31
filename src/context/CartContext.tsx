"use client";
import { createContext, useContext, useState, useEffect } from "react";

// 1. ACTUALIZAMOS LA INTERFAZ PARA QUE ACEPTE LA COMPOSICIÓN
interface CartItem {
  id: string;
  name: string;
  price: number;
  flavors: Record<string, number>;
  quantity: number;
  // AGREGAMOS ESTO:
  composition?: {
    flavorId: string;
    name: string;
    quantity: number;
  }[];
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Inicializamos el carrito intentando leer de localStorage para no perder la compra al recargar
  const [cart, setCart] = useState<CartItem[]>([]);

  // Efecto opcional: Cargar carrito de localStorage al iniciar (si lo usas)
  useEffect(() => {
    const savedCart = localStorage.getItem("pormucha_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Error cargando carrito:", e);
      }
    }
  }, []);

  // Efecto opcional: Guardar carrito en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem("pormucha_cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item: CartItem) => {
    setCart((prev) => [...prev, item]);
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("pormucha_cart");
  };

  // Calculamos el total (precio * cantidad de cada item)
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider");
  return context;
};