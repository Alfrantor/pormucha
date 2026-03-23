import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import ManageSubscriptionButton from "@/components/ManageSubscriptionButton";
import { DireccionForm } from "@/components/Perfil/DireccionForm";
import FlavorSelector from "@/components/Perfil/FlavorSelector";
import Link from "next/link";
import { ShoppingBag, CreditCard as CreditCardIcon, RefreshCw } from "lucide-react";

export default async function PerfilPage() {
    const user = await currentUser();
    const { userId } = await auth();

    if (!userId || !user) redirect("/sign-in");

    const userEmail = user.emailAddresses[0].emailAddress;

    const cliente = await db.client.findUnique({
        where: { email: userEmail }
    });

    const subscription = await db.subscription.findFirst({
        where: { client: { email: userEmail }, status: "active" },
        include: { plan: true }
    });

    // 1. Traemos los sabores de la DB
    const rawFlavors = await db.flavor.findMany();

    // 2. Los convertimos a objetos planos para evitar el error de Decimal
    const allFlavors = rawFlavors.map(flavor => ({
        ...flavor,
        price: flavor.price ? Number(flavor.price) : 0,
    }));

    return (
        <div className="max-w-5xl mx-auto p-6 pt-24 min-h-screen bg-[#FDFCF9]">
            {/* 1. Header de Bienvenida */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
                <div>
                    <p className="text-[#8B3A28] font-bold uppercase tracking-widest text-sm mb-2">Panel de Miembro</p>
                    <h1 className="text-4xl font-serif text-gray-900">
                        ¡Hola, <span className="italic">{user.firstName || "Andrés"}</span>! 👋
                    </h1>
                </div>
                <Link
                    href="/tienda"
                    className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full font-bold hover:bg-gray-800 transition shadow-lg"
                >
                    <ShoppingBag size={18} />
                    Ir a la Tienda
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* COLUMNA IZQUIERDA: Suscripción, Sabores y Dirección */}
                <div className="lg:col-span-2 space-y-8">
                    {subscription ? (
                        <div className="bg-white rounded-3xl p-8 border border-green-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <RefreshCw size={120} className="text-green-600" />
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="bg-green-100 text-green-700 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-tighter">
                                        Membresía Activa
                                    </span>
                                </div>

                                <h2 className="text-3xl font-serif text-gray-800 mb-2">
                                    {subscription.plan.name} 🌿
                                </h2>
                                <p className="text-gray-500 mb-8 max-w-md">
                                    Tu próxima caja de bienestar llegará después del <b>{subscription.currentPeriodEnd.toLocaleDateString()}</b>.
                                </p>

                                <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-100">
                                    <ManageSubscriptionButton />
                                    <Link
                                        href="/suscripciones"
                                        className="flex items-center gap-2 border border-[#8B3A28] text-[#8B3A28] px-6 py-2.5 rounded-full font-bold hover:bg-[#8B3A28]/5 transition"
                                    >
                                        <CreditCardIcon size={18} />
                                        Cambiar Plan
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-[#F4EFEA] rounded-3xl p-10 text-center border-2 border-dashed border-[#D1C7BD]">
                            <h2 className="text-2xl font-serif text-[#8B3A28] mb-4">Aún no eres parte del Club</h2>
                            <p className="text-gray-600 mb-8">Suscríbete para recibir precios exclusivos y envíos mensuales.</p>
                            <Link href="/suscripciones" className="bg-[#8B3A28] text-white px-8 py-4 rounded-full font-bold hover:scale-105 transition block md:inline-block">
                                Ver Planes del Club
                            </Link>
                        </div>
                    )}

                    {/* 3. SELECTOR DE SABORES */}
                    {subscription && (
                        <FlavorSelector
                            subscriptionId={subscription.id}
                            unitCount={subscription.plan.unitCount}
                            flavors={allFlavors}
                            currentSelection={subscription.selectedFlavors}
                        />
                    )}

                    {/* Formulario de Dirección Integrado */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <DireccionForm cliente={cliente} />
                    </div>
                </div>

                {/* COLUMNA DERECHA: Resumen de Usuario / Status */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Estatus de Envío
                        </h3>
                        <div className="space-y-4">
                            <div className="flex gap-4 items-start">
                                <div className="bg-orange-100 p-2 rounded-lg text-orange-600 font-bold text-xs italic">
                                    PASO 1
                                </div>
                                <p className="text-sm text-gray-600 leading-tight">
                                    Pago verificado con éxito.
                                </p>
                            </div>
                            <div className="flex gap-4 items-start opacity-50">
                                <div className="bg-gray-100 p-2 rounded-lg text-gray-600 font-bold text-xs">
                                    PASO 2
                                </div>
                                <p className="text-sm text-gray-600 leading-tight">
                                    Selección de sabores recibida.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}