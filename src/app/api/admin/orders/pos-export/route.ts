import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import * as XLSX from "xlsx";
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
    return { error: "Rango de fechas inválido." as const };
  }

  return { from, to, fromParam, toParam };
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
      fullName: true,
      total: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = orders.map((order) => ({
    "Folio / ID": order.folio || `#${order.id.slice(-6).toUpperCase()}`,
    Fecha: order.createdAt.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
    Cliente: order.fullName || "Sin nombre",
    Total: Number(order.total || 0),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 18 },
    { wch: 24 },
    { wch: 36 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas POS");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const filename = `ventas-pos-${range.fromParam}-a-${range.toParam}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
