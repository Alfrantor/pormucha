"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, ImageIcon, LoaderCircle, Package2, Percent, ShoppingCart, Upload } from "lucide-react";
import { NoScrollNumberInput } from "@/components/NoScrollNumberInput";
import { toggleStatus } from "@/actions/toggle-status";
import { updateFlavorImages, updateWebPackSettings } from "@/actions/admin-actions";
import { getWebCmsUploadUrl } from "@/app/_actions/web-cms";
import { resolveWebCmsAssetUrl } from "@/lib/web-cms";

type WebPack = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  clubDiscountPercent: number | null;
  image: string | null;
  imageEuro: string | null;
  description: string | null;
  subscriptionNote: string | null;
  subscriptionBenefit1: string | null;
  subscriptionBenefit2: string | null;
  subscriptionBenefit3: string | null;
  isArchived: boolean;
};

type WebPacksManagerProps = {
  products: WebPack[];
  flavors: WebBottle[];
  adminEmail: string;
};

type WebBottle = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  imageEuro: string | null;
  isArchived: boolean;
};

function formatMoney(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_ORIGINAL_IMAGE_SIZE = 12 * 1024 * 1024;
const MAX_OPTIMIZED_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2200;

function replaceFileExtension(filename: string, nextExtension: string) {
  const cleanName = filename.replace(/\.[^.]+$/, "");
  return `${cleanName || "asset"}.${nextExtension}`;
}

async function fileToImageBitmap(file: File): Promise<ImageBitmap | HTMLCanvasElement> {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file);
  }

  const image = document.createElement("img");
  const objectUrl = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("No se pudo leer la imagen."));
    image.src = objectUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("No se pudo preparar la imagen.");
  }

  context.drawImage(image, 0, 0);
  URL.revokeObjectURL(objectUrl);
  return canvas;
}

