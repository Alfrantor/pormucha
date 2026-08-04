"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

type ShippingOption = {
  id: string;
  provider: string;
  rate: number;
  days?: number;
  source?: string;
};

type FlavorOption = {
  id: string;
  name: string;
  image?: string | null;
};

const FALLBACK_FLAVOR_IMAGE = "/botella-pormucha.png";
const CLUB_DISCOUNT_PERCENT = 10;

export default function CheckoutPage() {
  const { cart, total, removeFromCart, updateCartItemQuantity, updateCartItem, clearCart } = useCart();
  const router = useRouter();

  const [shippingCost, setShippingCost] = useState(0);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [shippingSourceLabel, setShippingSourceLabel] = useState("Paquetería");
  const [availableFlavors, setAvailableFlavors] = useState<FlavorOption[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingSelections, setEditingSelections] = useState<Record<string, number>>({});
  const [editingError, setEditingError] = useState("");

  const [address, setAddress] = useState({
    name: "",
    email: "",
    phone: "",
    zip: "",
    state: "",
    city: "",
    neighborhood: "",
    street: "",
    number: "",
    reference: "",
  });

  const hasItems = cart.length > 0;
  const editingItem = cart.find((item) => item.id === editingItemId) || null;
  const editingTargetQty = editingItem?.packQuantity ?? editingItem?.quantity ?? 0;
  const editingSelectedTotal = Object.values(editingSelections).reduce((sum, value) => sum + value, 0);
  const clubDiscount = total * (CLUB_DISCOUNT_PERCENT / 100);
  const clubPrice = Math.max(total - clubDiscount, 0);

  useEffect(() => {
    if (hasItems) return;
    setShippingCost(0);
    setSelectedShipping(null);
    setShippingOptions([]);
    setShippingSourceLabel("Paquetería");
    router.replace("/tienda");
  }, [hasItems, router]);

  useEffect(() => {
    const loadFlavors = async () => {
      try {
        const res = await fetch("/api/catalog/flavors");
        const data = await res.json();
        if (res.ok && Array.isArray(data.flavors)) {
          setAvailableFlavors(data.flavors);
        }
      } catch (error) {
        console.error("Error cargando sabores para edición:", error);
      }
    };

    loadFlavors();
  }, []);

  useEffect(() => {
    if (!editingItem) {
      setEditingSelections({});
      setEditingError("");
      return;
    }

    const initial: Record<string, number> = {};
    availableFlavors.forEach((flavor) => {
      initial[flavor.id] = 0;
    });

    if (Array.isArray(editingItem.composition) && editingItem.composition.length > 0) {
      editingItem.composition.forEach((comp) => {
        initial[comp.flavorId] = Number(comp.quantity) || 0;
      });
    } else {
      Object.entries(editingItem.flavors || {}).forEach(([flavorId, quantity]) => {
        initial[flavorId] = Number(quantity) || 0;
      });
    }

    setEditingSelections(initial);
    setEditingError("");
  }, [editingItem, availableFlavors]);

  const handleRemoveItem = (id: string) => {
    if (!window.confirm("¿Seguro que deseas quitar este producto del carrito?")) return;
    removeFromCart(id);
  };

  const handleClearCart = () => {
    if (!window.confirm("¿Seguro que deseas vaciar todo el carrito?")) return;
    clearCart();
    router.replace("/tienda");
  };

  const openEditor = (itemId: string) => {
    setEditingItemId(itemId);
  };

  const closeEditor = () => {
    setEditingItemId(null);
    setEditingSelections({});
    setEditingError("");
  };

  const updateEditingQuantity = (flavorId: string, delta: number) => {
    if (!editingItem) return;
    setEditingSelections((prev) => {
      const current = prev[flavorId] || 0;
      const next = current + delta;
      if (next < 0) return prev;
      const currentTotal = Object.values(prev).reduce((sum, value) => sum + value, 0);
      if (currentTotal + delta > editingTargetQty) return prev;
      return { ...prev, [flavorId]: next };
    });
  };

  const saveEditingItem = () => {
    if (!editingItem) return;

    if (editingSelectedTotal !== editingTargetQty) {
      setEditingError(`Debes seleccionar exactamente ${editingTargetQty} botellas.`);
      return;
    }

    const composition = availableFlavors
      .map((flavor) => ({
        flavorId: flavor.id,
        name: flavor.name,
        quantity: editingSelections[flavor.id] || 0,
      }))
      .filter((item) => item.quantity > 0);

    const nextFlavors = availableFlavors.reduce<Record<string, number>>((acc, flavor) => {
      acc[flavor.id] = editingSelections[flavor.id] || 0;
      return acc;
    }, {});

    updateCartItem(editingItem.id, {
      ...editingItem,
      composition,
      flavors: nextFlavors,
    });

    closeEditor();
  };

  const handleCalculateShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasItems) return alert("Agrega al menos un producto al carrito antes de cotizar el envío.");
    if (!address.zip) return alert("Por favor, ingresa un código postal.");

    setLoadingShipping(true);
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zip: address.zip,
          productIds: cart.map((item) => item.id),
          state: address.state,
          city: address.city,
          neighborhood: address.neighborhood,
        }),
      });
      const data = await res.json();

      if (data.rates && data.rates.length > 0) {
        setShippingOptions(data.rates);
        setSelectedShipping(data.rates[0]);
        setShippingCost(data.rates[0].rate);
        setShippingSourceLabel(data.provider || data.rates[0].source || "Paquetería");
      } else {
        alert(data.error || "No se encontraron tarifas de paquetería para este código postal.");
        setShippingCost(0);
      }
    } catch (error) {
      console.error("Error cotizando envío:", error);
      alert("Error al contactar con paquetería.");
      setShippingCost(0);
    } finally {
      setLoadingShipping(false);
    }
  };

  const handlePayment = async () => {
    if (!hasItems) return alert("Tu carrito está vacío.");
    if (shippingCost === 0 || !selectedShipping) return alert("Primero cotiza tu envío para continuar.");

    const emptyFields = Object.values(address).some((value) => value.trim() === "");
    if (emptyFields) return alert("Por favor, completa todos los datos de envío.");

    setLoadingPayment(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          shippingCost,
          customerAddress: address,
          shippingProvider: selectedShipping.provider,
          shippingRateId: selectedShipping.id,
        }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        console.error("Error detallado del servidor:", data);
        alert(`Error de Stripe: ${data.details || data.error || "No se pudo iniciar el pago"}`);
        setLoadingPayment(false);
      }
    } catch (error) {
      console.error("Error al procesar pago:", error);
      alert("Hubo un error al conectar con el servidor de pagos.");
      setLoadingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto p-6 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <section className="space-y-8">
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none">Finalizar compra</h2>
            <p className="text-gray-500 mt-3 font-medium text-lg">Todos los campos son obligatorios para garantizar tu entrega.</p>
          </div>

          <form onSubmit={handleCalculateShipping} className="grid grid-cols-1 gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Nombre completo</label>
                <input
                  required
                  placeholder="Juan Pérez"
                  className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Teléfono celular</label>
                <input
                  required
                  type="tel"
                  placeholder="5512345678"
                  className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Correo electrónico</label>
              <input
                required
                type="email"
                placeholder="tu@email.com"
                className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                onChange={(e) => setAddress({ ...address, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">C.P.</label>
                <input
                  required
                  placeholder="00000"
                  className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                  onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Estado</label>
                <input
                  required
                  placeholder="Ej: CDMX"
                  className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Ciudad</label>
                <input
                  required
                  placeholder="Ciudad"
                  className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Colonia</label>
                <input
                  required
                  placeholder="Ej: Roma Norte"
                  className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                  onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Calle</label>
                <input
                  required
                  placeholder="Av. Juárez"
                  className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Número</label>
                <input
                  required
                  placeholder="456"
                  className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all"
                  onChange={(e) => setAddress({ ...address, number: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Referencia de entrega</label>
              <textarea
                required
                placeholder="Ej: Casa blanca con portón negro..."
                rows={2}
                maxLength={25}
                className="p-5 rounded-2xl border-2 border-transparent shadow-sm bg-white focus:border-blue-500 outline-none transition-all resize-none"
                onChange={(e) => setAddress({ ...address, reference: e.target.value })}
              />
              <p className="ml-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                Máximo 25 caracteres
              </p>
            </div>

            <button
              type="submit"
            disabled={loadingShipping || !hasItems}
            className="bg-blue-600 text-white font-black p-5 rounded-2xl hover:bg-blue-700 transition-all active:scale-95 disabled:bg-gray-300 shadow-xl shadow-blue-100 mt-2"
          >
              {loadingShipping ? "OBTENIENDO TARIFAS..." : !hasItems ? "AGREGA PRODUCTOS PRIMERO" : "COTIZAR ENVÍO"}
            </button>

            {shippingOptions.length > 0 ? (
              <div className="flex flex-col gap-3 mt-4 border-t pt-6 border-gray-100">
                <label className="text-[10px] items-center flex justify-between font-black uppercase text-gray-400">
                  <span>Selecciona tu envío</span>
                  <span className="text-blue-500 bg-blue-50 px-2 py-1 rounded">{shippingSourceLabel}</span>
                </label>

                {shippingOptions.map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => {
                      setSelectedShipping(opt);
                      setShippingCost(opt.rate);
                    }}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedShipping?.id === opt.id ? "border-blue-600 bg-blue-50 shadow-md" : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedShipping?.id === opt.id ? "border-blue-600" : "border-gray-300"}`}>
                        {selectedShipping?.id === opt.id ? <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" /> : null}
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-bold ${selectedShipping?.id === opt.id ? "text-blue-900" : "text-gray-900"}`}>{opt.provider}</span>
                        <span className="text-xs text-gray-500 font-medium">Entrega estimada: {opt.days} días</span>
                      </div>
                    </div>
                    <span className="font-black text-blue-700 text-lg">${opt.rate}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </form>
        </section>

        <section className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl h-fit border border-gray-100 flex flex-col gap-6">
          <h2 className="text-2xl font-black mb-2 text-gray-900 tracking-tight">Tu selección</h2>

          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 scrollbar-hide">
            {cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start gap-4 border-b border-gray-50 pb-6">
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="font-black text-lg text-gray-900 leading-tight">{item.name}</p>
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-1">Pack personalizado</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {item.composition && item.composition.length > 0
                      ? item.composition.map((comp) =>
                          comp.quantity > 0 ? (
                            <span key={comp.flavorId} className="text-[9px] bg-gray-100 px-2 py-1 rounded-full text-gray-600 font-bold">
                              {comp.quantity} {comp.name}
                            </span>
                          ) : null
                        )
                      : Object.entries(item.flavors).map(([sabor, cant]) =>
                          cant > 0 ? (
                            <span key={sabor} className="text-[9px] bg-gray-100 px-2 py-1 rounded-full text-gray-600 font-bold">
                              {cant} {sabor}
                            </span>
                          ) : null
                        )}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (item.quantity <= 1) {
                          if (!window.confirm("¿Seguro que deseas quitar este producto del carrito?")) return;
                          removeFromCart(item.id);
                          return;
                        }
                        updateCartItemQuantity(item.id, item.quantity - 1);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100"
                      aria-label="Disminuir cantidad"
                    >
                      -
                    </button>
                    <span className="min-w-8 text-center text-sm font-black text-gray-700">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100"
                      aria-label="Aumentar cantidad"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="ml-2 rounded-full border border-rose-200 px-3 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50"
                    >
                      Quitar
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditor(item.id)}
                      className="rounded-full border border-blue-200 px-3 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-50"
                    >
                      Editar sabores
                    </button>
                  </div>
                </div>
                <span className="font-black text-xl text-gray-900">${item.price}</span>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 p-6 rounded-[2rem] space-y-3">
            <div className="flex justify-between text-gray-500 font-bold text-sm uppercase tracking-widest">
              <span>Subtotal</span>
              <span>${total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-bold text-sm uppercase tracking-widest">Envío</span>
              <span className={shippingCost > 0 ? "text-green-600 font-black" : "text-gray-400 italic text-xs"}>
                {shippingCost > 0 ? `$${shippingCost}` : "Cotiza para ver costo"}
              </span>
            </div>
            <div className="pt-4 mt-2 border-t border-gray-200 flex justify-between items-baseline">
              <span className="text-2xl font-black text-gray-900">TOTAL</span>
              <div className="text-right">
                <p className="text-4xl font-black text-gray-900">${total + shippingCost}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase">Pesos mexicanos</p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 text-xs font-black uppercase tracking-[0.2em] text-gray-500 hover:bg-gray-50"
              >
                Vaciar carrito
              </button>
            )}
          </div>

          <button
            onClick={handlePayment}
            disabled={!hasItems || shippingCost === 0 || loadingPayment}
            className={`w-full py-6 rounded-3xl font-black text-lg tracking-[0.2em] transition-all active:scale-[0.98] shadow-2xl ${
              shippingCost > 0 && !loadingPayment ? "bg-black text-white hover:bg-zinc-800" : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {loadingPayment ? "CONECTANDO A STRIPE..." : "PAGAR AHORA"}
          </button>

          {hasItems && (
            <div className="rounded-[2rem] border border-[#8B3A18]/15 bg-[#F5F2EB] p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8B3A18]">
                Suscríbete a Club Pormucha y obtén {CLUB_DISCOUNT_PERCENT}% de descuento
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-sm text-gray-700">
                  Si fueras suscriptor, tu compra de productos bajaría a{" "}
                  <span className="font-black text-[#1A1A1A]">${clubPrice.toFixed(2)}</span>, ahorrando{" "}
                  <span className="font-black text-[#8B3A18]">${clubDiscount.toFixed(2)}</span>.
                </p>
                <p className="text-xs text-gray-500">
                  La suscripción es un flujo aparte y no una compra única. Puedes elegir tu plan oficial de Club Pormucha antes de confirmar.
                </p>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/suscripciones"
                  className="inline-flex items-center justify-center rounded-2xl bg-[#8B3A18] px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-white hover:bg-[#6f2f14]"
                >
                  Suscribirme al Club
                </Link>
                <div className="rounded-2xl border border-dashed border-[#8B3A18]/20 bg-white px-4 py-3 text-xs text-gray-600">
                  Al suscribirte, el surtido recurrente se maneja en tu panel y no como una orden única.
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4 opacity-30 grayscale mt-2">
            <p className="text-[10px] font-bold">STRIPE SECURE CHECKOUT</p>
            <p className="text-[10px] font-bold">{shippingSourceLabel.toUpperCase()}</p>
          </div>
        </section>
      </main>

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Editar sabores</p>
                <h3 className="mt-2 text-2xl font-black text-gray-900">{editingItem.name}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Selecciona de nuevo tus sabores. Deben sumar exactamente {editingTargetQty} botellas.
                </p>
              </div>
              <button type="button" onClick={closeEditor} className="rounded-full border border-gray-200 px-3 py-1 text-sm font-bold text-gray-500 hover:bg-gray-50">
                Cerrar
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableFlavors.map((flavor) => (
                <div key={flavor.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="relative mb-4 h-40 overflow-hidden rounded-2xl bg-white">
                      <Image
                      src={flavor.image || FALLBACK_FLAVOR_IMAGE}
                      alt={flavor.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="object-contain p-3"
                    />
                  </div>
                  <p className="text-sm font-black text-gray-900">{flavor.name}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateEditingQuantity(flavor.id, -1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                    >
                      -
                    </button>
                    <span className="min-w-8 text-center text-lg font-black text-gray-800">{editingSelections[flavor.id] || 0}</span>
                    <button
                      type="button"
                      onClick={() => updateEditingQuantity(flavor.id, 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Seleccionadas</p>
                <p className="mt-1 text-2xl font-black text-gray-900">
                  {editingSelectedTotal} / {editingTargetQty}
                </p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={closeEditor} className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 hover:bg-white">
                  Cancelar
                </button>
                <button type="button" onClick={saveEditingItem} className="rounded-2xl bg-black px-5 py-3 text-sm font-black text-white hover:bg-zinc-800">
                  Guardar cambios
                </button>
              </div>
            </div>

            {editingError && <p className="mt-3 text-sm font-semibold text-rose-600">{editingError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
