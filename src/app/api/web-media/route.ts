import { NextRequest, NextResponse } from "next/server";
import { getPresignedDownloadUrl } from "@/lib/s3";

function isAllowedS3Url(value: string) {
  const bucket = process.env.AWS_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  if (!bucket || !region) return false;

  const allowedPrefix = `https://${bucket}.s3.${region}.amazonaws.com/`;
  return value.startsWith(allowedPrefix);
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src");
  if (!src) {
    return NextResponse.json({ error: "Falta el origen del archivo." }, { status: 400 });
  }

  if (!isAllowedS3Url(src)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 400 });
  }

  try {
    const signedUrl = await getPresignedDownloadUrl(src);
    return NextResponse.redirect(signedUrl, { status: 307 });
  } catch {
    return NextResponse.json({ error: "No se pudo obtener el archivo." }, { status: 500 });
  }
}
