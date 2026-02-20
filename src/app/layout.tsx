// src/app/layout.tsx
import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google"; // Importamos las nuevas fuentes
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import { CartProvider } from "@/context/CartContext";
import { Toaster } from "sonner"; // Importamos el Toaster para las notificaciones

// Configuración de la fuente Serif (Títulos elegantes)
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

// Configuración de la fuente Sans (Cuerpo de texto limpio)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pormucha Kombucha - Bebida Fermentada Artesanal",
  description: "Bebida fermentada artesanal con probióticos naturales. Elige tu paquete y personaliza tus sabores favoritos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <CartProvider>
        <html lang="es" className={`${playfair.variable} ${inter.variable}`}>
          <body className="antialiased font-sans bg-[#F5F2EB] text-[#1A1A1A]">
            {children}
            <Toaster richColors position="top-center" />
          </body>
        </html>
      </CartProvider>
    </ClerkProvider>
  );
}