async function optimizeImageForWeb(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Formato no permitido. Usa JPG, PNG, WebP o AVIF.");
  }

  if (file.size > MAX_ORIGINAL_IMAGE_SIZE) {
    throw new Error("La imagen original supera 12 MB. Reduce el archivo antes de subirlo.");
  }

  const source = await fileToImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(source.width, source.height));
  const targetWidth = Math.max(1, Math.round(source.width * scale));
  const targetHeight = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    throw new Error("No se pudo optimizar la imagen.");
  }

  context.drawImage(source as CanvasImageSource, 0, 0, targetWidth, targetHeight);

  let quality = 0.88;
  let output: Blob | null = null;

  while (quality >= 0.58) {
    output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (output && output.size <= MAX_OPTIMIZED_IMAGE_SIZE) {
      break;
    }
    quality -= 0.08;
  }

  if (!output) {
    throw new Error("No se pudo generar la imagen optimizada.");
  }

  if (output.size > MAX_OPTIMIZED_IMAGE_SIZE) {
    throw new Error("La imagen optimizada sigue siendo muy pesada. Usa una imagen mas ligera.");
  }

  return new File([output], replaceFileExtension(file.name, "webp"), {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

async function uploadCatalogImage(file: File, productName: string, variant: "normal" | "euro") {
  const preparedFile = await optimizeImageForWeb(file);
  const response = await getWebCmsUploadUrl({
    filename: preparedFile.name,
    contentType: preparedFile.type,
    fileSize: preparedFile.size,
    pageKey: "packs-botellas",
    blockLabel: `${productName}-${variant}`,
    assetType: "image",
  });

  if (!response.success) {
    throw new Error(response.error);
  }

  const uploadResult = await fetch(response.signedUrl, {
    method: "PUT",
    body: preparedFile,
    headers: {
      "Content-Type": preparedFile.type,
    },
  });

  if (!uploadResult.ok) {
    throw new Error(`No se pudo subir la imagen (${uploadResult.status}).`);
  }

  return response.fileUrl;
}

type CatalogImageUploaderProps = {
  name: "image" | "imageEuro";
  label: string;
  value: string;
  placeholder: string;
  uploadKey: string;
  uploadingKey: string | null;
  disabled?: boolean;
  onUrlChange: (url: string) => void;
  onUpload: (file: File) => Promise<void>;
};

function CatalogImageUploader({
  name,
  label,
  value,
  placeholder,
  uploadKey,
  uploadingKey,
  disabled,
  onUrlChange,
  onUpload,
}: CatalogImageUploaderProps) {
  const resolvedUrl = value ? resolveWebCmsAssetUrl(value) : "";
  const isUploading = uploadingKey === uploadKey;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2.5">
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          <ImageIcon size={11} />
          {label}
        </span>
        {value ? (
          <a
            href={resolvedUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 underline underline-offset-2"
          >
            Ver archivo
          </a>
        ) : null}
      </div>

      {resolvedUrl ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
          <Image
            src={resolvedUrl}
            alt={label}
            width={520}
            height={320}
            unoptimized
            className="h-24 w-full object-contain p-2"
          />
        </div>
      ) : (
        <div className="mt-2 flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-400">
          Sin imagen cargada
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-950 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800">
          {isUploading ? <LoaderCircle size={12} className="animate-spin" /> : <Upload size={12} />}
          {isUploading ? "Subiendo..." : "Subir"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            disabled={disabled || uploadingKey !== null}
            className="hidden"
            onChange={async (event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              if (file) await onUpload(file);
              input.value = "";
            }}
          />
        </label>
        {value ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onUrlChange("")}
            className="rounded-full bg-rose-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Quitar
          </button>
        ) : null}
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          Ruta manual
        </summary>
        <input
          value={value}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none disabled:text-slate-400"
        />
      </details>
    </div>
  );
}

export function WebPacksManager({ products, flavors, adminEmail }: WebPacksManagerProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [imageValues, setImageValues] = useState<Record<string, { image: string; imageEuro: string }>>(
    () =>
      Object.fromEntries(
        products.map((product) => [
          product.id,
          {
            image: product.image || "",
            imageEuro: product.imageEuro || "",
          },
        ]),
      ),
  );
  const [bottleImageValues, setBottleImageValues] = useState<Record<string, { image: string; imageEuro: string }>>(
    () =>
      Object.fromEntries(
        flavors.map((flavor) => [
          flavor.id,
          {
            image: flavor.image || "",
            imageEuro: flavor.imageEuro || "",
          },
        ]),
      ),
  );
  const [localArchived, setLocalArchived] = useState<Record<string, boolean>>(
    () => Object.fromEntries(products.map((product) => [product.id, product.isArchived])),
  );

  const decoratedProducts = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        isArchived: localArchived[product.id] ?? product.isArchived,
        image: imageValues[product.id]?.image ?? product.image,
        imageEuro: imageValues[product.id]?.imageEuro ?? product.imageEuro,
      })),
    [imageValues, localArchived, products],
  );

  const visibleProducts = showArchived
    ? decoratedProducts
    : decoratedProducts.filter((product) => !product.isArchived);
  const archivedCount = decoratedProducts.filter((product) => product.isArchived).length;
  const decoratedFlavors = useMemo(
    () =>
      flavors.map((flavor) => ({
        ...flavor,
        image: bottleImageValues[flavor.id]?.image ?? flavor.image,
        imageEuro: bottleImageValues[flavor.id]?.imageEuro ?? flavor.imageEuro,
      })),
    [bottleImageValues, flavors],
  );
  const visibleFlavors = showArchived ? decoratedFlavors : decoratedFlavors.filter((flavor) => !flavor.isArchived);

  return (
    <div className="space-y-5">
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-slate-950 p-2 text-white">
            <Package2 size={18} />
          </span>
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-950">Packs y planes</h2>
            <p className="text-xs font-semibold text-slate-500">
              Edita precio, descuento, imagen y textos comerciales desde una sola ficha.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowArchived((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-100"
        >
          {showArchived ? <Eye size={14} /> : <EyeOff size={14} />}
          {showArchived ? "Ver solo visibles" : `Ver ocultos (${archivedCount})`}
        </button>
      </div>

      <div className="mt-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleProducts.map((product) => {
            const discountPercent = Number(product.clubDiscountPercent || 0);
            const subscriptionPrice = Math.max(0, Number(product.price || 0) * (1 - discountPercent / 100));
            const normalUploadKey = `${product.id}:normal`;
            const euroUploadKey = `${product.id}:euro`;
            const handleUpload = async (file: File, variant: "normal" | "euro") => {
              const key = variant === "normal" ? normalUploadKey : euroUploadKey;
              setUploadingKey(key);
              try {
                const fileUrl = await uploadCatalogImage(file, product.name, variant);
                setImageValues((current) => ({
                  ...current,
                  [product.id]: {
                    image: variant === "normal" ? fileUrl : current[product.id]?.image || product.image || "",
                    imageEuro: variant === "euro" ? fileUrl : current[product.id]?.imageEuro || product.imageEuro || "",
                  },
                }));
              } catch (error) {
                window.alert(error instanceof Error ? error.message : "No se pudo subir la imagen.");
              } finally {
                setUploadingKey(null);
              }
            };

            return (
              <form
                key={product.id}
                action={updateWebPackSettings}
                className={`rounded-[1.4rem] border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  product.isArchived ? "border-amber-200 bg-amber-50/45" : "border-slate-200 bg-white"
                }`}
              >
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="adminEmail" value={adminEmail} />
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="model" value="product" />
                <input type="hidden" name="currentStatus" value={String(product.isArchived)} />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-black text-slate-950">{product.name}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${
                        product.isArchived ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {product.isArchived ? "Oculto" : "Visible"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-400">{product.quantity} botellas por pack</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Precio suscripción estimado: <span className="font-black text-slate-900">{formatMoney(subscriptionPrice)}</span>
                  </p>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    <ShoppingCart size={11} />
                    Precio
                  </span>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <span className="text-xs font-black text-slate-400">$</span>
                    <NoScrollNumberInput
                      name="newPrice"
                      step="0.01"
                      defaultValue={Number(product.price || 0)}
                      disabled={product.isArchived}
                      className="w-full bg-transparent text-sm font-black text-slate-950 outline-none disabled:text-slate-400"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    <Percent size={11} />
                    Descuento
                  </span>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <NoScrollNumberInput
                      name="clubDiscountPercent"
                      min="0"
                      max="100"
                      defaultValue={discountPercent}
                      disabled={product.isArchived}
                      className="w-full bg-transparent text-sm font-black text-slate-950 outline-none disabled:text-slate-400"
                    />
                    <span className="text-xs font-black text-slate-400">%</span>
                  </div>
                </label>
                </div>

                <div className="mt-4 grid gap-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <CatalogImageUploader
                      name="image"
                      label="Imagen normal"
                      value={product.image || ""}
                      placeholder="/pack-6.PNG"
                      uploadKey={normalUploadKey}
                      uploadingKey={uploadingKey}
                      disabled={product.isArchived}
                      onUrlChange={(url) =>
                        setImageValues((current) => ({
                          ...current,
                          [product.id]: {
                            image: url,
                            imageEuro: current[product.id]?.imageEuro || product.imageEuro || "",
                          },
                        }))
                      }
                      onUpload={(file) => handleUpload(file, "normal")}
                    />

                    <CatalogImageUploader
                      name="imageEuro"
                      label="Imagen euro"
                      value={product.imageEuro || ""}
                      placeholder="/pack-6-euro.PNG"
                      uploadKey={euroUploadKey}
                      uploadingKey={uploadingKey}
                      disabled={product.isArchived}
                      onUrlChange={(url) =>
                        setImageValues((current) => ({
                          ...current,
                          [product.id]: {
                            image: current[product.id]?.image || product.image || "",
                            imageEuro: url,
                          },
                        }))
                      }
                      onUpload={(file) => handleUpload(file, "euro")}
                    />
                  </div>
                  <textarea
                    name="subscriptionNote"
                    defaultValue={product.subscriptionNote || product.description || ""}
                    placeholder="Texto corto de la tarjeta de suscripción"
                    rows={2}
                    disabled={product.isArchived}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none disabled:text-slate-400"
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      name="subscriptionBenefit1"
                      defaultValue={product.subscriptionBenefit1 || "Sabores 100% personalizables"}
                      placeholder="Beneficio 1"
                      disabled={product.isArchived}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-950 outline-none disabled:text-slate-400"
                    />
                    <input
                      name="subscriptionBenefit2"
                      defaultValue={product.subscriptionBenefit2 || "Cobertura nacional con envio seguro"}
                      placeholder="Beneficio 2"
                      disabled={product.isArchived}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-950 outline-none disabled:text-slate-400"
                    />
                    <input
                      name="subscriptionBenefit3"
                      defaultValue={product.subscriptionBenefit3 || ""}
                      placeholder="Beneficio 3"
                      disabled={product.isArchived}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-950 outline-none disabled:text-slate-400"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button
                    type="submit"
                    disabled={product.isArchived}
                    className="flex-1 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Guardar cambios
                  </button>
                  <button
                    formAction={async (formData) => {
                      setLocalArchived((current) => ({ ...current, [product.id]: !product.isArchived }));
                      await toggleStatus(formData);
                    }}
                    className={`flex-1 rounded-full px-4 py-2 text-xs font-black transition ${
                      product.isArchived
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                    }`}
                  >
                    {product.isArchived ? "Mostrar" : "Ocultar"}
                  </button>
                </div>
              </form>
            );
          })}

          {visibleProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm font-semibold text-slate-400 md:col-span-2 xl:col-span-3">
              No hay packs para mostrar con este filtro.
            </div>
          ) : null}
        </div>
      </div>
    </section>
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-cyan-50 p-2 text-cyan-700">
            <ImageIcon size={18} />
          </span>
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-950">Botellas</h2>
            <p className="text-xs font-semibold text-slate-500">
              Sube la imagen normal/bala y la imagen euro que se usan al personalizar packs en /tienda.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleFlavors.map((flavor) => {
            const normalUploadKey = `${flavor.id}:bottle-normal`;
            const euroUploadKey = `${flavor.id}:bottle-euro`;
            const handleBottleUpload = async (file: File, variant: "normal" | "euro") => {
              const key = variant === "normal" ? normalUploadKey : euroUploadKey;
              setUploadingKey(key);
              try {
                const fileUrl = await uploadCatalogImage(file, flavor.name, variant === "normal" ? "normal" : "euro");
                setBottleImageValues((current) => ({
                  ...current,
                  [flavor.id]: {
                    image: variant === "normal" ? fileUrl : current[flavor.id]?.image || flavor.image || "",
                    imageEuro: variant === "euro" ? fileUrl : current[flavor.id]?.imageEuro || flavor.imageEuro || "",
                  },
                }));
              } catch (error) {
                window.alert(error instanceof Error ? error.message : "No se pudo subir la imagen.");
              } finally {
                setUploadingKey(null);
              }
            };

            return (
              <form
                key={flavor.id}
                action={updateFlavorImages}
                className={`rounded-[1.4rem] border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  flavor.isArchived ? "border-amber-200 bg-amber-50/45" : "border-slate-200 bg-white"
                }`}
              >
                <input type="hidden" name="flavorId" value={flavor.id} />
                <div className="mb-4">
                  <p className="text-base font-black text-slate-950">{flavor.name}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">{flavor.slug}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <CatalogImageUploader
                    name="image"
                    label="Imagen normal / bala"
                    value={flavor.image || ""}
                    placeholder="/jamaica.jpeg"
                    uploadKey={normalUploadKey}
                    uploadingKey={uploadingKey}
                    disabled={flavor.isArchived}
                    onUrlChange={(url) =>
                      setBottleImageValues((current) => ({
                        ...current,
                        [flavor.id]: {
                          image: url,
                          imageEuro: current[flavor.id]?.imageEuro || flavor.imageEuro || "",
                        },
                      }))
                    }
                    onUpload={(file) => handleBottleUpload(file, "normal")}
                  />

                  <CatalogImageUploader
                    name="imageEuro"
                    label="Imagen euro"
                    value={flavor.imageEuro || ""}
                    placeholder="/euro-jamaica.jpeg"
                    uploadKey={euroUploadKey}
                    uploadingKey={uploadingKey}
                    disabled={flavor.isArchived}
                    onUrlChange={(url) =>
                      setBottleImageValues((current) => ({
                        ...current,
                        [flavor.id]: {
                          image: current[flavor.id]?.image || flavor.image || "",
                          imageEuro: url,
                        },
                      }))
                    }
                    onUpload={(file) => handleBottleUpload(file, "euro")}
                  />
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={flavor.isArchived}
                    className="w-full rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Guardar imágenes
                  </button>
                </div>
              </form>
            );
          })}

          {visibleFlavors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm font-semibold text-slate-400 md:col-span-2 xl:col-span-3">
              No hay botellas para mostrar con este filtro.
            </div>
          ) : null}
        </div>
      </div>
    </section>
    </div>
  );
}
