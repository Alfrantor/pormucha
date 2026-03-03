// src/app/layout.tsx
import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import { CartProvider } from "@/context/CartContext";
import { Toaster } from "sonner";

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

// --- METADATA SEO Y OPEN GRAPH ---
export const metadata: Metadata = {
  metadataBase: new URL('https://pormuchakombucha.com'), // Base para las URLs absolutas
  title: "Pormucha Kombucha | Fermentación Real",
  description: "Bebida fermentada artesanal con probióticos naturales. Únete a nuestra comunidad y sé el primero en probar la frescura viva.",
  openGraph: {
    title: "Pormucha Kombucha | Fermentación Real",
    description: "Únete a nuestra comunidad y sé el primero en probar la frescura viva. Bebida fermentada artesanal.",
    url: 'https://pormuchakombucha.com',
    siteName: 'Pormucha Kombucha',
    images: [
      {
        url: '/og-image.jpg', // <-- Imagen para compartir (1200x630px)
        width: 1200,
        height: 630,
        alt: 'Pormucha Kombucha - Botella y Frescura',
      },
    ],
    locale: 'es_MX',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Pormucha Kombucha | Fermentación Real",
    description: "Únete a nuestra comunidad y sé el primero en probar la frescura viva.",
    images: ['/og-image.jpg'], // Mismo enlace de la imagen
  },
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