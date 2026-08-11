import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Eye, EyeOff, Package2, Percent, ShoppingCart } from "lucide-react";
import { toggleStatus } from "@/actions/toggle-status";
import { updateClubDiscountPercent, updateFlavorImages, updateFlavorPrice, updatePackImage, updatePackPrice, updatePackSubscriptionCopy } from "@/actions/admin-actions";
import { NoScrollNumberInput } from "@/components/NoScrollNumberInput";

function getResolvedPrice(priceLike: unknown, fallbackLike: unknown = 0) {
  const price = Number(priceLike ?? 0);
  if (Number.isFinite(price) && price > 0) return price;

  const fallback = Number(fallbackLike ?? 0);
  return Number.isFinite(fallback) ? fallback : 0;
}

export default async function CatalogProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ showArchived?: string; scope?: string }>;
}) {
  const params = (await searchParams) || {};
  const showArchived = params.showArchived === "1";
  const webScope = params.scope === "web";
  const user = await currentUser();
  const adminEmail = user?.emailAddresses[0]?.emailAddress || "system";

  const [products, flavors] = await Promise.all([
    db.product.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.flavor.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  const visibleProducts = showArchived ? products : products.filter((product) => !product.isArchived);
  const visibleFlavors = showArchived ? flavors : flavors.filter((flavor) => !flavor.isArchived);
  const archivedProducts = products.filter((product) => product.isArchived).length;
  const archivedFlavors = flavors.filter((flavor) => flavor.isArchived).length;
  const hiddenCount = archivedProducts + (webScope ? 0 : archivedFlavors);
  const toggleHref = showArchived
    ? `/admin/catalog/products${webScope ? "?scope=web" : ""}`
    : `/admin/catalog/products?showArchived=1${webScope ? "&scope=web" : ""}`;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Catalogo</p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Productos</h1>
            <p className="mt-2 text-sm text-slate-500">
              {webScope
                ? "Aqui controlas los packs y el texto comercial de suscripciones para la parte web."
                : "Aqui controlas el precio que se muestra en POS y web, el descuento de suscripcion y que productos quedan ocultos."}
            </p>
          </div>
          <a
            href={toggleHref}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white hover:bg-slate-800"
          >
            {showArchived ? <Eye size={14} /> : <EyeOff size={14} />}
            {showArchived ? "Ver solo activos" : `Ver ocultos (${hiddenCount})`}
          </a>
        </div>
      </section>

      <section className={`grid gap-4 ${webScope ? "md:grid-cols-2 xl:max-w-3xl" : "md:grid-cols-4"}`}>
        <Metric label="Packs visibles" value={products.filter((product) => !product.isArchived).length} />
        <Metric label="Packs ocultos" value={archivedProducts} />
        {!webScope ? <Metric label="Sabores visibles" value={flavors.filter((flavor) => !flavor.isArchived).length} /> : null}
        {!webScope ? <Metric label="Sabores ocultos" value={archivedFlavors} /> : null}
      </section>

      <section className={`grid gap-6 ${webScope ? "xl:max-w-4xl" : "lg:grid-cols-2"}`}>
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Package2 size={18} className="text-slate-500" />
            <h2 className="text-xl font-black text-slate-950">Packs</h2>
          </div>
          <div className="mt-4 space-y-3">
            {visibleProducts.map((product) => {
              const basePrice = Number(product.price || 0);
              const discountPercent = Number(product.clubDiscountPercent || 0);
              const subscriptionPrice = Math.max(0, basePrice * (1 - discountPercent / 100));

              return (
                <div
                  key={product.id}
                  className={`rounded-2xl border p-4 ${
                    product.isArchived ? "border-amber-200 bg-amber-50/70 opacity-75" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-slate-950">{product.name}</p>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                            product.isArchived ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {product.isArchived ? "Oculto" : "Visible"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{product.quantity} botellas por pack</p>
                      <p className="mt-2 text-[11px] font-semibold text-slate-500">
                        Suscripcion estimada:{" "}
                        <span className="font-black text-slate-950">
                          {subscriptionPrice.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                        </span>
                      </p>
                    </div>
                    <p className="font-black text-slate-950">
                      {basePrice.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <form action={updatePackPrice} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="adminEmail" value={adminEmail} />
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                        <ShoppingCart size={12} />
                        Precio POS / Web
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-500">$</span>
                        <NoScrollNumberInput
                          name="newPrice"
                          step="0.01"
                          defaultValue={basePrice}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-950 outline-none"
                          disabled={product.isArchived}
                        />
                      </div>
                      <button
                        className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-white transition hover:bg-slate-800 disabled:opacity-50"
                        disabled={product.isArchived}
                      >
                        Guardar precio
                      </button>
                    </form>

                    <form action={updateClubDiscountPercent} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="adminEmail" value={adminEmail} />
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                        <Percent size={12} />
                        Descuento suscripcion
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <NoScrollNumberInput
                          name="clubDiscountPercent"
                          min="0"
                          max="100"
                          defaultValue={discountPercent}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-950 outline-none"
                          disabled={product.isArchived}
                        />
                        <span className="text-sm font-bold text-slate-500">%</span>
                      </div>
                      <button
                        className="mt-3 w-full rounded-xl bg-[#8B3A18] px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-white transition hover:bg-[#6c2d13] disabled:opacity-50"
                        disabled={product.isArchived}
                      >
                        Guardar descuento
                      </button>
                    </form>
                  </div>

                  <div className="mt-3 grid gap-3">
                    <form action={updatePackImage} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <input type="hidden" name="productId" value={product.id} />
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                        <ShoppingCart size={12} />
                        Imagen del pack
                      </div>
                      <input
                        name="image"
                        defaultValue={product.image || ""}
                        placeholder="/pack-6.PNG"
                        className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-950 outline-none"
                        disabled={product.isArchived}
                      />
                      <p className="mt-2 text-xs text-slate-400">Esta imagen se usa en tienda y suscripciones para la tarjeta del pack.</p>
                      <button
                        className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-white transition hover:bg-slate-800 disabled:opacity-50"
                        disabled={product.isArchived}
                      >
                        Guardar imagen
                      </button>
                    </form>

                    <form action={updatePackSubscriptionCopy} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <input type="hidden" name="productId" value={product.id} />
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                        <ShoppingCart size={12} />
                        Texto de suscripcion
                      </div>
                      <textarea
                        name="subscriptionNote"
                        defaultValue={product.subscriptionNote || product.description || ""}
                        placeholder="Texto corto que aparece en la tarjeta de suscripcion."
                        rows={3}
                        className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-950 outline-none"
                        disabled={product.isArchived}
                      />
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <input
                          name="subscriptionBenefit1"
                          defaultValue={product.subscriptionBenefit1 || "Sabores 100% personalizables"}
                          placeholder="Beneficio 1"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-950 outline-none"
                          disabled={product.isArchived}
                        />
                        <input
                          name="subscriptionBenefit2"
                          defaultValue={product.subscriptionBenefit2 || "Cobertura nacional con envio seguro"}
                          placeholder="Beneficio 2"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-950 outline-none"
                          disabled={product.isArchived}
                        />
                        <input
                          name="subscriptionBenefit3"
                          defaultValue={product.subscriptionBenefit3 || ""}
                          placeholder="Beneficio 3 opcional"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-950 outline-none"
                          disabled={product.isArchived}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-400">Esto controla lo que dice la tarjeta del pack en la pagina de suscripciones.</p>
                      <button
                        className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-white transition hover:bg-slate-800 disabled:opacity-50"
                        disabled={product.isArchived}
                      >
                        Guardar texto
                      </button>
                    </form>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <form action={toggleStatus}>
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="model" value="product" />
                      <input type="hidden" name="currentStatus" value={String(product.isArchived)} />
                      <button
                        className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${
                          product.isArchived ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-rose-600 text-white hover:bg-rose-500"
                        }`}
                      >
                        {product.isArchived ? "Mostrar en tienda" : "Ocultar de tienda"}
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!webScope ? (
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Package2 size={18} className="text-slate-500" />
            <h2 className="text-xl font-black text-slate-950">Sabores</h2>
          </div>
          <div className="mt-4 space-y-3">
            {visibleFlavors.map((flavor) => (
              <div key={flavor.id} className={`rounded-2xl border p-4 ${flavor.isArchived ? "border-amber-200 bg-amber-50/70 opacity-75" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-950">{flavor.name}</p>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${flavor.isArchived ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {flavor.isArchived ? "Oculto" : "Visible"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{flavor.slug}</p>
                  </div>
                  <p className="font-black text-slate-950">{getResolvedPrice(flavor.price, flavor.basePrice).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</p>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                  <form action={updateFlavorPrice} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <input type="hidden" name="flavorId" value={flavor.id} />
                    <input type="hidden" name="adminEmail" value={adminEmail} />
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                      <ShoppingCart size={12} />
                      Precio POS / Sabores
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-500">$</span>
                      <NoScrollNumberInput
                        name="newPrice"
                        step="0.01"
                        defaultValue={getResolvedPrice(flavor.price, flavor.basePrice)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-950 outline-none"
                        disabled={flavor.isArchived}
                      />
                    </div>
                    <button
                      className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-white transition hover:bg-slate-800 disabled:opacity-50"
                      disabled={flavor.isArchived}
                    >
                      Guardar precio
                    </button>
                  </form>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <form action={updateFlavorImages} className="rounded-2xl border border-slate-200 bg-white p-4 md:col-span-2">
                    <input type="hidden" name="flavorId" value={flavor.id} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                          <ShoppingCart size={12} />
                          Imagen normal / bala
                        </div>
                        <input
                          name="image"
                          defaultValue={flavor.image || ""}
                          placeholder="/jamaica.jpeg"
                          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-950 outline-none"
                          disabled={flavor.isArchived}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                          <ShoppingCart size={12} />
                          Imagen euro
                        </div>
                        <input
                          name="imageEuro"
                          defaultValue={flavor.imageEuro || ""}
                          placeholder="/euro-jamaica.jpeg"
                          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-950 outline-none"
                          disabled={flavor.isArchived}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">La imagen normal se usa para bala/checkout. La euro se usa cuando el pack trabaja en formato euro.</p>
                    <button
                      className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-white transition hover:bg-slate-800 disabled:opacity-50"
                      disabled={flavor.isArchived}
                    >
                      Guardar imagenes
                    </button>
                  </form>
                </div>
                <div className="mt-4 flex justify-end">
                  <form action={toggleStatus}>
                    <input type="hidden" name="id" value={flavor.id} />
                    <input type="hidden" name="model" value="flavor" />
                    <input type="hidden" name="currentStatus" value={String(flavor.isArchived)} />
                    <button className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${flavor.isArchived ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-rose-600 text-white hover:bg-rose-500"}`}>
                      {flavor.isArchived ? "Mostrar en tienda" : "Ocultar de tienda"}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
        ) : null}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-lg">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/65">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}
