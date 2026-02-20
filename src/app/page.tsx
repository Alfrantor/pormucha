import { db } from "@/lib/db";
import PackSelector from "@/components/PackSelector";
import Navbar from "@/components/Navbar";
import { Leaf, Waves, Sun } from "lucide-react";

export default async function HomePage() {
  const packs = await db.product.findMany({
    where: { isArchived: false },
    orderBy: { price: 'asc' }
  });

  return (
    <main className="min-h-screen bg-[#F5F2EB] selection:bg-[#8B3A28] selection:text-white font-sans">

      <div className="absolute top-0 w-full z-50">
        <Navbar />
      </div>

      {/* ========================================= */}
      {/* HERO SECTION */}
      {/* ========================================= */}
      <section className="relative h-screen w-full overflow-hidden text-[#F5F2EB]">

        {/* IMAGEN DE FONDO */}
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-[url('/hero-bg.jpg')] bg-cover bg-center brightness-[0.85]" />
        </div>

        {/* CONTENIDO PRINCIPAL */}
        {/* CAMBIO: Quitamos 'max-w-[1400px] mx-auto' y ajustamos el padding (lg:px-20) para que esté a la izquierda */}
        <div className="relative z-10 w-full h-full flex flex-col justify-between px-6 md:px-12 lg:px-20 py-12 md:py-24">

          {/* BLOQUE SUPERIOR (IZQUIERDA): Título + Texto */}
          <div className="flex flex-col justify-center h-full max-w-4xl items-start md:ml-64 transition-all">
            {/* TÍTULO */}
            <div className="text-left mb-8">
              {/* CONTROL DE TAMAÑO DE "PORMUCHA":
                  - text-[4rem]  -> Tamaño en Celular (puedes poner 3rem, 5rem, etc.)
                  - md:text-[12rem] -> Tamaño en PC (puedes poner 8rem, 10rem, 12rem, 15rem...)
              */}
              <h1 className="font-serif text-[4rem] md:text-[5rem] leading-[0.85] tracking-tight text-[#EBDAAB]">
                P<span className="italic font-light">o</span>rmucha <br />

                {/* CONTROL DE TAMAÑO DE "KOMBUCHA":
                    - text-[3rem]  -> Tamaño en Celular
                    - md:text-[9rem] -> Tamaño en PC
                */}
                <span className="font-light text-[3rem] md:text-[3rem]">
                  K<span className="italic font-light">o</span>mbucha
                </span>
              </h1>
            </div>

            {/* TEXTO */}
            <div className="text-left pl-2">
              <p className="text-xl md:text-[2rem] font-roboto leading-relaxed text-[#909186] max-w-3xl">
                Bebida fermentada naturalmente con probióticos vivos, ligera y refrescante.
              </p>
            </div>
          </div>

          {/* BLOQUE INFERIOR (DERECHA): Botón + Datos */}
          {/* Este bloque usa 'ml-auto' para forzarse a la derecha, creando la diagonal visual */}
          <div className="flex flex-col items-center md:items-end gap-10 ml-auto">
            {/* Aumenté el gap de 8 a 10 para dar más aire */}

            {/* DATOS TÉCNICOS - Texto más grande */}
            {/* CAMBIO: De text-xs a text-sm md:text-base (más grande en PC) */}
            <div className="hidden md:block font-mono text-[1rem] tracking-[0.2em] space-y-3 text-[#909186] uppercase text-right font-bold">
              <div className="flex justify-end gap-12 border-b border-white/20 pb-3 mb-3">
                <span>100% Fresco</span>
                <span>&</span>
                <span>Natural</span>
              </div>
              <div className="flex justify-end gap-12">
                <span>Vida en Equilibrio</span>
                <span>MX</span>
              </div>
              <p className="opacity-80 pt-2 tracking-[0.15em]">Pormuchos momentos compartidos</p>
            </div>

            {/* BOTÓN - Más grande */}
            {/* CAMBIOS: 
                - px-10 py-5  -> px-14 py-6 (Más relleno)
                - text-lg     -> text-xl md:text-2xl (Texto más grande)
            */}
            <a href="#packs" className="bg-[#8B3A18] text-[#BBBFA8] px-14 py-6 rounded-lg text-[2rem] md:text-2xl font-sans font-bold tracking-widest hover:bg-[#722f20] transition-transform hover:scale-105 shadow-2xl border border-white/10">
              ARMA TU PAQUETE
            </a>
          </div>
        </div>
      </section>
      {/* ========================================= */}
      {/* SECCIÓN 2: FILOSOFÍA CON VIDEOS (ESTILO REELS) */}
      {/* ========================================= */}
      <section className="bg-[#EAE7DD] py-24 px-6 md:px-12 text-[#1A1A1A]">

        {/* ENCABEZADO */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="font-serif text-6xl md:text-7xl">Pormucha<span className="text-sm align-top">®</span></h2>
          <p className="text-xl md:text-2xl font-light tracking-wide text-gray-800">
            Fermentación real. Bienestar cotidiano
          </p>
        </div>

        {/* GRID DE 3 VIDEOS */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">

          {/* VIDEO 1: HECHA CON TIEMPO */}
          <a
            href="https://www.instagram.com/reel/DIt89b9J5vD/?igsh=NWd3ZTRna2trczh1"
            target="_blank"
            className="group flex flex-col text-center"
          >
            {/* Contenedor de Video (Aspecto Cuadrado o Vertical según prefieras) */}
            {/* aspect-[4/5] es el tamaño típico de Instagram (verticalito), aspect-square es cuadrado */}
            <div className="aspect-[4/5] bg-gray-300 overflow-hidden mb-8 relative rounded-lg shadow-lg">
              <video
                src="/reel-1.mp4"       // Tu archivo de video
                autoPlay
                loop
                muted
                playsInline             // Importante para que funcione en iPhone
                className="object-cover w-full h-full transform transition-transform duration-700 group-hover:scale-105"
              />
              {/* Capa oscura al pasar el mouse para efecto elegante */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
            </div>

            <h3 className="font-sans text-xl tracking-[0.2em] uppercase mb-4 font-bold">
              HECHA CON TIEMPO
            </h3>
            <p className="text-gray-600 font-light leading-relaxed px-4">
              Pequeños lotes, procesos reales y respeto por la fermentación.
            </p>
          </a>

          {/* VIDEO 2: VIVA POR DENTRO */}
          <a
            href="https://www.instagram.com/reel/DNloDrzJpvU/?igsh=MW1paHEwZDlmaHMwNw=="
            target="_blank"
            className="group flex flex-col text-center"
          >
            <div className="aspect-[4/5] bg-gray-300 overflow-hidden mb-8 relative rounded-lg shadow-lg">
              <video
                src="/reel-2.mp4"
                autoPlay loop muted playsInline
                className="object-cover w-full h-full transform transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
            </div>

            <h3 className="font-sans text-xl tracking-[0.2em] uppercase mb-4 font-bold">
              VIVA POR DENTRO
            </h3>
            <p className="text-gray-600 font-light leading-relaxed px-4">
              Fermentada naturalmente con cultivos vivos que acompañan tu digestión.
            </p>
          </a>

          {/* VIDEO 3: LIGERA Y REFRESCANTE */}
          <a
            href="https://www.instagram.com/reel/DTLXJWWgCj8/?igsh=MTFjbG5ranllZzV2YQ=="
            target="_blank"
            className="group flex flex-col text-center"
          >
            <div className="aspect-[4/5] bg-gray-300 overflow-hidden mb-8 relative rounded-lg shadow-lg">
              <video
                src="/reel-3.mp4"
                autoPlay loop muted playsInline
                className="object-cover w-full h-full transform transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
            </div>

            <h3 className="font-sans text-xl tracking-[0.2em] uppercase mb-4 font-bold">
              LIGERA Y REFRESCANTE
            </h3>
            <p className="text-gray-600 font-light leading-relaxed px-4">
              Bebida burbujeante, libre de sellos, sin azúcar añadida.
            </p>
          </a>

        </div>
      </section>

      {/* SECCIÓN SABORES */}
      <section className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div className="hidden md:block relative h-[600px] bg-gray-100 rounded-lg overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-[url('/flavors-side.jpg')] bg-cover bg-center" />
          </div>
          <div>
            <h2 className="text-5xl font-serif mb-12 underline decoration-[#8B3A18] decoration-2 underline-offset-8">
              Sabores
            </h2>
            <div className="space-y-12">
              <div className="flex gap-5 group">
                <div className="pt-1 text-[#8B3A18] transition-transform group-hover:scale-110"><Waves size={36} strokeWidth={1.5} /></div>
                <div><h3 className="text-2xl font-serif mb-1 text-gray-900 group-hover:text-[#8B3A18] transition-colors">Jamaica</h3><p className="text-gray-500 font-light text-sm leading-relaxed max-w-sm">Vibrante y refrescante. El sabor floral que amamos con el boost de probióticos.</p></div>
              </div>
              <div className="flex gap-5 group">
                <div className="pt-1 text-[#7D8B28] transition-transform group-hover:scale-110"><Leaf size={36} strokeWidth={1.5} /></div>
                <div><h3 className="text-2xl font-serif mb-1 text-gray-900 group-hover:text-[#7D8B28] transition-colors">Té Verde</h3><p className="text-gray-500 font-light text-sm leading-relaxed max-w-sm">Antioxidantes poderosos en cada sorbo. Suave, refrescante y lleno de beneficios.</p></div>
              </div>
              <div className="flex gap-5 group">
                <div className="pt-1 text-[#E6B800] transition-transform group-hover:scale-110"><Sun size={36} strokeWidth={1.5} /></div>
                <div><h3 className="text-2xl font-serif mb-1 text-gray-900 group-hover:text-[#E6B800] transition-colors">Piña</h3><p className="text-gray-500 font-light text-sm leading-relaxed max-w-sm">Tropical y dulce natural. El sabor del paraíso en una botella fermentada con maestría.</p></div>
              </div>
              <div className="flex gap-5 group">
                <div className="pt-1 text-[#2C2C2C] transition-transform group-hover:scale-110"><Leaf size={36} strokeWidth={1.5} /></div>
                <div><h3 className="text-2xl font-serif mb-1 text-gray-900 group-hover:text-[#2C2C2C] transition-colors">Té Negro</h3><p className="text-gray-500 font-light text-sm leading-relaxed max-w-sm">Intenso y tradicional. Para los que buscan un sabor robusto con toda la potencia.</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN PACKS */}
      <section id="packs" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="font-mono text-sm tracking-[0.3em] text-gray-500 uppercase mb-4">La Tienda</h2>
          <h3 className="font-serif text-4xl md:text-5xl text-[#1A1A1A]">Selecciona tu paquete</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {packs.map((pack) => (
            <PackSelector
              key={pack.id}
              id={pack.id}
              nombre={pack.name}
              capacidad={pack.quantity}
              precio={Number(pack.price)}
            />
          ))}
        </div>
      </section>



      <footer className="bg-[#1A1A1A] text-[#F5F2EB] py-12 text-center border-t border-white/10">
        <h2 className="text-4xl font-serif mb-6">Pormucha.</h2>
        <p className="font-mono text-xs tracking-widest opacity-60">
          © 2026 HECHO EN MÉXICO
        </p>
      </footer>

    </main>
  );
}