"use server";

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { normalizeWebCmsConfig, type WebCmsConfig } from "@/lib/web-cms";
import { getPresignedUploadUrl } from "@/lib/s3";

const PUBLIC_PATHS = [
  "/",
  "/home",
  "/landing",
  "/nosotros",
  "/tienda",
  "/suscripciones",
  "/contacto",
  "/politica-de-privacidad",
  "/politica-de-reembolso",
  "/politica-de-envio",
  "/politica-de-cancelacion",
  "/terminos-del-servicio",
  "/admin/web-design",
  "/admin",
];

export async function saveWebCmsConfig(config: WebCmsConfig) {
  const { sessionClaims } = await auth();
  const metadata = sessionClaims?.metadata as { role?: string } | undefined;
  const role = metadata?.role;
  if (role !== "admin") return { success: false, error: "No autorizado" };

  const normalized = normalizeWebCmsConfig(config);
  const payload = JSON.stringify({
    ...normalized,
    updatedAt: new Date().toISOString(),
  });

  await db.systemSetting.upsert({
    where: { key: "web_cms" },
    create: { key: "web_cms", value: payload },
    update: { value: payload },
  });

  for (const path of PUBLIC_PATHS) {
    revalidatePath(path);
  }

  return { success: true };
}

function sanitizeKeyPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "asset";
}

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export async function getWebCmsUploadUrl(input: {
  filename: string;
  contentType: string;
  fileSize: number;
  pageKey: string;
  blockLabel: string;
  assetType: "image" | "video";
}) {
  const { sessionClaims } = await auth();
  const metadata = sessionClaims?.metadata as { role?: string } | undefined;
  const role = metadata?.role;
  if (role !== "admin") return { success: false as const, error: "No autorizado" };

  const allowedTypes = input.assetType === "image" ? IMAGE_TYPES : VIDEO_TYPES;
  const maxSize = input.assetType === "image" ? 2 * 1024 * 1024 : 80 * 1024 * 1024;

  if (!allowedTypes.has(input.contentType)) {
    return { success: false as const, error: `Tipo de ${input.assetType} no permitido.` };
  }

  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0 || input.fileSize > maxSize) {
    return {
      success: false as const,
      error: input.assetType === "image"
        ? "La imagen supera el limite permitido de 2 MB."
        : "El video supera el limite permitido de 80 MB.",
    };
  }

  const ext = input.filename.includes(".") ? input.filename.split(".").pop() : undefined;
  const safeExt = sanitizeKeyPart(ext || input.contentType.split("/")[1] || "bin");
  const key = [
    "web",
    input.assetType === "image" ? "images" : "videos",
    sanitizeKeyPart(input.pageKey),
    `${Date.now()}-${sanitizeKeyPart(input.blockLabel)}.${safeExt}`,
  ].join("/");

  const upload = await getPresignedUploadUrl(key, input.contentType);
  return {
    success: true as const,
    signedUrl: upload.signedUrl,
    fileUrl: upload.fileUrl,
  };
}
