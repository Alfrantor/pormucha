/**
 * IMPORTADOR DE VENTAS DESDE EXCEL
 * ─────────────────────────────────
 * Lee BD Kombucha.xlsx y crea Order + OrderItems en Prisma.
 *
 * USO:
 *   npx ts-node scripts/import-excel.ts                  ← dry-run (no escribe nada)
 *   npx ts-node scripts/import-excel.ts --execute        ← importa de verdad
 *   npx ts-node scripts/import-excel.ts --execute --skip-existing
 *
 * ESTRATEGIA DE AGRUPACIÓN:
 *   - Filas CON "# de Nota"  → se agrupan por ese número
 *   - Filas SIN "# de Nota"  → se agrupan por (fecha + cliente + localidad + tipo)
 */

import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import * as path from "path";

const db = new PrismaClient();
const DRY_RUN = !process.argv.includes("--execute");
const SKIP_EXISTING = process.argv.includes("--skip-existing");
const EXCEL_PATH = path.resolve(
  process.env.EXCEL_PATH ||
    "C:/Users/ameri/Downloads/BD Kombucha.xlsx"
);

// ─────────────────────────────────────────────
// NORMALIZACIÓN DE DATOS SUCIOS
// ─────────────────────────────────────────────

function normalizeStatus(raw: string | null | undefined): string {
  if (!raw) return "PENDING";
  const s = raw.toString().trim().toUpperCase();
  if (s === "PAGADO") return "PAID";
  if (s.startsWith("CANCEL")) return "CANCELED";
  if (s === "PENDIENTE") return "PENDING";
  if (s.includes("CORTESIA") || s.includes("CORTES")) return "COURTESY";
  if (s.includes("CONSIGN")) return "CONSIGNMENT";
  if (s === "CAMBIO") return "EXCHANGE";
  return "PENDING";
}

