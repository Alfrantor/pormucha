import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type PdfLine = {
  text: string;
  size?: number;
  x?: number;
  gap?: number;
  font?: "regular" | "bold";
  color?: [number, number, number];
};

type PosReportOrder = {
  id: string;
  folio: string | null;
  createdAt: Date;
  total: unknown;
  fullName: string | null;
};

function parseDateRange(request: NextRequest) {
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  if (!fromParam || !toParam) {
    return { error: "Faltan fechas." as const };
  }

  const from = new Date(`${fromParam}T00:00:00.000`);
  const to = new Date(`${toParam}T23:59:59.999`);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return { error: "Rango de fechas inválido." as const };
  }

  return { from, to, fromParam, toParam };
}

function money(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function cleanPdfText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: string) {
  return cleanPdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function truncateText(value: string, maxLength: number) {
  const clean = cleanPdfText(value);
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}.` : clean;
}

function createPosSalesPdf(lines: PdfLine[], orders: PosReportOrder[]) {
  const width = 612;
  const height = 792;
  let y = 602;
  const commands: string[] = [];
  const setFill = ([r, g, b]: [number, number, number]) => `${r} ${g} ${b} rg`;
  const rect = (x: number, rectY: number, w: number, h: number, color: [number, number, number]) => {
    commands.push(`${setFill(color)} ${x} ${rectY} ${w} ${h} re f`);
  };
  const text = (value: string, x: number, textY: number, size: number, font: "regular" | "bold", color: [number, number, number]) => {
    commands.push(`${setFill(color)} BT /${font === "bold" ? "F2" : "F1"} ${size} Tf ${x} ${textY} Td (${escapePdfText(value)}) Tj ET`);
  };

  rect(0, 0, width, height, [0.97, 0.98, 1]);
  rect(32, 650, 548, 98, [0.02, 0.04, 0.1]);
  rect(48, 630, 118, 5, [0.31, 0.22, 0.86]);
  text("PORMUCHA ERP", 52, 718, 9, "bold", [0.65, 0.72, 0.82]);
  text("Reporte POS", 52, 692, 24, "bold", [1, 1, 1]);
  text("Ventas de caja por rango de fechas", 52, 670, 10, "regular", [0.82, 0.87, 0.94]);

  for (const line of lines) {
    const size = line.size || 9;
    const x = line.x || 48;
    text(line.text, x, y, size, line.font || "regular", line.color || [0.08, 0.11, 0.18]);
    y -= line.gap || size + 6;
  }

  y -= 4;
  text("Detalle de ordenes", 48, y, 13, "bold", [0.08, 0.11, 0.18]);
  y -= 18;
  rect(44, y - 8, 524, 18, [0.91, 0.94, 0.98]);
  text("Folio / ID", 52, y - 2, 7, "bold", [0.25, 0.32, 0.44]);
  text("Fecha", 154, y - 2, 7, "bold", [0.25, 0.32, 0.44]);
  text("Cliente", 260, y - 2, 7, "bold", [0.25, 0.32, 0.44]);
  text("Total", 510, y - 2, 7, "bold", [0.25, 0.32, 0.44]);
  y -= 24;

  const visibleOrders = orders.slice(0, 24);
  for (const order of visibleOrders) {
    if (y < 42) break;
    text(order.folio || `#${order.id.slice(-6).toUpperCase()}`, 52, y, 7, "regular", [0.08, 0.11, 0.18]);
    text(order.createdAt.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }), 154, y, 7, "regular", [0.08, 0.11, 0.18]);
    text(truncateText(order.fullName || "Sin nombre", 34), 260, y, 7, "regular", [0.08, 0.11, 0.18]);
    text(money(Number(order.total || 0)), 510, y, 7, "bold", [0.08, 0.11, 0.18]);
    y -= 14;
  }

  if (orders.length > visibleOrders.length && y >= 42) {
    text(`Se muestran ${visibleOrders.length} de ${orders.length} ordenes. Exporta Excel para ver el detalle completo.`, 52, y - 2, 7, "regular", [0.45, 0.52, 0.62]);
  }

  const content = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "ascii");
}

