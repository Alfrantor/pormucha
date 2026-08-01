import { NextResponse } from "next/server";
import { getShippingConfig } from "@/lib/shipping-config";

export async function GET(_: Request, context: { params: Promise<{ tracking: string }> }) {
  const { tracking } = await context.params;
  const config = await getShippingConfig();
  const apiToken = config.apiToken.trim();

  if (!apiToken) {
    return NextResponse.json({ error: "Falta configurar el token API de EnvíosPerros." }, { status: 400 });
  }

  const response = await fetch(
    `https://app.enviosperros.com/api/v3/labels/${encodeURIComponent(tracking)}/download?documentSize=letter`,
    {
      method: "GET",
      headers: {
        Accept: "application/pdf, application/json",
        Authorization: `Bearer ${apiToken}`,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { error: text || "No se pudo descargar la guía de EnvíosPerros." },
      { status: response.status }
    );
  }

  const contentType = response.headers.get("content-type") || "application/pdf";
  const fileBuffer = await response.arrayBuffer();

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="guia-${tracking}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
