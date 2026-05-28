import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F2EB] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-[#8B3A18] font-mono font-bold tracking-widest uppercase text-sm mb-4">
        Error 404
      </p>
      <h1 className="font-serif text-5xl md:text-7xl text-[#1A1A1A] mb-6">
        Página no encontrada
      </h1>
      <p className="text-gray-500 text-lg max-w-md mb-10">
        La página que buscas no existe o fue movida. Regresa a la tienda y
        sigue explorando nuestras kombuchas.
      </p>
      <Link
        href="/"
        className="inline-block bg-[#1A1A1A] text-[#EBDAAB] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform shadow-lg"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