export async function GET(request: NextRequest) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;

  if (role !== "admin" && role !== "vendedor") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const range = parseDateRange(request);
  if ("error" in range) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }

  const orders = await db.order.findMany({
    where: {
      channel: "POS",
      status: { not: "CANCELLED" },
      createdAt: {
        gte: range.from,
        lte: range.to,
      },
    },
    select: {
      id: true,
      folio: true,
      createdAt: true,
      total: true,
      paymentMethod: true,
      fullName: true,
      sellerId: true,
      location: { select: { name: true } },
      orderItems: {
        select: {
          productName: true,
          quantity: true,
          subtotal: true,
          flavorId: true,
          flavor: { select: { id: true, name: true } },
          composition: {
            select: {
              quantity: true,
              flavor: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const averageTicket = orders.length > 0 ? totalRevenue / orders.length : 0;
  const paymentMap = new Map<string, { method: string; total: number; orders: number }>();
  const flavorMap = new Map<string, { name: string; units: number; orders: Set<string> }>();
  const sellerMap = new Map<string, { name: string; total: number; orders: number }>();

  for (const order of orders) {
    const method = order.paymentMethod || "Sin método";
    const payment = paymentMap.get(method) || { method, total: 0, orders: 0 };
    payment.total += Number(order.total || 0);
    payment.orders += 1;
    paymentMap.set(method, payment);

    const seller = order.sellerId || "Sin vendedor";
    const sellerEntry = sellerMap.get(seller) || { name: seller, total: 0, orders: 0 };
    sellerEntry.total += Number(order.total || 0);
    sellerEntry.orders += 1;
    sellerMap.set(seller, sellerEntry);

    for (const item of order.orderItems) {
      if (item.composition.length > 0) {
        for (const component of item.composition) {
          const flavor = component.flavor;
          const current = flavorMap.get(flavor.id) || { name: flavor.name, units: 0, orders: new Set<string>() };
          current.units += Number(item.quantity || 0) * Number(component.quantity || 0);
          current.orders.add(order.id);
          flavorMap.set(flavor.id, current);
        }
        continue;
      }

      const key = item.flavorId || item.productName;
      const name = item.flavor?.name || item.productName;
      const current = flavorMap.get(key) || { name, units: 0, orders: new Set<string>() };
      current.units += Number(item.quantity || 0);
      current.orders.add(order.id);
      flavorMap.set(key, current);
    }
  }

  const paymentBreakdown = Array.from(paymentMap.values()).sort((a, b) => b.total - a.total);
  const flavorSales = Array.from(flavorMap.values())
    .map((entry) => ({ name: entry.name, units: entry.units, ordersCount: entry.orders.size }))
    .sort((a, b) => b.units - a.units);
  const topSeller = Array.from(sellerMap.values()).sort((a, b) => b.total - a.total)[0] || null;
  const bestFlavor = flavorSales[0] || null;

  const lines: PdfLine[] = [
    { text: `Rango analizado: ${range.fromParam} a ${range.toParam}`, size: 9, font: "bold", color: [0.25, 0.32, 0.44], gap: 16 },
    { text: `Generado: ${new Date().toLocaleString("es-MX")}`, size: 8, color: [0.45, 0.52, 0.62], gap: 24 },
    { text: "Resumen de caja", size: 13, font: "bold", gap: 20 },
    { text: `Ventas POS        ${money(totalRevenue)}`, size: 11, font: "bold", x: 62, gap: 16 },
    { text: `Pedidos           ${orders.length.toLocaleString("es-MX")}`, x: 62, gap: 14 },
    { text: `Ticket promedio   ${money(averageTicket)}`, x: 62, gap: 20 },
    {
      text: topSeller ? `Vendedor destacado: ${topSeller.name} - ${money(topSeller.total)} en ${topSeller.orders} pedidos` : "Vendedor destacado: sin ventas",
      x: 62,
      font: "bold",
      gap: 22,
    },
    { text: "Metodo de pago", size: 13, font: "bold", gap: 18 },
    ...(paymentBreakdown.length > 0
      ? paymentBreakdown.slice(0, 4).map((entry) => ({
          text: `${entry.method}: ${money(entry.total)} - ${entry.orders} pedidos`,
          x: 62,
          gap: 14,
        }))
      : [{ text: "Sin pagos registrados.", x: 62, gap: 14 }]),
    { text: "Producto / sabor mas vendido", size: 13, font: "bold", gap: 18 },
    {
      text: bestFlavor ? `${bestFlavor.name} - ${bestFlavor.units.toLocaleString("es-MX")} unidades en ${bestFlavor.ordersCount} pedidos` : "Sin ventas por producto o sabor.",
      x: 62,
      font: "bold",
      gap: 22,
    },
    { text: "Top ventas", size: 13, font: "bold", gap: 18 },
    ...(flavorSales.slice(0, 4).length > 0
      ? flavorSales.slice(0, 4).map((flavor, index) => ({
          text: `${index + 1}. ${flavor.name} - ${flavor.units.toLocaleString("es-MX")} unidades - ${flavor.ordersCount} pedidos`,
          x: 62,
          gap: 14,
        }))
      : [{ text: "Sin productos vendidos en este rango.", x: 62, gap: 14 }]),
  ];

  const pdf = createPosSalesPdf(lines, orders);
  const filename = `reporte-pos-${range.fromParam}-a-${range.toParam}.pdf`;

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
