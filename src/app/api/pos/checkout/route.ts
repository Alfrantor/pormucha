import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

function buildFolioPrefix(date: Date): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear() % 100;
  return `${month}${year}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const isCourtesy = body.paymentMethod === "COURTESY";
    const isCreditSale = body.isPaid === false || body.paymentMethod === "CONSIGNMENT";
    const recordedTotal = isCourtesy ? 0 : (body.total ?? 0);
    const recordedSubtotal = body.originalTotal ?? recordedTotal;

    const result = await db.$transaction(async (tx) => {
      const client = body.clientId
        ? await (tx as any).client.findUnique({
            where: { id: body.clientId },
            select: { id: true, creditLimit: true, creditUsed: true, paymentTerms: true },
          })
        : null;

      if (isCreditSale) {
        if (!client) {
          throw new Error("Debes seleccionar un cliente para vender a credito.");
        }
      }

      const now = new Date();
      const prefix = buildFolioPrefix(now);

      const lastOrder = await (tx as any).order.findFirst({
        where: { folio: { startsWith: prefix } },
        orderBy: { folio: "desc" },
        select: { folio: true },
      });

      let consecutive = 1;
      if (lastOrder?.folio) {
        const lastNum = parseInt(lastOrder.folio.slice(prefix.length), 10);
        if (!isNaN(lastNum)) consecutive = lastNum + 1;
      }

      const folio = `${prefix}${consecutive.toString().padStart(3, "0")}`;

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
          isPaid: body.isPaid ?? true,
          orderItems: {
            create: body.items.map((item: any) => ({
              productId: item.productId || null,
              flavorId: item.flavorId || null,
              productName: item.name,
              quantity: item.quantity,
              unitPrice: isCourtesy ? 0 : item.price,
              subtotal: isCourtesy ? 0 : item.price * item.quantity,
              composition: item.composition
                ? { create: item.composition.map((c: any) => ({ flavorId: c.flavorId, quantity: c.quantity })) }
                : undefined,
            })),
          },
        },
      });

      if (isCreditSale && client) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (client.paymentTerms || 30));

        const existingCredit = await (tx as any).credit.findUnique({
          where: { orderId: order.id },
        });

        if (!existingCredit) {
          await (tx as any).credit.create({
            data: {
              clientId: client.id,
              orderId: order.id,
              amount: new Decimal(recordedTotal),
              dueDate,
              status: "PENDING",
              notes: `Venta a credito POS - Folio ${order.folio}`,
            },
          });
        }

        await (tx as any).client.update({
          where: { id: client.id },
          data: {
            creditUsed: { increment: new Decimal(recordedTotal) },
          },
        });
      }

      for (const item of body.items) {
        if (item.composition) {
          for (const comp of item.composition) {
            await tx.stock.update({
              where: { flavorId_locationId: { flavorId: comp.flavorId, locationId: body.locationId } },
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
      folio: result.folio,
      finalStatus: result.status,
    });
  } catch (error: any) {
    console.error("POS checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
