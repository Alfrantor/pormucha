export default function ThanksPage() {
    return (
        <div className="min-h-screen bg-[#fdfaf5] flex flex-col items-center justify-center text-center p-6">
            <h1 className="text-4xl font-bold text-[#2d4a3e] mb-4">¡Registro Exitoso!</h1>
            <p className="text-lg text-[#4a5d4e] max-w-md mb-8">
                Gracias por tu interés en **Pormucha**. Te avisaremos en cuanto estemos listos para el lanzamiento oficial.
            </p>
            <a href="/" className="bg-[#2d4a3e] text-white px-8 py-3 rounded-full font-semibold">
                Volver al inicio
            </a>
        </div>
    );
}