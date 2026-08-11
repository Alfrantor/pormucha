"use client";

import Image from "next/image";
import React, { useMemo, useState, useTransition } from "react";
import { getWebCmsUploadUrl, saveWebCmsConfig } from "@/app/_actions/web-cms";
import { resolveWebCmsAssetUrl, type WebCmsBlock, type WebCmsBlockType, type WebCmsConfig, type WebCmsPage } from "@/lib/web-cms";
import { LoaderCircle, Save, Upload } from "lucide-react";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const MAX_ORIGINAL_IMAGE_SIZE = 12 * 1024 * 1024;
const MAX_OPTIMIZED_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2200;
const MAX_ORIGINAL_VIDEO_SIZE = 160 * 1024 * 1024;
const MAX_OPTIMIZED_VIDEO_SIZE = 18 * 1024 * 1024;
const MAX_VIDEO_DIMENSION = 1280;

function makeObjectUrl(file: File) {
  return URL.createObjectURL(file);
}

function revokeObjectUrl(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}

function sortBlocks(blocks: WebCmsBlock[]) {
  return [...blocks].sort((a, b) => a.order - b.order);
}

function updatePage(config: WebCmsConfig, pageKey: string, updater: (page: WebCmsPage) => WebCmsPage): WebCmsConfig {
  return {
    ...config,
    pages: config.pages.map((page) => (page.key === pageKey ? updater(page) : page)),
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function supportsMediaFields(type: WebCmsBlockType) {
  return type === "hero" || type === "media";
}

function hasValue(value: string) {
  return value.trim().length > 0;
}

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
  const sourceWidth = source.width;
  const sourceHeight = source.height;

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(sourceWidth, sourceHeight));
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

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

function waitForEvent(target: EventTarget, eventName: string) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(eventName, onSuccess);
      target.removeEventListener("error", onError as EventListener);
    };
    const onSuccess = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("No se pudo procesar el video."));
    };
    target.addEventListener(eventName, onSuccess, { once: true });
    target.addEventListener("error", onError as EventListener, { once: true });
  });
}

async function optimizeVideoForWeb(file: File) {
  if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
    throw new Error("Formato de video no permitido. Usa MP4, WebM o MOV.");
  }

  if (file.size > MAX_ORIGINAL_VIDEO_SIZE) {
    throw new Error("El video original supera 160 MB. Reduce el archivo antes de subirlo.");
  }

  const sourceUrl = makeObjectUrl(file);
  const video = document.createElement("video");
  video.src = sourceUrl;
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";

  try {
    await waitForEvent(video, "loadedmetadata");

    const sourceWidth = video.videoWidth || 1;
    const sourceHeight = video.videoHeight || 1;
    const scale = Math.min(1, MAX_VIDEO_DIMENSION / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.max(2, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(2, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("No se pudo preparar la compresion del video.");
    }

    const stream = canvas.captureStream(24);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm";

    const bitsPerSecond = targetWidth >= 1200 ? 2_500_000 : targetWidth >= 900 ? 1_800_000 : 1_200_000;
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: bitsPerSecond,
    });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };

    const finished = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      recorder.onerror = () => reject(new Error("No se pudo comprimir el video."));
    });

    recorder.start(500);

    await video.play();

    await new Promise<void>((resolve) => {
      const drawFrame = () => {
        if (video.paused || video.ended) {
          resolve();
          return;
        }
        context.drawImage(video, 0, 0, targetWidth, targetHeight);
        requestAnimationFrame(drawFrame);
      };
      requestAnimationFrame(drawFrame);
      video.onended = () => resolve();
    });

    recorder.stop();
    const output = await finished;
    stream.getTracks().forEach((track) => track.stop());

    if (output.size > MAX_OPTIMIZED_VIDEO_SIZE) {
      throw new Error("El video optimizado sigue siendo muy pesado. Usa un video mas corto o ligero.");
    }

    return new File([output], replaceFileExtension(file.name, "webm"), {
      type: "video/webm",
      lastModified: Date.now(),
    });
  } finally {
    revokeObjectUrl(sourceUrl);
  }
}

