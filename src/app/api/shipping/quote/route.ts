// src/app/api/shipping/quote/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { zip } = await request.json();

    // Lógica básica para pruebas:
    // Si el CP empieza con "0", el envío cuesta 100, si no, 150.
    const rate = zip.startsWith("0") ? 100 : 150; 

    return NextResponse.json({ rate });
  } catch (error) {
    console.error("Error en cotización de envío:", error);
    return NextResponse.json({ error: "No se pudo cotizar" }, { status: 500 });
  }
}