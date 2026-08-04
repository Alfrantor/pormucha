"use client";
import { createContext, useContext, useState, useEffect } from "react";

// 1. ACTUALIZAMOS LA INTERFAZ PARA QUE ACEPTE LA COMPOSICIÓN
interface CartItem {
  id: string;
  name: string;
  price: number;
  packQuantity?: number;
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
  updateCartItem: (id: string, item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateCartItemQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Inicializamos el carrito desde localStorage para conservarlo entre recargas.
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];

    const savedCart = localStorage.getItem("pormucha_cart");
    if (!savedCart) return [];

    try {
      return JSON.parse(savedCart);
    } catch (e) {
      console.error("Error cargando carrito:", e);
      return [];
    }
  });

  // Efecto opcional: Guardar carrito en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem("pormucha_cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item: CartItem) => {
    setCart((prev) => [...prev, item]);
  };

  const updateCartItem = (id: string, item: CartItem) => {
    setCart((prev) => prev.map((current) => (current.id === id ? item : current)));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateCartItemQuantity = (id: string, quantity: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          if (quantity <= 0) return null;
          return { ...item, quantity };
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("pormucha_cart");
  };

  // Calculamos el total (precio * cantidad de cada item)
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateCartItem, removeFromCart, updateCartItemQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider");
  return context;
};
