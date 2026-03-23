import { db } from "@/lib/db";
import StoreGrid from "@/components/StoreGrid";
import Navbar from "@/components/Navbar";
import TiendaHero from "@/components/TiendaHero";
import Footer from "@/components/Footer";
import { Info, CheckCircle2 } from "lucide-react";
import FAQItem from "@/components/FAQItem";

export default async function TiendaPage() {
  const packs = await db.product.findMany({
    where: { isArchived: false },
    orderBy: { price: 'asc' }
  });

  const rawFlavors = await db.flavor.findMany({
    where: { isArchived: false },
    include: { locationStocks: true }
  });

  const flavors = rawFlavors.map(f => ({
    id: f.id,
    name: f.name,
    stock: f.locationStocks.reduce((sum, s) => sum + s.quantity, 0)
  }));

  return (
    <main className="min-h-screen bg-[#F5F2EB] selection:bg-[#8B3A28] selection:text-white font-sans">

      <div className="absolute top-0 w-full z-50">
        <Navbar />
      </div>

      <TiendaHero />

      <StoreGrid 
        packs={packs.map(pack => ({
          id: pack.id,
          name: pack.name,
          quantity: pack.quantity,
          price: Number(pack.price),
          clubDiscountPercent: pack.clubDiscountPercent
        }))} 
        flavors={flavors}
      />

      {/* ============================================== */}
      {/* SECCIÓN DE GARANTÍA */}
      {/* ============================================== */}
      <section className="bg-[#EAE7DD] py-20 px-6 border-t border-[#8B3A18]/20 relative overflow-hidden">
        {/* Banner decorativo tipo listón en desktop */}
        <div className="absolute top-10 -left-16 w-64 bg-[#9B1C1C] text-white text-xs font-bold tracking-[0.2em] transform -rotate-45 text-center py-2 shadow-2xl border-b-4 border-[#EBDAAB] z-10 hidden lg:block">
          GARANTÍA DE <br/>100% SATISFACCIÓN
        </div>
        
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-20 relative z-20">
          
          {/* Sello visual de garantía */}
          <div className="md:w-1/3 flex justify-center">
            <div className="w-56 h-56 rounded-full border border-[#8B3A18]/20 flex flex-col items-center justify-center bg-white shadow-[0_20px_40px_rgba(139,58,24,0.15)] relative">
              <div className="w-52 h-52 rounded-full border border-dashed border-[#8B3A18]/40 flex flex-col items-center justify-center bg-[#F5F2EB]">
                 <span className="text-[#8B3A18] font-serif text-[4rem] leading-none mb-1">100%</span>
                 <span className="font-mono text-[10px] uppercase tracking-widest text-[#1A1A1A] font-bold">Satisfacción</span>
              </div>
              <div className="absolute -bottom-4 bg-[#1A1A1A] text-[#EBDAAB] font-sans text-xs tracking-[0.25em] font-bold uppercase px-6 py-2 rounded-full shadow-lg">
                REEMBOLSO
              </div>
            </div>
          </div>

          {/* Texto de garantía */}
          <div className="md:w-2/3 text-center md:text-left flex flex-col items-center md:items-start">
            <span className="font-mono text-[10px] tracking-[0.4em] text-[#8B3A18] uppercase font-bold mb-3">Comunidad Pormucha</span>
            <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] leading-tight mb-4">
              Garantía Pormucha
            </h2>
            <p className="text-lg md:text-xl text-gray-500 font-light italic mb-6">
              "Pormuchos momentos compartidos"
            </p>
            <p className="text-gray-700 font-light leading-relaxed mb-10 md:text-lg max-w-xl">
              Únete a nuestros clientes frecuentes. Si es tu primera vez probando Pormucha y no fue lo que esperabas, <strong className="font-bold text-[#8B3A18]">te damos un reembolso total.</strong>
            </p>

            <ul className="space-y-4 text-left w-full max-w-md">
              <li className="flex items-start gap-4">
                <CheckCircle2 className="text-[#7D8B28] mt-0.5 flex-shrink-0" size={20} strokeWidth={2.5} />
                <span className="text-gray-800 font-light">Válido en tu primera compra.</span>
              </li>
              <li className="flex items-start gap-4">
                <CheckCircle2 className="text-[#7D8B28] mt-0.5 flex-shrink-0" size={20} strokeWidth={2.5} />
                <span className="text-gray-800 font-light">Máximo una garantía por cliente registrado.</span>
              </li>
              <li className="flex items-start gap-4">
                <CheckCircle2 className="text-[#7D8B28] mt-0.5 flex-shrink-0" size={20} strokeWidth={2.5} />
                <span className="text-gray-800 font-light">Aplica únicamente en el Pack de 6 (Degustación).</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="bg-white py-24 px-6 border-t border-[#8B3A18]/10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-16 md:flex md:justify-between md:items-end border-b pb-8">
            <div>
              <span className="font-mono text-[10px] tracking-[0.4em] text-[#8B3A18] uppercase font-bold">Resuelve tus dudas</span>
              <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] mt-4">
                Sobre tu Orden
              </h2>
            </div>
            <div className="mt-6 md:mt-0 text-[#8B3A18]">
              <Info size={40} strokeWidth={1} />
            </div>
          </div>

          <div className="space-y-6">
            <FAQItem 
              question="¿Puedo elegír los sabores de mi caja?"
              answer="¡Claro que sí! Nuestros packs son 100% personalizables. Solo haz clic en la opción de tu pack preferido y arma tu combinación ideal (Piña, Jamaica, Té Verde o Té Negro) antes de agregarlo en tu carrito."
            />
            <FAQItem 
              question="¿A dónde hacen envíos?"
              answer="Enviamos a toda la República y podrás seleccionar en la pantalla de pago qué paquetería te conviene más (DHL, Redpack, FedEx, etc.) gracias a la red logística de Skydropx."
            />
            <FAQItem 
              question="¿Tengo que refrigerar mis bebidas al llegar?"
              answer="Sí. Al ser una bebida viva y natural, es muy importante que en cuanto las recibas en la puerta de tu casa las metas a refrigeración para detener la fermentación y disfrutarlas bien frías."
            />
            <FAQItem 
              question="¿Cómo funciona la garantía de satisfacción?"
              answer="La garantía de devolución aplica únicamente una vez por cliente."
            />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}