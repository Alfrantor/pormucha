import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import ManageSubscriptionButton from "@/components/ManageSubscriptionButton";
import { DireccionForm } from "@/components/Perfil/DireccionForm";
import FlavorSelector from "@/components/Perfil/FlavorSelector";
import Link from "next/link";
import { ShoppingBag, CreditCard as CreditCardIcon, RefreshCw, Box, MapPin } from "lucide-react";

export const revalidate = 0;

export default async function PerfilPage() {
    const user = await currentUser();
    const { userId } = await auth();

    if (!userId || !user) redirect("/sign-in");

    const userEmail = user.emailAddresses[0].emailAddress;

    const cliente = await db.client.findUnique({
        where: { clerkUserId: userId } // Búsqueda perfecta y exacta por ID
    });

    const subscriptions = cliente ? await db.subscription.findMany({
        where: {
            clientId: cliente.id, // Ya no usamos el signo de interrogación
            status: "active"
        },
        include: { plan: true }
    }) : []; // Si no hay cliente, devuelve un arreglo vacío

    const rawFlavors = await db.flavor.findMany();
    const allFlavors = rawFlavors.map(flavor => ({
        ...flavor,
        price: flavor.price ? Number(flavor.price) : 0,
    }));

    // NUEVA CONDICIÓN MÁS SIMPLE: Si tiene calle, asumimos que tiene dirección
    const hasAddress = Boolean(cliente?.street);

    return (
        <div className="max-w-7xl mx-auto p-6 pt-24 min-h-screen bg-[#FDFCF9]">
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
                <div className="lg:col-span-2 space-y-8">
                    {subscriptions.length > 0 ? (
                        subscriptions.map((sub, index) => (
                            <div key={sub.id} className="bg-white rounded-3xl p-8 border border-green-100 shadow-sm relative overflow-hidden mb-8">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Box size={120} className="text-green-800" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <span className="bg-green-100 text-green-700 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-tighter">
                                            Pack #{index + 1} Activo
                                        </span>
                                    </div>
                                    <h2 className="text-3xl font-serif text-gray-800 mb-2">
                                        {sub.plan.name} 🌿
                                    </h2>
                                    <p className="text-gray-500 mb-8 max-w-md">
                                        Tu próxima caja llegará después del <b>{sub.currentPeriodEnd.toLocaleDateString()}</b>.
                                    </p>
                                    <div className="mb-8 border-t border-gray-100 pt-8">
                                        <FlavorSelector
                                            subscriptionId={sub.id}
                                            unitCount={sub.plan.unitCount}
                                            flavors={allFlavors}
                                            currentSelection={sub.selectedFlavors}
                                        />
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-gray-100">
                                        <ManageSubscriptionButton subscriptionId={sub.id} />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-[#F4EFEA] rounded-3xl p-10 text-center border-2 border-dashed border-[#D1C7BD]">
                            <h2 className="text-2xl font-serif text-[#8B3A28] mb-4">Aún no eres parte del Club</h2>
                            <p className="text-gray-600 mb-8">Suscríbete para recibir precios exclusivos y envíos mensuales.</p>
                            <Link href="/suscripciones" className="bg-[#8B3A28] text-white px-8 py-4 rounded-full font-bold hover:scale-105 transition block md:inline-block">
                                Ver Planes del Club
                            </Link>
                        </div>
                    )}

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-8">
                        <DireccionForm cliente={cliente} />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Estatus de Envío
                        </h3>
                        <div className="space-y-4">
                            <div className="flex gap-4 items-start">
                                <div className="bg-green-100 p-2 rounded-lg text-green-700 font-bold text-xs">
                                    OK
                                </div>
                                <p className="text-sm text-gray-600 leading-tight">
                                    Tus packs activos están programados.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <MapPin size={20} className="text-[#8B3A28]" />
                            Dirección de Envío
                        </h3>
                        {hasAddress ? (
                            <div className="text-sm text-gray-700 space-y-2 bg-[#FDFCF9] p-5 rounded-2xl border border-gray-100">
                                <p className="font-bold text-gray-900 text-base">{user.firstName} {user.lastName}</p>
                                {/* LEEMOS DIRECTAMENTE DE LOS CAMPOS INDIVIDUALES */}
                                <p>{cliente?.street} {cliente?.number}</p>
                                <p>{cliente?.neighborhood}</p>
                                <p>{cliente?.city}, {cliente?.state}</p>
                                <p>C.P. {cliente?.zipCode}</p>
                                {cliente?.reference && <p className="text-gray-500 italic mt-2">Ref: {cliente.reference}</p>}
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                    <p className="font-medium bg-gray-100 inline-block px-3 py-1.5 rounded-lg text-xs tracking-widest uppercase">
                                        📞 {cliente?.phone || "Sin teléfono"}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-orange-50 text-orange-700 p-5 rounded-2xl text-sm border border-orange-100">
                                <strong>¡Aviso importante!</strong><br />
                                Aún no has registrado una dirección de envío completa. Por favor, llena el formulario de la izquierda.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}