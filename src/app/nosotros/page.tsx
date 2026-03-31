import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FAQItem from "@/components/FAQItem";
import { Leaf, Info, RefreshCw, HandHeart, Sparkles, Send } from "lucide-react";

export const metadata = {
    title: 'Nosotros | Pormucha Kombucha',
    description: 'Conoce nuestra historia y por qué cuidamos tu centro mediante fermentación real y procesos naturales.',
};

export default function NosotrosPage() {
    return (
        <main className="min-h-screen bg-[#F5F2EB] font-sans selection:bg-[#8B3A28] selection:text-white flex flex-col">
            {/*================ NAVBAR ESTÁTICO (ABSOLUTO AL INICIO) ================*/}
            <div className="absolute top-0 w-full z-50">
                <Navbar />
            </div>

            {/*================ 1. HERO SECTION ================*/}
            <section className="relative h-[80vh] min-h-[600px] w-full flex items-center justify-center overflow-hidden">
                {/* FONDO IMAGEN */}
                <div className="absolute inset-0 z-0 bg-black">
                    <div
                        className="w-full h-full bg-cover bg-center bg-no-repeat opacity-60 scale-105"
                        style={{ backgroundImage: `url('/hero-nosotros.jpg')` }}
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#F5F2EB]" />
                </div>

                <div className="relative z-10 text-center px-6 mt-20 max-w-4xl">
                    <span className="font-mono text-xs md:text-sm tracking-[0.4em] text-[#EBDAAB] uppercase font-bold mb-4 block drop-shadow-md">
                        Nuestra Filosofía
                    </span>
                    <h1 className="font-serif text-6xl md:text-8xl lg:text-[9rem] text-white leading-[0.85] tracking-tighter mb-6 drop-shadow-xl">
                        N<span className="italic font-light">o</span>sotros
                    </h1>
                    <p className="font-roboto text-xl md:text-2xl font-light text-[#F5F2EB] max-w-2xl mx-auto drop-shadow-md">
                        Fermentación viva, respeto por el tiempo y el compromiso de cuidar tu centro.
                    </p>
                </div>
            </section>

            {/*================ 2. BREVE DESCRIPCIÓN DE PORMUCHA ================*/}
            <section className="py-24 px-6 bg-[#F5F2EB] text-[#1A1A1A] relative z-20 -mt-10 rounded-t-3xl">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-8 leading-tight text-[#8B3A18]">
                        ¿Qué es Pormucha?
                    </h2>
                    <p className="text-xl md:text-2xl font-light leading-relaxed text-gray-700">
                        Pormucha no es solo una kombucha.

                        Es una bebida hecha con fermentación real, tiempo y atención a cada detalle. No aceleramos procesos ni usamos atajos: dejamos que cada lote desarrolle su sabor de forma natural.

                        Nació en casa y hoy crece sin perder su esencia.

                        Te gusta por el sabor…
                        te quedas por cómo te hace sentir.
                    </p>
                </div>
            </section>

            {/*================ 3. IDENTIDAD DE LA MARCA ================*/}
            <section className="py-20 px-6 bg-white border-y border-[#8B3A18]/10">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#8B3A18] font-bold">Nuestra esencia</span>
                        <h2 className="font-serif text-4xl mt-4">La Diferencia Pormucha</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 rounded-full bg-[#F5F2EB] flex items-center justify-center text-[#8B3A18] mb-6">
                                <Leaf size={32} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-serif text-2xl mb-3">100% Natural</h3>
                            <p className="font-light text-gray-600 leading-relaxed">
                                Sin conservadores, sin azúcares refinadas ocultas, ni ingredientes que no puedas pronunciar.
                            </p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 rounded-full bg-[#F5F2EB] flex items-center justify-center text-[#8B3A18] mb-6">
                                <RefreshCw size={32} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-serif text-2xl mb-3">Cultivos Vivos</h3>
                            <p className="font-light text-gray-600 leading-relaxed">
                                Respetamos los tiempos de fermentación. Nuestra bebida no se pasteuriza, para asegurar que los probióticos lleguen vivos a ti.
                            </p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 rounded-full bg-[#F5F2EB] flex items-center justify-center text-[#8B3A18] mb-6">
                                <HandHeart size={32} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-serif text-2xl mb-3">Cuidamos tu Centro</h3>
                            <p className="font-light text-gray-600 leading-relaxed">
                                Creemos firmemente que una digestión saludable es la clave del bienestar emocional e inmunológico.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/*================ 4. HISTORIA ================*/}
            <section className="py-24 px-6 bg-[#1A1A1A] text-[#F5F2EB]">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-16">
                    <div className="w-full md:w-1/2">
                        <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl relative bg-gray-800">
                            {/* Usamos hero-bg para simular historia temporal, luego pueden cambiarla */}
                            <div className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: "url('/hero-bg.JPG')" }}></div>
                        </div>
                    </div>
                    <div className="w-full md:w-1/2 flex flex-col items-start text-left">
                        <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#EBDAAB] font-bold mb-4">¿Cómo empezó todo?</span>
                        <h2 className="font-serif text-5xl md:text-6xl mb-6">El Origen</h2>
                        <div className="space-y-6 font-light text-lg md:text-xl text-gray-300 leading-relaxed">
                            <p>
                                Todo empezó en casa, en la cocina de mi mamá.
                                Ella buscaba algo diferente. Una bebida natural, refrescante y sin los excesos de azúcar que encontramos todos los días. Así comenzó a preparar sus primeros lotes de kombucha, de manera casera, con paciencia y mucho cuidado.
                            </p>
                            <p>
                                Cada persona que llegaba a la casa la probaba. Familia, amigos, conocidos… y siempre pasaba lo mismo: les sorprendía el sabor, cómo se sentían después de tomarla, y casi sin excepción le decían: <span className="text-white font-medium">“Esto lo tienes que vender.”</span>. Lo que comenzó como algo hecho con amor para compartir, poco a poco se fue convirtiendo en algo más grande. Fuimos perfeccionando cada detalle, entendiendo el proceso, respetando la fermentación y manteniendo siempre la esencia de lo que empezó en casa.
                            </p>
                            <p>
                                Hoy, esa misma kombucha sigue naciendo del mismo lugar: la intención de compartir algo que se siente bien.
                                Porque al final, esto nunca fue solo una bebida…
                                es para muchos momentos compartidos.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/*================ 5. ¿QUÉ ES LA KOMBUCHA? ================*/}
            <section className="py-24 px-6 bg-[#F5F2EB] text-[#1A1A1A]">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="flex justify-center mb-6 text-[#8B3A18]">
                        <Sparkles size={40} className="animate-pulse" />
                    </div>
                    <h2 className="font-serif text-5xl md:text-6xl mb-8">¿Qué es la Kombucha?</h2>
                    <p className="text-xl font-light leading-relaxed text-gray-700 mb-8">
                        La kombucha es un té fermentado milenario (originario de Asia) preparado a partir de té endulzado cultivado con una colonia simbiótica de bacterias y levaduras (SCOBY).
                    </p>
                    <p className="text-xl font-light leading-relaxed text-gray-700">
                        Durante su proceso de fermentación, el SCOBY consume la mayor parte del azúcar, transformándola en ácidos orgánicos beneficiosos, antioxidantes, enzimas y burbujas naturales, dotándola de sus populares poderes reconstituyentes y protectores de la flora intestinal.
                    </p>
                </div>
            </section>

            {/*================ 6. FAQ ================*/}
            <section className="py-24 px-6 bg-white border-y border-[#8B3A18]/10">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="font-serif text-4xl text-[#1A1A1A]">Preguntas Frecuentes</h2>
                    </div>
                    <div className="border border-[#8B3A18]/20 rounded-xl bg-[#F5F2EB]/50 overflow-hidden">
                        <FAQItem
                            question="¿Por qué noto pequeños depósitos turbios al fondo de la botella?"
                            answer="¡No te asustes, esa es la prueba de vida! Son pequeñas partículas de fibra y cultivos que continúan multiplicándose en la botella porque nuestro producto NO está pasteurizado. Sólo gira tu botella con suavidad para mezclarlos."
                        />
                        <FAQItem
                            question="¿Contiene alcohol?"
                            answer="La kombucha tiene rastros mínimos de alcohol (por lo general menos del 0.5%) que se producen de manera natural durante cualquier tipo de fermentación. Podríamos decir que es comparable a los rastros que encontrarías en una fruta madura."
                        />
                        <FAQItem
                            question="¿Cuánta kombucha debo tomar al día?"
                            answer="Si eres principiante y nunca has tomado probióticos, te recomendamos empezar con media botella al día, escuchando cómo responde tu estómago, e ir incrementando paulatinamente hasta una o más botellas enteras al día."
                        />
                        <FAQItem
                            question="¿Tengo que mantenerla refrigerada?"
                            answer="¡SÍ! Nuestra kombucha está viva. Si la dejas mucho tiempo sin refrigerar los cultivos seguirán fermentando el azúcar provocando una bebida con sabor ácido/avinagrado y mucha presión de gas."
                        />
                    </div>
                </div>
            </section>

            {/*================ 7. CTA BUY ================*/}
            <section className="relative py-40 px-6 text-[#F5F2EB] text-center bg-black overflow-hidden">
                {/* FONDO IMAGEN */}
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 scale-105 transition-transform duration-1000 hover:scale-100"
                    style={{ backgroundImage: `url('/section-call-action-buy.jpg')` }}
                />
                {/* Gradient Overlay adicional para asegurar lectura perfecta */}
                <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#1A1A1A]/90 via-black/50 to-[#1A1A1A]/90 pointer-events-none" />

                <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
                    <span className="font-mono text-sm tracking-[0.4em] uppercase font-bold text-[#EBDAAB] mb-4 block drop-shadow-md">Haz la prueba</span>
                    <h2 className="font-serif text-5xl md:text-7xl mb-8 leading-tight drop-shadow-lg text-white">
                        ¿Estás listo para darle a tu cuerpo lo que necesita?
                    </h2>
                    <p className="text-xl md:text-2xl font-light opacity-90 mb-12 drop-shadow-md text-gray-200 max-w-2xl">
                        Si todavía dudas, empieza a cuidar tu centro con nuestro "Kit de Introducción" directo a la puerta de tu casa.
                    </p>

                    <a href="/tienda" className="inline-block bg-[#EBDAAB] text-[#1A1A1A] px-12 py-5 rounded-md text-xl font-bold tracking-widest hover:bg-white hover:scale-105 transition-all shadow-xl hover:shadow-2xl uppercase border border-white/50">
                        Ir a la Tienda
                    </a>
                </div>
            </section>

            {/*================ 8. CONTACTO BREVE ================*/}
            <section className="py-24 px-6 bg-[#1A1A1A] text-center">
                <div className="max-w-2xl mx-auto flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#EBDAAB] mb-6">
                        <Send size={28} />
                    </div>
                    <h2 className="font-serif text-4xl md:text-5xl text-white mb-6">¿Quieres charlar más?</h2>
                    <p className="text-lg text-gray-400 font-light mb-10 leading-relaxed">
                        Si tienes dudas especiales, te interesa convertirte en un distribuidor, o simplemente quieres dejarnos algún comentario, envíanos un DM en Instagram o acércate a nuestra página de contacto.
                    </p>
                    <div className="flex gap-6 justify-center">
                        <a href="https://instagram.com/pormuchakombucha" target="_blank" className="text-[#EBDAAB] uppercase font-mono tracking-widest text-sm hover:text-white transition-colors border-b border-[#EBDAAB] pb-1">
                            @pormuchakombucha
                        </a>
                        <a href="/contacto" className="text-[#EBDAAB] uppercase font-mono tracking-widest text-sm hover:text-white transition-colors border-b border-[#EBDAAB] pb-1">
                            Formulario Web
                        </a>
                    </div>
                </div>
            </section>

            {/*================ FOOTER GLOBAL ================*/}
            <Footer />

        </main>
    );
}
