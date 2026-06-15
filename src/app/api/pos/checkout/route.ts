import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function buildFolioPrefix(date: Date): string {
  const month = date.getMonth() + 1;          // 1-12, sin cero
  const year  = date.getFullYear() % 100;     // últimos 2 dígitos
  return `${month}${year}`;                   // ej. "626" para junio 2026
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const isCourtesy = body.paymentMethod === "COURTESY";
    const recordedTotal    = isCourtesy ? 0 : (body.total ?? 0);
    const recordedSubtotal = body.originalTotal ?? recordedTotal;

    const result = await db.$transaction(async (tx) => {
      // ── Generar folio consecutivo por mes/año ─────────────────────────────
      const now    = new Date();
      const prefix = buildFolioPrefix(now);

      // Buscar el último folio de este mes (orden desc por folio string, ej. "626003")
      const lastOrder = await (tx as any).order.findFirst({
        where:   { folio: { startsWith: prefix } },
        orderBy: { folio: "desc" },
        select:  { folio: true },
      });

      let consecutive = 1;
      if (lastOrder?.folio) {
        const lastNum = parseInt(lastOrder.folio.slice(prefix.length), 10);
        if (!isNaN(lastNum)) consecutive = lastNum + 1;
      }

      const folio = `${prefix}${consecutive.toString().padStart(3, "0")}`;

      // ── Crear la orden ────────────────────────────────────────────────────
      const order = await (tx as any).order.create({
        data: {
          channel: "POS",
          status: body.status,
          paymentMethod: body.paymentMethod,
          total: recordedTotal,
          subtotal: recordedSubtotal,
          locationId: body.locationId,
          clientId: body.clientId || null,
          fullName: body.fullName || null,
          email: body.email || "",
          folio,
          requiresInvoice: body.requiresInvoice ?? false,
          orderItems: {
            create: body.items.map((item: any) => ({
              productId: item.productId || null,
              flavorId:  item.flavorId  || null,
              productName: item.name,
              quantity:    item.quantity,
              unitPrice:   isCourtesy ? 0 : item.price,
              subtotal:    isCourtesy ? 0 : item.price * item.quantity,
              composition: item.composition
                ? { create: item.composition.map((c: any) => ({ flavorId: c.flavorId, quantity: c.quantity })) }
                : undefined,
            })),
          },
        },
      });

      // ── Decrementar inventario ────────────────────────────────────────────
      for (const item of body.items) {
        if (item.composition) {
          for (const comp of item.composition) {
            await tx.stock.update({
              where: { flavorId_locationId: { flavorId: comp.flavorId, locationId: body.locationId } },
              data:  { quantity: { decrement: comp.quantity * item.quantity } },
            });
          }
        }
      }

      return order;
    });

    return NextResponse.json({
      success:     true,
      orderId:     result.id,
      folio:       result.folio,
      finalStatus: result.status,
    });
  } catch (error: any) {
    console.error("POS checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