function normalizeLocation(raw: string | null | undefined): string {
  if (!raw) return "Sin localidad";
  const s = raw.toString().trim();
  if (s.toUpperCase().startsWith("CANCEL")) return "CANCELADA";
  // Capitalize first letter
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function normalizeTipo(raw: string | null | undefined): string {
  if (!raw) return "General";
  const s = raw.toString().trim();
  const up = s.toUpperCase();
  if (up.startsWith("CANCEL")) return "CANCELADA";
  if (up.includes("PUBLICO") || up.includes("PÚBLICO")) return "Público General";
  if (up.includes("RESTAURANTE")) return "Restaurante";
  if (up.includes("PUNTO")) return "Punto de Venta";
  if (up.includes("CAFETERIA") || up.includes("CAFETERÍA")) return "Cafetería";
  if (up.includes("EVENTO")) return "Evento";
  if (up.includes("TAQUERIA") || up.includes("TAQUERÍA")) return "Taquería";
  if (up.includes("HOTEL")) return "Hotel";
  if (up.includes("INFLUENCER")) return "Influencer";
  if (up.includes("PROMOCI")) return "Promoción";
  return s;
}

function normalizeFlavor(raw: string | null | undefined): string {
  if (!raw) return "Sin sabor";
  const s = raw.toString().trim();
  const map: Record<string, string> = {
    "jamaica ": "Jamaica",
    "pi a": "Piña",
    "pia": "Piña",
    "pina": "Piña",
    "te verde": "Té Verde",
    "te negro": "Té Negro",
    "te": "Té",
    "chct": "Caldo de Hueso CT",
    "chucrut": "Chucrut",
    "caldo de hueso": "Caldo de Hueso",
    "scoby": "Scoby",
    "caja": "Caja",
    "variado": "Variado",
  };
  const lower = s.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (lower === key) return val;
  }
  // Capitalize
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseDate(raw: any): Date {
  if (!raw) return new Date();
  let d: Date;
  if (raw instanceof Date) {
    d = raw;
  } else if (typeof raw === "number") {
    // Excel serial number → milliseconds desde 1900-01-01
    const MS_PER_DAY = 86400000;
    const EXCEL_EPOCH = new Date(1899, 11, 30).getTime();
    d = new Date(EXCEL_EPOCH + raw * MS_PER_DAY);
  } else {
    d = new Date(raw);
  }
  // Fix obviously wrong years (typos like 2925)
  if (d.getFullYear() > 2030) {
    d.setFullYear(2025);
  }
  return isNaN(d.getTime()) ? new Date() : d;
}

function makeGroupKey(row: any): string {
  const date = parseDate(row.fecha).toDateString();
  const cliente = (row.cliente || "X").toString().trim();
  const loc = normalizeLocation(row.localidad);
  const tipo = normalizeTipo(row.tipo);
  return `${date}|${cliente}|${loc}|${tipo}`;
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  console.log(`\n🍵 IMPORTADOR PORMUCHA KOMBUCHA`);
  console.log(`   Modo: ${DRY_RUN ? "🔍 DRY-RUN (sin escribir)" : "✅ EJECUTAR"}`);
  console.log(`   Archivo: ${EXCEL_PATH}\n`);

  // 1. Leer Excel
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawData: any[] = (XLSX.utils.sheet_to_json as any)(ws, { defval: null });

  // Renombrar columnas (por si tienen caracteres raros)
  const rows = rawData.map((r: any) => {
    const keys = Object.keys(r);
    return {
      nota: r[keys[0]],          // # de Nota
      fecha: r[keys[1]],         // Fechas
      dia: r[keys[2]],
      semana: r[keys[3]],
      mes: r[keys[4]],
      anio: r[keys[5]],
      localidad: r[keys[6]],     // Localidad
      tipo: r[keys[7]],          // Tipo
      cliente: r[keys[8]],       // Cliente
      cantidad: r[keys[9]],      // Cantidad
      sabor: r[keys[10]],        // Sabor
      precio: r[keys[11]],       // Precio
      subtotal: r[keys[12]],     // Subtotal
      estatus: r[keys[13]],      // Estatus
      metodo_pago: r[keys[14]],  // Método de Pago
      facturado: r[keys[15]],    // Facturado
      fecha_pago: r[keys[16]],   // Fecha de Pago
      comentarios: r[keys[17]],  // Comentarios
    };
  });

  console.log(`📊 Filas leídas: ${rows.length}`);

  // Recortar a las primeras 3713 filas (el Excel solo tiene datos reales hasta ahí)
  // A partir de la fila 3713 son filas vacías (fecha NaT, año 1900)
  const validRows = rows
    .slice(0, 3713)
    .filter(r => r.fecha != null && r.sabor != null);

  console.log(`✂️  Filas válidas (≤3713, con fecha y sabor): ${validRows.length}`);

  // 2. Agrupar en "órdenes"
  const orderMap = new Map<string, any[]>();

  for (const row of validRows) {
    let key: string;
    if (row.nota != null && !isNaN(Number(row.nota))) {
      key = `NOTA_${Number(row.nota)}`;
    } else {
      key = makeGroupKey(row);
    }
    if (!orderMap.has(key)) orderMap.set(key, []);
    orderMap.get(key)!.push(row);
  }

  console.log(`📦 Órdenes identificadas: ${orderMap.size}`);

  // 3. Stats de diagnóstico
  let canceladas = 0, cortesias = 0, pagadas = 0, pendientes = 0, consignaciones = 0;
  for (const [, items] of orderMap) {
    const status = normalizeStatus(items[0].estatus);
    if (status === "CANCELED") canceladas++;
    else if (status === "COURTESY") cortesias++;
    else if (status === "PAID") pagadas++;
    else if (status === "PENDING") pendientes++;
    else if (status === "CONSIGNMENT") consignaciones++;
  }
  console.log(`\n   Pagadas: ${pagadas} | Pendientes: ${pendientes} | Cortesías: ${cortesias} | Consignaciones: ${consignaciones} | Canceladas: ${canceladas}\n`);

  // Sabores únicos que se van a crear/buscar
  const flavorNames = new Set<string>();
  const ciudades = new Set<string>();
  for (const row of validRows) {
    flavorNames.add(normalizeFlavor(row.sabor));
    const loc = normalizeLocation(row.localidad);
    if (loc !== "CANCELADA" && loc !== "Sin localidad") ciudades.add(loc);
  }
  console.log(`🍾 Sabores únicos: ${[...flavorNames].sort().join(", ")}`);
  console.log(`📍 Ciudades de venta (solo referencia, no se tocan Locations): ${[...ciudades].sort().join(", ")}\n`);

  if (DRY_RUN) {
    console.log("─".repeat(60));
    console.log("DRY-RUN completado. Para importar ejecuta:");
    console.log("  npx ts-node scripts/import-excel.ts --execute\n");
    await db.$disconnect();
    return;
  }

  // ───────────────────────────────────────────
  // MODO EXECUTE: escribir en DB
  // ───────────────────────────────────────────

  // 4. Upsert Flavors
  console.log("\n🍾 Sincronizando flavors...");
  const flavorCache = new Map<string, string>(); // name → id
  for (const flavorName of flavorNames) {
    const slug = flavorName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    try {
      // Buscar primero por nombre exacto o slug
      let flavor = await db.flavor.findFirst({
        where: { OR: [{ name: flavorName }, { slug }] },
      });
      if (!flavor) {
        flavor = await db.flavor.create({
          data: {
            name: flavorName,
            slug: slug || `flavor-${Date.now()}`,
            price: 65, // precio default
            basePrice: 65,
            isArchived: false,
          },
        });
        console.log(`   + Creado: ${flavorName} (${slug})`);
      } else {
        console.log(`   ✓ Encontrado: ${flavorName}`);
      }
      flavorCache.set(flavorName, flavor.id);
    } catch (e: any) {
      console.error(`   ❌ Error con flavor ${flavorName}: ${e.message}`);
    }
  }

  // 5b. Importar órdenes
  console.log(`\n📦 Importando ${orderMap.size} órdenes...`);
  let created = 0, skipped = 0, errors = 0;

  for (const [key, items] of orderMap) {
    try {
      const first = items[0];
      const status = normalizeStatus(first.estatus);
      const fecha = parseDate(first.fecha);
      const ciudad = normalizeLocation(first.localidad); // solo referencia, no es Location de bodega
      const clientName = (first.cliente || "Sin nombre").toString().trim();
      const notaNum = first.nota != null && !isNaN(Number(first.nota))
        ? String(Math.round(Number(first.nota)))
        : null;
      const tipo = normalizeTipo(first.tipo);

      // Total de la orden = suma de subtotales de sus items
      const total = items.reduce((s, r) => s + (Number(r.subtotal) || 0), 0);

      // Clave de referencia para idempotencia
      const excelRef = notaNum ? `excel-${notaNum}` : `excel-key:${key}`;

      // Skip si ya existe: por id (con nota) o por notes (sin nota)
      if (notaNum) {
        const exists = await db.order.findFirst({ where: { id: excelRef } });
        if (exists) { skipped++; continue; }
      } else {
        const exists = await db.order.findFirst({ where: { notes: excelRef } });
        if (exists) { skipped++; continue; }
      }

      // Crear Order
      // city → ciudad de venta (Campeche, Merida, etc.)
      // state → tipo de cliente (Restaurante, Punto de Venta, etc.)
      // locationId → null (las Locations son bodegas, no ciudades de venta)
      const order = await db.order.create({
        data: {
          id: notaNum ? excelRef : undefined,
          channel: "POS",
          status,
          fullName: clientName !== "X" ? clientName : "Cliente General",
          total,
          subtotal: total,
          city: ciudad !== "Sin localidad" && ciudad !== "CANCELADA" ? ciudad : null,
          state: tipo !== "CANCELADA" ? tipo : null,
          paymentMethod: first.metodo_pago?.toString() || null,
          notes: excelRef,
          createdAt: fecha,
          updatedAt: fecha,
        },
      });

      // Crear OrderItems
      for (const row of items) {
        const flavorName = normalizeFlavor(row.sabor);
        const flavorId = flavorCache.get(flavorName) ?? null;
        const qty = Math.max(1, Math.round(Number(row.cantidad) || 1));
        const unitPrice = Number(row.precio) || 0;
        const subtotal = Number(row.subtotal) || unitPrice * qty;

        await db.orderItem.create({
          data: {
            orderId: order.id,
            flavorId,
            productName: flavorName,
            quantity: qty,
            unitPrice,
            subtotal,
          },
        });
      }

      created++;
      if (created % 100 === 0) {
        process.stdout.write(`\r   Procesadas: ${created}/${orderMap.size}`);
      }
    } catch (e: any) {
      errors++;
      if (errors <= 5) {
        console.error(`\n   ❌ Error en orden [${key}]: ${e.message}`);
      }
    }
  }

  console.log(`\n\n✅ IMPORTACIÓN COMPLETADA`);
  console.log(`   Creadas: ${created} | Omitidas: ${skipped} | Errores: ${errors}`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error("Error fatal:", e);
  db.$disconnect();
  process.exit(1);
});
