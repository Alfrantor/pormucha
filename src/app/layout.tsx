// src/app/layout.tsx
import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import { CartProvider } from "@/context/CartContext";
import { Toaster } from "sonner";
import FloatingCart from "@/components/FloatingCart";

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

// --- METADATA SEO Y OPEN GRAPH ACTUALIZADOS ---
export const metadata: Metadata = {
  metadataBase: new URL('https://pormuchakombucha.com'), // Excelente práctica tener esto
  title: 'Pormucha Kombucha | Fermentación Real y Bienestar',
  description: 'Bebida fermentada naturalmente con probióticos vivos. 100% fresca, natural, ligera y refrescante. Cuidamos tu centro desde Campeche con envíos a todo México.',
  keywords: [
    'kombucha',
    'probióticos',
    'bebida natural',
    'salud digestiva',
    'Pormucha',
    'fermentación',
    'kombucha en México',
    'kombucha Campeche'
  ],
  openGraph: {
    title: 'Pormucha Kombucha | Fermentación Real',
    description: 'Bebida fermentada naturalmente con probióticos vivos, ligera y refrescante. Cuidamos tu centro desde Campeche para todo México.',
    url: 'https://pormuchakombucha.com',
    siteName: 'Pormucha Kombucha',
    images: [
      {
        url: '/og-image.png', // Debe coincidir con el nombre de tu imagen en la carpeta public
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
    description: "Bebida fermentada naturalmente con probióticos vivos. Envíos a todo México.",
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  }
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
            <FloatingCart />
            <Toaster richColors position="top-center" />
          </body>
        </html>
      </CartProvider>
    </ClerkProvider>
  );
}