function blockGroupFor(pageKey: string, label: string) {
  if (pageKey === "home") {
    if (label.startsWith("Hero")) return "Hero";
    if (label.startsWith("Beneficio")) return "Beneficios";
    if (label.startsWith("Sabor") || label.startsWith("Sabores")) return "Sabores";
    if (label.startsWith("Instagram")) return "Instagram";
    if (label.startsWith("CTA")) return "CTA final";
    if (label.startsWith("Suscripcion") || label.startsWith("Suscripción")) return "Suscripción";
  }

  if (pageKey === "nosotros") {
    if (label.startsWith("Hero")) return "Hero";
    if (label.startsWith("Que es Pormucha")) return "Qué es Pormucha";
    if (label.startsWith("Diferencia")) return "La diferencia Pormucha";
    if (label.startsWith("Origen")) return "El origen";
    if (label.startsWith("Kombucha")) return "Qué es la kombucha";
    if (label.startsWith("FAQ")) return "Preguntas frecuentes";
    if (label.startsWith("CTA")) return "CTA tienda";
    if (label.startsWith("Contacto")) return "Contacto";
  }

  if (pageKey === "tienda") {
    if (label.startsWith("Portada")) return "Hero";
    if (label.startsWith("Garantia")) return "Garantía";
    if (label.startsWith("FAQ tienda")) return "FAQ";
  }

  if (pageKey === "suscripciones") {
    if (label.startsWith("Hero")) return "Hero";
    if (label.startsWith("Habito")) return "Hábito";
    if (label.startsWith("Club titulo") || label.startsWith("Compra unica") || label.startsWith("Club pormucha")) return "Club Pormucha";
    if (label.startsWith("FAQ suscripciones")) return "FAQ";
    if (label.startsWith("CTA suscripciones")) return "CTA final";
  }

  return "Contenido";
}

function groupBlocks(pageKey: string, blocks: WebCmsBlock[]) {
  const groups: Array<{ title: string; blocks: WebCmsBlock[] }> = [];

  for (const block of blocks) {
    const title = blockGroupFor(pageKey, block.label);
    const currentGroup = groups[groups.length - 1];
    if (currentGroup?.title === title) {
      currentGroup.blocks.push(block);
    } else {
      groups.push({ title, blocks: [block] });
    }
  }

  return groups;
}

type BlockEditorCardProps = {
  pageKey: string;
  block: WebCmsBlock;
  onUpdate: (updater: (block: WebCmsBlock) => WebCmsBlock) => void;
};

