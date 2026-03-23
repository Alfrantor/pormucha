import Navbar from "@/components/Navbar";
import { Leaf, Info, RefreshCw, HandHeart } from "lucide-react";
import Image from "next/image";
import FAQItem from "@/components/FAQItem";
import Footer from "@/components/Footer";
import { db } from "@/lib/db";
import SubscribeButton from "@/components/SubscribeButton"; // Ajusta la ruta si lo guardaste en otro lado

export default async function SuscripcionesPage() {
    const plans = await db.plan.findMany({
        where: { isActive: true },
        include: { product: true },
        orderBy: { price: 'asc' } // El más caro al final
    });

    const gridConfig =
        plans.length === 1 ? "max-w-md mx-auto" :
            plans.length === 2 ? "grid grid-cols-1 lg:grid-cols-2 max-w-5xl mx-auto gap-10" :
                plans.length === 3 ? "grid grid-cols-1 lg:grid-cols-3 max-w-7xl mx-auto gap-8" :
                    plans.length === 4 ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 max-w-[1400px] mx-auto gap-6" :
                        "flex flex-wrap justify-center gap-6 max-w-[1600px] mx-auto";

    return (
        <main className="min-h-screen bg-[#F5F2EB] selection:bg-[#8B3A28] selection:text-white font-sans">
            <div className="absolute top-0 w-full z-50">
                <Navbar />
            </div>

            {/* HERO SECTION */}
            <section className="relative h-[80vh] w-full overflow-hidden text-[#F5F2EB]">
                <div className="absolute inset-0 z-0 bg-black">
                    <div
                        className="w-full h-full bg-cover bg-center opacity-60 scale-105"
                        style={{ backgroundImage: `url('/hero-bg.JPG')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#F5F2EB]" />
                </div>

                <div className="relative z-10 w-full h-full flex flex-col justify-center items-center px-6 text-center">
                    <h1 className="font-serif text-[3.5rem] md:text-[6rem] leading-[0.9] tracking-tight text-[#EBDAAB] mb-6">
                        Suscripciones <br />
                        <span className="font-light text-[2.5rem] md:text-[4.5rem]">
                            Vitalidad en automático
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl font-roboto leading-relaxed text-[#D6D8CB] max-w-2xl">
                        Asegura tu dósis de probióticos sin preocuparte de volver a pedir.
                        Tu kombucha favorita, entregada mes con mes.
                    </p>
                </div>
            </section>

            {/* BENEFICIOS SECTION */}
            <section className="bg-white py-24 px-6 border-b border-[#8B3A18]/10">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="font-mono text-[10px] tracking-[0.4em] text-[#8B3A18] uppercase font-bold">¿Por qué de forma regular?</span>
                        <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] mt-6 leading-tight">
                            El hábito de la fermentación
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="flex flex-col items-center text-center group">
                            <div className="mb-6 p-4 rounded-full bg-[#EAE7DD] text-[#8B3A18] group-hover:scale-110 transition-transform">
                                <RefreshCw size={32} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-sans text-xl tracking-[0.2em] uppercase mb-4 font-bold text-[#1A1A1A]">
                                EN AUTOMÁTICO
                            </h3>
                            <p className="text-gray-600 font-light leading-relaxed">
                                Nosotros nos acordamos por ti. Recibe tu caja cada mes exacto sin hacer un solo clic extra.
                            </p>
                        </div>
                        <div className="flex flex-col items-center text-center group">
                            <div className="mb-6 p-4 rounded-full bg-[#EAE7DD] text-[#7D8B28] group-hover:scale-110 transition-transform">
                                <Leaf size={32} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-sans text-xl tracking-[0.2em] uppercase mb-4 font-bold text-[#1A1A1A]">
                                RESULTADOS REALES
                            </h3>
                            <p className="text-gray-600 font-light leading-relaxed">
                                El consumo constante de kombucha es lo que realmente fortalece tu microbiota a largo plazo.
                            </p>
                        </div>
                        <div className="flex flex-col items-center text-center group">
                            <div className="mb-6 p-4 rounded-full bg-[#EAE7DD] text-[#E6B800] group-hover:scale-110 transition-transform">
                                <HandHeart size={32} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-sans text-xl tracking-[0.2em] uppercase mb-4 font-bold text-[#1A1A1A]">
                                PRECIO ESPECIAL
                            </h3>
                            <p className="text-gray-600 font-light leading-relaxed">
                                Los miembros de la suscripción obtienen el mejor costo por botella y acceso prioritario a ediciones limitadas.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/*================ BENEFICIOS CLUB PORMUCHA ================*/}
            <section className="bg-[#F5F2EB] py-24 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#8B3A18]/5 via-[#F5F2EB]/0 to-transparent pointer-events-none" />

                <div className="max-w-5xl mx-auto relative z-10">
                    <div className="text-center mb-16">
                        <span className="font-mono text-[10px] md:text-xs tracking-[0.4em] text-[#8B3A18] uppercase font-bold mb-4 block">
                            Tu inversión a largo plazo
                        </span>
                        <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#1A1A1A]">
                            Beneficios de pertenecer al <br /> <span className="text-[#8B3A18] italic mt-2 inline-block">Club Pormucha</span>
                        </h2>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-stretch justify-center">

                        {/* COMPRA ÚNICA CARD */}
                        <div className="w-full md:w-[45%] bg-white rounded-[2rem] p-8 md:p-10 border border-gray-100 shadow-sm opacity-90 relative flex flex-col justify-between mt-0 md:mt-8 mb-0 md:mb-8 transition-all hover:opacity-100">
                            <div>
                                <h3 className="text-xl font-bold font-sans text-gray-700 uppercase tracking-widest text-center mb-10 pb-6 border-b border-gray-200">
                                    Compra Única
                                </h3>
                                <ul className="space-y-6 text-gray-500 font-normal text-base md:text-lg">
                                    <li className="flex items-center gap-4 text-gray-700">
                                        <span className="text-green-500 text-xl font-bold w-6 text-center">✔</span> Descuento por volumen
                                    </li>
                                    <li className="flex items-center gap-4">
                                        <span className="text-red-400 text-xl font-bold w-6 text-center">✕</span> 10% Descuento extra
                                    </li>
                                    <li className="flex items-center gap-4">
                                        <span className="text-red-400 text-xl font-bold w-6 text-center">✕</span> Sabores exclusivos
                                    </li>
                                    <li className="flex items-center gap-4">
                                        <span className="text-red-400 text-xl font-bold w-6 text-center">✕</span> Reposición automática
                                    </li>
                                    <li className="flex items-center gap-4 text-gray-400">
                                        <span className="text-gray-300 text-xl font-bold w-6 text-center"></span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* CLUB PORMUCHA VIP CARD */}
                        <div className="w-full md:w-[55%] rounded-[2.2rem] p-1 relative shadow-2xl overflow-hidden transform md:scale-110 z-10 group">
                            {/* Brillo dinámico en el borde */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#8B3A18] via-[#e2c17b] to-[#8B3A18] opacity-70 group-hover:opacity-100 blur-md transition-opacity duration-1000 animate-pulse" />

                            <div className="bg-[#1A1A1A] relative h-full rounded-[2rem] p-8 md:p-12 flex flex-col justify-between border border-[#8B3A18]/50">
                                <div className="absolute top-0 right-0 p-5 mt-2 mr-2">
                                    <span className="bg-[#8B3A18] text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full shadow-lg">
                                        Mejor Valor
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-3xl md:text-4xl font-serif text-[#EBDAAB] text-center mb-10 pb-6 border-b border-white/10 leading-tight">
                                        Membresía <br /><span className="italic font-light">Club Pormucha</span>
                                    </h3>
                                    <ul className="space-y-7 text-white font-light text-base md:text-lg">
                                        <li className="flex items-center gap-4">
                                            <span className="bg-[#EBDAAB] text-[#1A1A1A] rounded-full min-w-[28px] h-7 flex items-center justify-center text-sm font-bold shadow-[0_0_15px_rgba(235,218,171,0.4)]">✔</span>
                                            Descuento por volumen
                                        </li>
                                        <li className="flex items-center gap-4">
                                            <span className="bg-[#EBDAAB] text-[#1A1A1A] rounded-full min-w-[28px] h-7 flex items-center justify-center text-sm font-bold shadow-[0_0_15px_rgba(235,218,171,0.4)] relative">
                                                ✔
                                                <span className="absolute inset-0 bg-[#EBDAAB] blur-sm rounded-full opacity-50 animate-ping"></span>
                                            </span>
                                            <span className="font-bold text-[#EBDAAB]">10% Descuento extra SIEMPRE</span>
                                        </li>
                                        <li className="flex items-center gap-4">
                                            <span className="bg-[#EBDAAB] text-[#1A1A1A] rounded-full min-w-[28px] h-7 flex items-center justify-center text-sm font-bold shadow-[0_0_15px_rgba(235,218,171,0.4)]">✔</span>
                                            Sabores de temporada exclusivos
                                        </li>
                                        <li className="flex items-center gap-4">
                                            <span className="bg-[#EBDAAB] text-[#1A1A1A] rounded-full min-w-[28px] h-7 flex items-center justify-center text-sm font-bold shadow-[0_0_15px_rgba(235,218,171,0.4)]">✔</span>
                                            Reposición totalmente automática
                                        </li>
                                        <li className="flex items-center gap-4">
                                            <span className="bg-[#EBDAAB] text-[#1A1A1A] rounded-full min-w-[28px] h-7 flex items-center justify-center text-sm font-bold shadow-[0_0_15px_rgba(235,218,171,0.4)]">✔</span>
                                            Cancelación libre de 1-clic
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* PLANES SECTION */}
            <section className="bg-[#EAE7DD] py-24 px-6 relative overflow-hidden">
                {/* DECORACIÓN FONDO */}
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#8B3A18] rounded-full blur-[150px] opacity-10" />

                <div className="w-full px-2 lg:px-6 relative z-10">
                    <div className={gridConfig}>

                        {plans.length > 0 ? plans.map((plan, index) => {
                            // "Efecto Ricitos de Oro": Destacamos visualmente el plan de en medio
                            const isFeatured = plans.length === 2 ? index === 1 :
                                plans.length >= 3 ? index === Math.floor((plans.length - 1) / 2) : false;

                            // Imagen de fondo (puedes parametrizarlo en la DB en un futuro)
                            const bgImageURL = plan.name.includes("24") || plan.name.toLowerCase().includes("quincenal")
                                ? "/pack-24.JPG"
                                : "/pack-12.JPG";

                            return (
                                <div key={plan.id} className={`${isFeatured ? "bg-[#1A1A1A] shadow-2xl border border-[#8B3A18]/30" : "bg-white shadow-xl"} rounded-2xl overflow-hidden group hover:-translate-y-2 transition-transform duration-500 flex flex-col ${plans.length >= 5 ? "w-full sm:w-[320px]" : ""}`}>

                                    {isFeatured && (
                                        <div className="bg-[#8B3A18] text-white text-center py-2 text-xs font-bold tracking-[0.3em] uppercase">
                                            Más Popular
                                        </div>
                                    )}

                                    <div className="relative h-64 overflow-hidden shrink-0">
                                        <div
                                            className={`absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-1000 ${isFeatured ? "brightness-75 grayscale-[20%]" : ""}`}
                                            style={{ backgroundImage: `url('${bgImageURL}')` }}
                                        />
                                        <div className={`absolute inset-0 bg-gradient-to-t ${isFeatured ? "from-black/80" : "from-black/60"} to-transparent`} />
                                        <h3 className={`absolute bottom-6 left-8 font-serif text-4xl ${isFeatured ? "text-[#EBDAAB]" : "text-white"}`}>
                                            {plan.name}
                                        </h3>
                                    </div>
                                    <div className="p-8 flex-grow flex flex-col">
                                        <div className={`flex items-end gap-2 mb-6 ${isFeatured ? "text-white" : ""}`}>
                                            <span className={`text-4xl font-bold font-sans ${isFeatured ? "" : "text-[#1A1A1A]"}`}>
                                                ${Number(plan.price).toLocaleString('es-MX')}
                                            </span>
                                            <span className={`${isFeatured ? "text-white/50" : "text-gray-500"} font-light mb-1 uppercase tracking-widest text-sm`}>
                                                MXN / {plan.intervalCount > 1 ? `${plan.intervalCount} ` : ""}{plan.interval === 'week' ? 'Semana(s)' : 'Mes(es)'}
                                            </span>
                                        </div>

                                        {(plan.description || plan.product) && (
                                            <p className={`mb-6 italic text-sm ${isFeatured ? "text-gray-400" : "text-gray-500"}`}>
                                                {plan.description || `Plan basado en entrega de ${plan.product?.name}`}
                                            </p>
                                        )}

                                        <ul className={`space-y-4 mb-8 font-light flex-grow ${isFeatured ? "text-gray-300" : "text-gray-700"}`}>
                                            {plan.product && (
                                                <li className="flex items-center gap-3">
                                                    <span className={isFeatured ? "text-[#EBDAAB]" : "text-[#8B3A18]"}>✔</span>
                                                    {plan.product.quantity} Botellas de kombucha fresca
                                                </li>
                                            )}
                                            <li className="flex items-center gap-3">
                                                <span className={isFeatured ? "text-[#EBDAAB]" : "text-[#8B3A18]"}>✔</span>
                                                Sabores 100% personalizables
                                            </li>
                                            <li className="flex items-center gap-3">
                                                <span className={isFeatured ? "text-[#EBDAAB]" : "text-[#8B3A18]"}>✔</span>
                                                Cobertura nacional con envío seguro
                                            </li>
                                        </ul>
                                        <SubscribeButton planId={plan.id} isFeatured={isFeatured} />
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="col-span-full py-16 text-center text-gray-500 font-light flex flex-col items-center">
                                <span className="text-4xl mb-4">✨</span>
                                <p className="text-2xl text-gray-700 font-serif">Nuevos planes de suscripción próximamente...</p>
                                <p className="text-sm mt-3 opacity-70">Estamos afinando los últimos detalles de la fermentación para ti.</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* FAQ SECTION */}
            <section className="bg-white py-24 px-6 border-b border-[#8B3A18]/10">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-16 md:flex md:justify-between md:items-end border-b pb-8">
                        <div>
                            <span className="font-mono text-[10px] tracking-[0.4em] text-[#8B3A18] uppercase font-bold">Resuelve tus dudas</span>
                            <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] mt-4">
                                Preguntas Frecuentes
                            </h2>
                        </div>
                        <div className="mt-6 md:mt-0 text-[#8B3A18]">
                            <Info size={40} strokeWidth={1} />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <FAQItem
                            question="¿Puedo cancelar mi suscripción cuando quiera?"
                            answer="Sí, totalmente. Nuestras suscripciones no tienen plazos forzosos. Puedes cancelar, pausar o saltar un mes en cualquier momento accediendo a tu cuenta, hasta 48 horas antes de tu siguiente fecha de envío programada."
                        />
                        <FAQItem
                            question="¿Cómo elijo qué sabores quiero cada mes?"
                            answer="Al momento de suscribirte seleccionarás tu mezcla inicial. Unos días antes del siguiente envío, te mandaremos un recordatorio; si no haces cambios, te enviaremos la misma selección. ¡Puedes cambiar tus sabores cuantas veces quieras desde tu perfil!"
                        />
                        <FAQItem
                            question="¿Cuándo se realiza el cobro de mi tarjeta?"
                            answer="El cobro inicial se realiza justo al inscribirte. Los cobros posteriores se efectuarán automáticamente de forma mensual o quincenal (dependiendo de tu plan) el mismo día natural que tu primera compra. Usamos la tecnología segura de Stripe."
                        />
                        <FAQItem
                            question="¿Hay envíos a todo México?"
                            answer="Así es. Colaboramos con la red de Skydropx para asegurar que tu lote fresco y en perfectas condiciones llegue hasta la puerta de tu hogar, sin importar en qué estado de la república te encuentres."
                        />
                    </div>

                </div>
            </section>

            {/*================ CTA ENTRY KIT ================*/}
            <section className="bg-[#1A1A1A] py-32 px-6 text-center text-[#F5F2EB] relative overflow-hidden border-t-4 border-[#8B3A18]">
                {/* Detalle visual sutil de fondo */}
                <div className="absolute -left-20 -top-20 w-96 h-96 bg-[#8B3A18]/20 blur-[120px] rounded-full pointer-events-none" />

                <div className="max-w-3xl mx-auto relative z-10 flex flex-col items-center">
                    <span className="font-mono text-sm tracking-[0.4em] uppercase font-bold text-[#EBDAAB] mb-4 block drop-shadow-md">
                        Una pequeña probada
                    </span>
                    <h2 className="font-serif text-5xl md:text-7xl mb-8 leading-tight drop-shadow-lg text-white">
                        ¿Aún no estás decidido?
                    </h2>
                    <p className="text-xl md:text-2xl font-light mb-12 drop-shadow-md text-gray-300">
                        Prueba nuestro <span className="text-[#EBDAAB] italic font-serif">Kit de Introducción</span> y déjanos convencerte con cada burbuja de nuestra fermentación real.
                    </p>

                    <a href="/tienda" className="inline-block bg-[#8B3A18] text-[#EAE7DD] px-12 py-5 rounded-md text-xl font-bold tracking-widest hover:bg-[#6c2d13] hover:scale-105 transition-all shadow-xl hover:shadow-2xl uppercase border border-white/10">
                        Ver Paquetes de Tienda
                    </a>
                </div>
            </section>

            <Footer />

        </main>
    );
}
