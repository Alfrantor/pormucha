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

function percent(value: number) {
  return `${Math.round(value)}%`;
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

function createWebReportPdf(lines: PdfLine[]) {
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
  rect(48, 616, 120, 6, [0.02, 0.52, 0.84]);
  text("PORMUCHA WEBSITE", 52, 714, 10, "bold", [0.65, 0.77, 0.9]);
  text("Reporte Web", 52, 684, 28, "bold", [1, 1, 1]);
  text("Ventas online, estados, suscripciones y sabores", 52, 660, 12, "regular", [0.82, 0.87, 0.94]);

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

  const [orders, subscriptions] = await Promise.all([
    db.order.findMany({
      where: {
        status: { not: "CANCELLED" },
        channel: "WEB",
        createdAt: {
          gte: range.from,
          lte: range.to,
        },
      },
      select: {
        id: true,
        total: true,
        state: true,
        subscriptionId: true,
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
    }),
    db.subscription.findMany({
      where: {
        createdAt: {
          gte: range.from,
          lte: range.to,
        },
      },
      select: {
        id: true,
        status: true,
        planId: true,
        plan: { select: { name: true, price: true, unitCount: true } },
      },
    }),
  ]);

  const webOrders = orders.filter((order) => Number(order.total || 0) > 0);
  const totalRevenue = webOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const subscriptionRevenue = webOrders.filter((order) => order.subscriptionId).reduce((sum, order) => sum + Number(order.total || 0), 0);
  const oneTimeRevenue = totalRevenue - subscriptionRevenue;
  const subscriptionShare = totalRevenue > 0 ? (subscriptionRevenue / totalRevenue) * 100 : 0;
  const oneTimeShare = totalRevenue > 0 ? (oneTimeRevenue / totalRevenue) * 100 : 0;
  const stateSalesMap = new Map<string, { state: string; revenue: number; orders: number }>();
  const flavorSalesMap = new Map<string, { name: string; units: number; orders: Set<string> }>();
  const planSalesMap = new Map<string, { name: string; subscriptions: number; revenue: number; unitCount: number }>();

  for (const order of webOrders) {
    const state = (order.state || "Sin estado").trim() || "Sin estado";
    const currentState = stateSalesMap.get(state) || { state, revenue: 0, orders: 0 };
    currentState.revenue += Number(order.total || 0);
    currentState.orders += 1;
    stateSalesMap.set(state, currentState);

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

  for (const subscription of subscriptions) {
    const current = planSalesMap.get(subscription.planId) || {
      name: subscription.plan?.name || "Plan sin nombre",
      subscriptions: 0,
      revenue: 0,
      unitCount: Number(subscription.plan?.unitCount || 0),
    };
    current.subscriptions += 1;
    current.revenue += Number(subscription.plan?.price || 0);
    planSalesMap.set(subscription.planId, current);
  }

  const stateSales = Array.from(stateSalesMap.values()).sort((a, b) => b.revenue - a.revenue);
  const topFlavor = Array.from(flavorSalesMap.values())
    .map((entry) => ({ name: entry.name, units: entry.units, ordersCount: entry.orders.size }))
    .sort((a, b) => b.units - a.units)[0] || null;
  const topPlan = Array.from(planSalesMap.values()).sort((a, b) => b.subscriptions - a.subscriptions)[0] || null;
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === "ACTIVE").length;

  const lines: PdfLine[] = [
    { text: `Rango analizado: ${range.fromParam} a ${range.toParam}`, size: 11, font: "bold", color: [0.25, 0.32, 0.44], gap: 20 },
    { text: `Generado: ${new Date().toLocaleString("es-MX")}`, size: 9, color: [0.45, 0.52, 0.62], gap: 34 },
    { text: "Resumen web", size: 17, font: "bold", gap: 28 },
    { text: `Ingreso web          ${money(totalRevenue)}`, size: 14, font: "bold", x: 62, gap: 24 },
    { text: `Pedidos web          ${webOrders.length.toLocaleString("es-MX")}`, x: 62, gap: 20 },
    { text: `Venta unica          ${money(oneTimeRevenue)} - ${percent(oneTimeShare)}`, x: 62, gap: 20 },
    { text: `Suscripciones        ${money(subscriptionRevenue)} - ${percent(subscriptionShare)}`, x: 62, gap: 20 },
    { text: `Suscripciones nuevas ${subscriptions.length.toLocaleString("es-MX")} en el rango`, x: 62, gap: 20 },
    { text: `Activas nuevas       ${activeSubscriptions.toLocaleString("es-MX")} en el rango`, x: 62, gap: 36 },
    { text: "Destacados", size: 17, font: "bold", gap: 28 },
    {
      text: topPlan
        ? `Plan mas vendido     ${topPlan.name} - ${topPlan.subscriptions} suscripciones`
        : "Plan mas vendido: sin suscripciones en este rango",
      x: 62,
      font: "bold",
      gap: 22,
    },
    {
      text: topFlavor
        ? `Sabor online lider   ${topFlavor.name} - ${topFlavor.units.toLocaleString("es-MX")} botellas`
        : "Sabor online lider: sin ventas por sabor",
      x: 62,
      font: "bold",
      gap: 36,
    },
    { text: "Estados con mayor venta", size: 17, font: "bold", gap: 28 },
    ...(stateSales.slice(0, 8).length > 0
      ? stateSales.slice(0, 8).map((state, index) => ({
          text: `${index + 1}. ${state.state} - ${money(state.revenue)} - ${state.orders} pedidos`,
          x: 62,
          gap: 19,
        }))
      : [{ text: "Sin pedidos web con estado capturado en este rango.", x: 62 }]),
  ];

  const pdf = createWebReportPdf(lines);
  const filename = `reporte-web-${range.fromParam}-a-${range.toParam}.pdf`;

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
