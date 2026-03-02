import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { name, email, phone } = await req.json();

        // Cambiamos 'subscriber' por 'lead' para que coincida con tu schema.prisma
        const subscriber = await db.lead.create({
            data: { name, email, phone }
        });

        return NextResponse.json(subscriber);
    } catch (error) {
        console.error("Error detallado:", error); // Esto te ayudará a ver qué pasa en la terminal
        return NextResponse.json({ error: "Error al suscribirse" }, { status: 500 });
    }
}