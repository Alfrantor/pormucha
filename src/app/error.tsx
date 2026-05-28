"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Puedes conectar aquí un servicio de monitoreo como Sentry
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F5F2EB] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-[#8B3A18] font-mono font-bold tracking-widest uppercase text-sm mb-4">
        Algo salió mal
      </p>
      <h1 className="font-serif text-5xl md:text-7xl text-[#1A1A1A] mb-6">
        Error inesperado
      </h1>
      <p className="text-gray-500 text-lg max-w-md mb-10">
        Ocurrió un problema al cargar esta página. Puedes intentar de nuevo o
        regresar a la tienda.
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <button
          onClick={reset}
          className="inline-block bg-[#8B3A18] text-white px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform shadow-lg"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/"
          className="inline-block bg-[#1A1A1A] text-[#EBDAAB] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform shadow-lg"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
