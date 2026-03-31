import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // LOG EN TU TERMINAL (Donde corres el npm run dev)
        console.log("RECIBIDO EN API:", {
            method: body.paymentMethod,
            status: body.status
        });

        const result = await db.$transaction(async (tx) => {
            const order = await tx.order.create({
                data: {
                    channel: "POS",
                    status: body.status, // <--- Usa directamente el status del body
                    paymentMethod: body.paymentMethod,
                    total: body.total,
                    subtotal: body.total,
                    locationId: body.locationId,
                    clientId: body.clientId || null,
                    fullName: body.fullName || "Cliente Mostrador",
                    email: body.email || "",
                    orderItems: {
                        create: body.items.map((item: any) => ({
                            productId: item.productId || null,
                            flavorId: item.flavorId || null,
                            productName: item.name,
                            quantity: item.quantity,
                            unitPrice: item.price,
                            subtotal: item.price * item.quantity,
                            composition: item.composition ? {
                                create: item.composition.map((c: any) => ({
                                    flavorId: c.flavorId,
                                    quantity: c.quantity
                                }))
                            } : undefined
                        }))
                    }
                }
            });

            // Descuento de inventario simplificado
            for (const item of body.items) {
                if (item.composition) {
                    for (const comp of item.composition) {
                        await tx.stock.update({
                            where: { flavorId_locationId: { flavorId: comp.flavorId, locationId: body.locationId } },
                            data: { quantity: { decrement: comp.quantity * item.quantity } }
                        });
                    }
                }
            }
            return order;
        });

        // ✅ FIX DEFINITIVO PARA EL ERROR: 
        // No devolvemos el objeto "result" porque tiene Decimals que rompen la API.
        // Devolvemos un objeto plano y simple.
        return NextResponse.json({
            success: true,
            orderId: result.id,
            finalStatus: result.status
        });

    } catch (error: any) {
        console.error("DETALLE DEL ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}