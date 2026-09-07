import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function parseDateRange(request: NextRequest) {
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  if (!fromParam || !toParam) {
    return { error: "Faltan fechas." as const };
  }

  const from = new Date(`${fromParam}T00:00:00.000`);
  const to = new Date(`${toParam}T23:59:59.999`);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return { error: "Rango de fechas invalido." as const };
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

type PdfLine = {
  text: string;
  size?: number;
  x?: number;
  gap?: number;
  font?: "regular" | "bold";
  color?: [number, number, number];
};

function createSalesReportPdf(lines: PdfLine[]) {
  const width = 612;
  const height = 792;
  let y = 596;
  const commands: string[] = [];
  const setFill = ([r, g, b]: [number, number, number]) => `${r} ${g} ${b} rg`;
  const rect = (x: number, rectY: number, w: number, h: number, color: [number, number, number]) => {
    commands.push(`${setFill(color)} ${x} ${rectY} ${w} ${h} re f`);
  };
  const text = (value: string, x: number, textY: number, size: number, font: "regular" | "bold", color: [number, number, number]) => {
    commands.push(`${setFill(color)} BT /${font === "bold" ? "F2" : "F1"} ${size} Tf ${x} ${textY} Td (${escapePdfText(value)}) Tj ET`);
  };

  rect(0, 0, width, height, [0.98, 0.99, 1]);
  rect(32, 638, 548, 112, [0.02, 0.04, 0.1]);
  rect(48, 616, 120, 6, [0.06, 0.72, 0.51]);
  text("PORMUCHA ERP", 52, 714, 10, "bold", [0.65, 0.72, 0.82]);
  text("Reporte de ventas", 52, 684, 28, "bold", [1, 1, 1]);
  text("Insights comerciales por rango de fechas", 52, 660, 12, "regular", [0.82, 0.87, 0.94]);

  for (const line of lines) {
    const size = line.size || 11;
    const x = line.x || 48;
    const currentY = y;
    y -= line.gap || size + 8;
    text(line.text, x, currentY, size, line.font || "regular", line.color || [0.08, 0.11, 0.18]);
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

  if (role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const range = parseDateRange(request);
  if ("error" in range) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }

  const orders = await db.order.findMany({
    where: {
      status: { not: "CANCELLED" },
      createdAt: {
        gte: range.from,
        lte: range.to,
      },
    },
    select: {
      id: true,
      channel: true,
      total: true,
      clientId: true,
      fullName: true,
      subscriptionId: true,
      client: { select: { id: true, fullName: true, classification: true } },
      orderItems: {
        select: {
          quantity: true,
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
  });

  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const webRevenue = orders.filter((order) => order.channel !== "POS").reduce((sum, order) => sum + Number(order.total || 0), 0);
  const posRevenue = orders.filter((order) => order.channel === "POS").reduce((sum, order) => sum + Number(order.total || 0), 0);
  const subscriptionRevenue = orders.filter((order) => order.subscriptionId).reduce((sum, order) => sum + Number(order.total || 0), 0);
  const averageTicket = orders.length > 0 ? totalRevenue / orders.length : 0;
  const flavorSalesMap = new Map<string, { name: string; units: number; orders: Set<string> }>();
  const clientSalesMap = new Map<string, { name: string; classification: string; total: number; orders: number }>();

  for (const order of orders) {
    const clientKey = order.clientId || order.fullName || "";
    if (clientKey) {
      const current = clientSalesMap.get(clientKey) || {
        name: order.client?.fullName || order.fullName || "Cliente sin nombre",
        classification: order.client?.classification || "-",
        total: 0,
        orders: 0,
      };
      current.total += Number(order.total || 0);
      current.orders += 1;
      clientSalesMap.set(clientKey, current);
    }

    for (const item of order.orderItems) {
      if (item.composition.length > 0) {
        for (const component of item.composition) {
          const flavor = component.flavor;
          const current = flavorSalesMap.get(flavor.id) || { name: flavor.name, units: 0, orders: new Set<string>() };
          current.units += Number(item.quantity || 0) * Number(component.quantity || 0);
          current.orders.add(order.id);
          flavorSalesMap.set(flavor.id, current);
        }
        continue;
      }

      if (item.flavorId && item.flavor) {
        const current = flavorSalesMap.get(item.flavorId) || { name: item.flavor.name, units: 0, orders: new Set<string>() };
        current.units += Number(item.quantity || 0);
        current.orders.add(order.id);
        flavorSalesMap.set(item.flavorId, current);
      }
    }
  }

  const flavorSales = Array.from(flavorSalesMap.values())
    .map((entry) => ({ name: entry.name, units: entry.units, ordersCount: entry.orders.size }))
    .sort((a, b) => b.units - a.units);
  const mostSoldFlavor = flavorSales[0] || null;
  const leastSoldFlavor = flavorSales.length > 0 ? flavorSales[flavorSales.length - 1] : null;
  const topClient = Array.from(clientSalesMap.values()).sort((a, b) => b.total - a.total)[0] || null;

  const lines: PdfLine[] = [
    { text: `Rango analizado: ${range.fromParam} a ${range.toParam}`, size: 11, font: "bold", color: [0.25, 0.32, 0.44], gap: 20 },
    { text: `Generado: ${new Date().toLocaleString("es-MX")}`, size: 9, color: [0.45, 0.52, 0.62], gap: 34 },
    { text: "Resumen ejecutivo", size: 17, font: "bold", gap: 28 },
    { text: `Ventas totales     ${money(totalRevenue)}`, size: 14, font: "bold", x: 62, gap: 24 },
    { text: `Ordenes            ${orders.length.toLocaleString("es-MX")}`, x: 62, gap: 20 },
    { text: `Ticket promedio    ${money(averageTicket)}`, x: 62, gap: 20 },
    { text: `Web                ${money(webRevenue)}`, x: 62, gap: 20 },
    { text: `POS                ${money(posRevenue)}`, x: 62, gap: 20 },
    { text: `Suscripcion        ${money(subscriptionRevenue)}`, x: 62, gap: 36 },
    { text: "Cliente destacado", size: 17, font: "bold", gap: 28 },
    {
      text: topClient
        ? `${topClient.name} - ${money(topClient.total)} en ${topClient.orders} ordenes`
        : "Sin cliente destacado en este rango",
      size: 12,
      font: "bold",
      x: 62,
      gap: 24,
    },
    {
      text: topClient ? `Clasificacion: ${topClient.classification}` : "",
      size: 10,
      color: [0.45, 0.52, 0.62],
      x: 62,
      gap: 36,
    },
    { text: "Sabores", size: 17, font: "bold", gap: 28 },
    {
      text: mostSoldFlavor
        ? `Mas vendido      ${mostSoldFlavor.name} - ${mostSoldFlavor.units.toLocaleString("es-MX")} botellas en ${mostSoldFlavor.ordersCount} pedidos`
        : "Mas vendido: sin ventas por sabor",
      x: 62,
      font: "bold",
      gap: 22,
    },
    {
      text: leastSoldFlavor
        ? `Menos vendido    ${leastSoldFlavor.name} - ${leastSoldFlavor.units.toLocaleString("es-MX")} botellas en ${leastSoldFlavor.ordersCount} pedidos`
        : "Menos vendido: sin ventas por sabor",
      x: 62,
      gap: 36,
    },
    { text: "Top sabores", size: 17, font: "bold", gap: 28 },
    ...(flavorSales.slice(0, 8).length > 0
      ? flavorSales.slice(0, 8).map((flavor, index) => ({
          text: `${index + 1}. ${flavor.name} - ${flavor.units.toLocaleString("es-MX")} botellas - ${flavor.ordersCount} pedidos`,
          x: 62,
        }))
      : [{ text: "Sin sabores vendidos en este rango.", x: 62 }]),
  ];

  const pdf = createSalesReportPdf(lines);
  const filename = `reporte-ventas-${range.fromParam}-a-${range.toParam}.pdf`;

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