function BlockEditorCard({ pageKey, block, onUpdate }: BlockEditorCardProps) {
  const [uploadingField, setUploadingField] = useState<"image" | "video" | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const resolvedImageUrl = previewImageUrl || resolveWebCmsAssetUrl(block.imageUrl);
  const resolvedVideoUrl = previewVideoUrl || resolveWebCmsAssetUrl(block.videoUrl);

  const uploadAsset = async (file: File, assetType: "image" | "video") => {
    setUploadingField(assetType);
    try {
      const preparedFile = assetType === "image" ? await optimizeImageForWeb(file) : await optimizeVideoForWeb(file);
      const previewUrl = makeObjectUrl(preparedFile);
      if (assetType === "image") {
        revokeObjectUrl(previewImageUrl);
        setPreviewImageUrl(previewUrl);
      } else {
        revokeObjectUrl(previewVideoUrl);
        setPreviewVideoUrl(previewUrl);
      }
      const response = await getWebCmsUploadUrl({
        filename: preparedFile.name,
        contentType: preparedFile.type,
        fileSize: preparedFile.size,
        pageKey,
        blockLabel: block.label,
        assetType,
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
        throw new Error(`No se pudo subir el archivo (${uploadResult.status}).`);
      }

      onUpdate((entry) => ({
        ...entry,
        [assetType === "image" ? "imageUrl" : "videoUrl"]: response.fileUrl,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo subir el archivo.";
      window.alert(message);
    } finally {
      setUploadingField(null);
    }
  };

  return (
    <article className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-slate-400">Bloque {block.order}</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{block.label}</h3>
        </div>
        <span className="inline-flex w-fit rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
          {block.type}
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {hasValue(block.title) ? (
          <Field label="Titulo">
            <input
              value={block.title}
              onChange={(e) => onUpdate((entry) => ({ ...entry, title: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
            />
          </Field>
        ) : null}

        {hasValue(block.subtitle) ? (
          <Field label="Subtitulo">
            <input
              value={block.subtitle}
              onChange={(e) => onUpdate((entry) => ({ ...entry, subtitle: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
            />
          </Field>
        ) : null}

        {hasValue(block.body) ? (
          <Field label="Contenido">
            <textarea
              value={block.body}
              onChange={(e) => onUpdate((entry) => ({ ...entry, body: e.target.value }))}
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
            />
          </Field>
        ) : null}

        {supportsMediaFields(block.type) && (hasValue(block.imageUrl) || hasValue(block.videoUrl)) ? (
          <>
            {hasValue(block.imageUrl) ? (
              <Field label="Imagen">
                <div className="space-y-3">
                  <input
                    value={block.imageUrl}
                    onChange={(e) => onUpdate((entry) => ({ ...entry, imageUrl: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                    placeholder="/ruta/imagen.jpg"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700 hover:border-slate-300">
                      {uploadingField === "image" ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />}
                      {uploadingField === "image" ? "Subiendo..." : "Subir imagen"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif"
                        className="hidden"
                        disabled={uploadingField !== null}
                        onChange={async (event) => {
                          const input = event.currentTarget;
                          const file = input.files?.[0];
                          if (file) await uploadAsset(file, "image");
                          input.value = "";
                        }}
                      />
                    </label>
                    {block.imageUrl ? (
                      <a
                        href={resolvedImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-slate-500 underline underline-offset-2"
                      >
                        Ver archivo
                      </a>
                    ) : null}
                  </div>
                  {resolvedImageUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
                      <Image
                        src={resolvedImageUrl}
                        alt={block.label}
                        width={1200}
                        height={640}
                        unoptimized
                        className="h-40 w-full rounded-xl object-cover"
                      />
                    </div>
                  ) : null}
                  <p className="text-xs text-slate-400">Se optimiza a WebP antes de subir. Maximo final: 2 MB y 2200 px.</p>
                </div>
              </Field>
            ) : null}

            {hasValue(block.videoUrl) ? (
              <Field label="Video">
                <div className="space-y-3">
                  <input
                    value={block.videoUrl}
                    onChange={(e) => onUpdate((entry) => ({ ...entry, videoUrl: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                    placeholder="/video.mp4"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700 hover:border-slate-300">
                      {uploadingField === "video" ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />}
                      {uploadingField === "video" ? "Subiendo..." : "Subir video"}
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        className="hidden"
                        disabled={uploadingField !== null}
                        onChange={async (event) => {
                          const input = event.currentTarget;
                          const file = input.files?.[0];
                          if (file) await uploadAsset(file, "video");
                          input.value = "";
                        }}
                      />
                    </label>
                    {block.videoUrl ? (
                      <a
                        href={resolvedVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-slate-500 underline underline-offset-2"
                      >
                        Ver archivo
                      </a>
                    ) : null}
                  </div>
                  {resolvedVideoUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
                      <video
                        src={resolvedVideoUrl}
                        controls
                        muted
                        playsInline
                        preload="metadata"
                        className="h-48 w-full rounded-xl bg-slate-950 object-cover"
                      />
                    </div>
                  ) : null}
                  <p className="text-xs text-slate-400">Se convierte a WebM antes de subir. Maximo final: 18 MB y 1280 px.</p>
                </div>
              </Field>
            ) : null}
          </>
        ) : null}

        {hasValue(block.buttonLabel) || hasValue(block.buttonHref) ? (
          <>
            {hasValue(block.buttonLabel) ? (
              <Field label="Texto boton">
                <input
                  value={block.buttonLabel}
                  onChange={(e) => onUpdate((entry) => ({ ...entry, buttonLabel: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                />
              </Field>
            ) : null}

            {hasValue(block.buttonHref) ? (
              <Field label="Destino boton">
                <input
                  value={block.buttonHref}
                  onChange={(e) => onUpdate((entry) => ({ ...entry, buttonHref: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                  placeholder="/tienda"
                />
              </Field>
            ) : null}
          </>
        ) : null}
      </div>
    </article>
  );
}

export function WebCmsManager({ initialConfig }: { initialConfig: WebCmsConfig }) {
  const [, startTransition] = useTransition();
  const [config, setConfig] = useState<WebCmsConfig>(initialConfig);
  const [selectedPageKey, setSelectedPageKey] = useState(initialConfig.pages[0]?.key ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const currentPage = useMemo(
    () => config.pages.find((page) => page.key === selectedPageKey) ?? config.pages[0],
    [config.pages, selectedPageKey]
  );

  const sortedBlocks = useMemo(() => sortBlocks(currentPage?.blocks ?? []), [currentPage?.blocks]);
  const groupedBlocks = useMemo(() => groupBlocks(currentPage?.key ?? "", sortedBlocks), [currentPage?.key, sortedBlocks]);

  const updateCurrentPage = (updater: (page: WebCmsPage) => WebCmsPage) => {
    if (!currentPage) return;
    setConfig((prev) => updatePage(prev, currentPage.key, updater));
  };

  const updateCurrentBlock = (blockId: string, updater: (block: WebCmsBlock) => WebCmsBlock) => {
    if (!currentPage) return;
    setConfig((prev) =>
      updatePage(prev, currentPage.key, (page) => ({
        ...page,
        blocks: page.blocks.map((block) => (block.id === blockId ? updater(block) : block)),
      }))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus("");
    const response = await saveWebCmsConfig(config);
    setSaving(false);
    setStatus(response.success ? "Cambios guardados correctamente." : response.error || "No se pudo guardar.");

    if (response.success) {
      startTransition(() => {
        setConfig((prev) => ({
          ...prev,
          updatedAt: new Date().toISOString(),
        }));
      });
    }
  };

  if (!currentPage) {
    return (
      <div className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">No hay paginas CMS cargadas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Diseno web</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">CMS modular para toda la web</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Edita paginas, bloques, imagenes, textos y llamadas a la accion sin tocar la estructura de las vistas.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300"
          >
            <Save size={16} />
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p>Esquema: pagina, bloques y campos. El diseño base se mantiene fijo.</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-950">Paginas</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{config.pages.length}</span>
          </div>

          <div className="mt-4 space-y-2">
            {config.pages.map((page) => {
              const active = page.key === selectedPageKey;
              return (
                <button
                  key={page.key}
                  type="button"
                  onClick={() => setSelectedPageKey(page.key)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-black uppercase tracking-[0.22em] ${active ? "text-white/60" : "text-slate-400"}`}>{page.route}</p>
                      <h3 className="mt-1 text-base font-black">{page.title}</h3>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                        page.isPublished ? (active ? "bg-white text-slate-950" : "bg-emerald-100 text-emerald-700") : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {page.isPublished ? "Publicado" : "Borrador"}
                    </span>
                  </div>
                  <p className={`mt-2 text-xs leading-5 ${active ? "text-white/70" : "text-slate-500"}`}>{page.description}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Pagina seleccionada</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{currentPage.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{currentPage.route}</p>
              </div>

              <label className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
                <span className="text-sm font-semibold text-slate-700">Publicada</span>
                <input
                  type="checkbox"
                  checked={currentPage.isPublished}
                  onChange={(e) =>
                    setConfig((prev) =>
                      updatePage(prev, currentPage.key, (page) => ({
                        ...page,
                        isPublished: e.target.checked,
                      }))
                    )
                  }
                  className="h-4 w-4 accent-slate-950"
                />
              </label>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Titulo de pagina">
                <input
                  value={currentPage.title}
                  onChange={(e) => updateCurrentPage((page) => ({ ...page, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                />
              </Field>

              <Field label="SEO title">
                <input
                  value={currentPage.seoTitle}
                  onChange={(e) => updateCurrentPage((page) => ({ ...page, seoTitle: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                />
              </Field>

              <Field label="Descripcion">
                <textarea
                  value={currentPage.description}
                  onChange={(e) => updateCurrentPage((page) => ({ ...page, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                />
              </Field>

              <Field label="SEO description">
                <textarea
                  value={currentPage.seoDescription}
                  onChange={(e) => updateCurrentPage((page) => ({ ...page, seoDescription: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Bloques</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">Contenido editable</h3>
              <p className="mt-1 text-sm text-slate-500">Sólo texto, imágenes, videos y botones según corresponda.</p>
            </div>

            <div className="mt-6 space-y-6">
              {sortedBlocks.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  Esta pagina aun no tiene bloques configurados.
                </p>
              ) : (
                groupedBlocks.map((group) => (
                  <section key={group.title} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500">{group.title}</h4>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                    {group.blocks.map((block) => (
                      <BlockEditorCard
                        key={block.id}
                        pageKey={currentPage.key}
                        block={block}
                        onUpdate={(updater) => updateCurrentBlock(block.id, updater)}
                      />
                    ))}
                  </section>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 shadow-sm">
            <p className="font-semibold text-slate-900">Modo CMS seguro</p>
            <p className="mt-2 leading-6">
              La idea es que después cada página pública lea este contenido y pinte bloques validados. Así el diseño se mantiene estable aunque cambie el texto o las imágenes.
            </p>
          </div>
        </section>
      </section>

      {status ? <p className="text-sm font-semibold text-slate-700">{status}</p> : null}
    </div>
  );
}
