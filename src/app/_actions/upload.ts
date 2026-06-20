"use server";

import { getPresignedUploadUrl, getPresignedDownloadUrl } from "@/lib/s3";
import { auth } from "@clerk/nextjs/server";

async function requireAdminOrVendedor() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;
  if (role !== "admin" && role !== "vendedor") throw new Error("No autorizado");
}

export async function getUploadUrl(
  filename: string,
  contentType: string,
  folder: "facturas" | "comprobantes"
): Promise<{ signedUrl: string; fileUrl: string; error?: never } | { error: string; signedUrl?: never; fileUrl?: never }> {
  try {
    await requireAdminOrVendedor();
    const ext = filename.split(".").pop() ?? "bin";
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    return await getPresignedUploadUrl(key, contentType);
  } catch (err: any) {
    return { error: err.message ?? "Error al generar URL de subida" };
  }
}

export async function getDownloadUrl(fileUrl: string): Promise<{ url: string } | { error: string }> {
  try {
    await requireAdminOrVendedor();
    const url = await getPresignedDownloadUrl(fileUrl);
    return { url };
  } catch (err: any) {
    return { error: err.message ?? "Error al generar URL de descarga" };
  }
}
