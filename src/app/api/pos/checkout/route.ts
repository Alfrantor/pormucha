import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const isCourtesy = body.paymentMethod === "COURTESY";
    const recordedTotal = isCourtesy ? 0 : (body.total ?? 0);
    const recordedSubtotal = body.originalTotal ?? recordedTotal;

    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          channel: "POS",
          status: body.status,
          paymentMethod: body.paymentMethod,
          total: recordedTotal,
          subtotal: recordedSubtotal,
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
              unitPrice: isCourtesy ? 0 : item.price,
              subtotal: isCourtesy ? 0 : item.price * item.quantity,
              composition: item.composition
                ? {
                    create: item.composition.map((c: any) => ({
                      flavorId: c.flavorId,
                      quantity: c.quantity,
                    })),
                  }
                : undefined,
            })),
          },
        },
      });

      // Decrement inventory for every method (including COURTESY — product still leaves)
      for (const item of body.items) {
        if (item.composition) {
          for (const comp of item.composition) {
            await tx.stock.update({
              where: {
                flavorId_locationId: {
                  flavorId: comp.flavorId,
                  locationId: body.locationId,
                },
              },
              data: { quantity: { decrement: comp.quantity * item.quantity } },
            });
          }
        }
      }

      return order;
    });

    return NextResponse.json({
      success: true,
      orderId: result.id,
      finalStatus: result.status,
    });
  } catch (error: any) {
    console.error("POS checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
