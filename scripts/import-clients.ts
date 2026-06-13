/**
 * IMPORTADOR DE CLIENTES DESDE AGENDA EXCEL
 * ──────────────────────────────────────────
 * Lee Agenda_Pormucha.xlsx y crea Client records en Prisma.
 * Los campos faltantes (email, RFC, etc.) quedan como placeholder
 * para editarlos después desde el admin.
 *
 * USO:
 *   npx ts-node -P tsconfig.scripts.json scripts/import-clients.ts           ← dry-run
 *   npx ts-node -P tsconfig.scripts.json scripts/import-clients.ts --execute ← importa
 */

import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import * as path from "path";

const db = new PrismaClient();
const DRY_RUN = !process.argv.includes("--execute");
const EXCEL_PATH = path.resolve(
  process.env.CLIENTS_EXCEL_PATH ||
    "C:/Users/ameri/Downloads/Agenda_Pormucha (1).xlsx"
);

// Palabras que indican que NO es un cliente real
const NOT_A_CLIENT = [
  "visita clientes", "evento ", "sesion de fotos", "cena rest",
  "chicos gyms", "contry club", "country club", "jazz", "x",
];

function isRealClient(name: string): boolean {
  if (!name || name.trim().length < 2) return false;
  const lower = name.trim().toLowerCase();
  if (lower === "x" || lower === "nan") return false;
  for (const kw of NOT_A_CLIENT) {
    if (lower.startsWith(kw)) return false;
  }
  return true;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function cleanPhone(raw: any): string | null {
  if (!raw) return null;
  const clean = raw.toString().replace(/[^\d+]/g, "").trim();
  return clean.length >= 8 ? clean : null;
}

async function main() {
  console.log("\n👥 IMPORTADOR DE CLIENTES PORMUCHA");
  console.log(`   Modo: ${DRY_RUN ? "🔍 DRY-RUN (sin escribir)" : "✅ EJECUTAR"}`);
  console.log(`   Archivo: ${EXCEL_PATH}\n`);

  // 1. Leer Excel
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawData: any[] = (XLSX.utils.sheet_to_json as any)(ws, {
    header: 1,
    defval: null,
  });

  // Cada fila es [nombre, telefono, ciudad]
  const rows = rawData
    .map((row: any[]) => ({
      nombre: row[0]?.toString().trim() || null,
      telefono: row[1] ? row[1].toString().trim() : null,
      ciudad: row[2]?.toString().trim() || null,
    }))
    .filter(r => r.nombre && isRealClient(r.nombre));

  console.log(`📊 Filas leídas: ${rawData.length}`);
  console.log(`✅ Clientes válidos tras filtrar: ${rows.length}`);

  // Detectar duplicados de nombre
  const nameCount = new Map<string, number>();
  for (const r of rows) {
    const key = r.nombre!.toLowerCase();
    nameCount.set(key, (nameCount.get(key) || 0) + 1);
  }
  const dupes = [...nameCount.entries()].filter(([, c]) => c > 1);
  if (dupes.length > 0) {
    console.log(`\n⚠️  Nombres duplicados (${dupes.length}):`);
    dupes.forEach(([n, c]) => console.log(`   "${n}" aparece ${c} veces`));
  }

  console.log(`\n📋 Muestra de los primeros 10:`);
  rows.slice(0, 10).forEach(r =>
    console.log(`   ${r.nombre} | Tel: ${r.telefono || "—"} | Ciudad: ${r.ciudad || "—"}`)
  );

  if (DRY_RUN) {
    console.log("\n" + "─".repeat(60));
    console.log("DRY-RUN completado. Para importar ejecuta:");
    console.log("  npm run import:clients-run\n");
    await db.$disconnect();
    return;
  }

  // ─── MODO EXECUTE ───────────────────────────────────────────
  let created = 0, skipped = 0, errors = 0;
  const slugsUsed = new Set<string>();

  for (const row of rows) {
    try {
      const nombre = row.nombre!;
      const telefono = cleanPhone(row.telefono);
      const ciudad = row.ciudad;

      // Email placeholder único basado en el slug del nombre
      let slug = slugify(nombre);
      // Si el slug ya fue usado (nombre duplicado), añadir sufijo
      let uniqueSlug = slug;
      let suffix = 2;
      while (slugsUsed.has(uniqueSlug)) {
        uniqueSlug = `${slug}-${suffix++}`;
      }
      slugsUsed.add(uniqueSlug);
      const placeholderEmail = `${uniqueSlug}@pormucha-importado.mx`;

      // Verificar si ya existe por email placeholder
      const existing = await db.client.findFirst({
        where: {
          OR: [
            { email: placeholderEmail },
            // También buscar por nombre exacto + teléfono si lo tienen
            ...(telefono ? [{ phone: telefono }] : []),
          ],
        },
      });

      if (existing) {
        console.log(`   ↷ Ya existe: ${nombre}`);
        skipped++;
        continue;
      }

      // Crear cliente
      const client = await db.client.create({
        data: {
          fullName: nombre,
          email: placeholderEmail,
          phone: telefono,
          type: "FISICA",
          classification: "MINORISTA", // default, editar después
          status: "ACTIVO",
          creditLimit: 0,
          creditUsed: 0,
        },
      });

      // Si tiene ciudad, crear Address
      if (ciudad) {
        await (db as any).address.create({
          data: {
            clientId: client.id,
            label: "Principal",
            city: ciudad,
            country: "México",
            isDefault: true,
          },
        }).catch(() => {
          // Si Address no existe en el schema o falla, ignorar silenciosamente
        });
      }

      created++;
      if (created % 50 === 0) {
        process.stdout.write(`\r   Creados: ${created}/${rows.length}`);
      }
    } catch (e: any) {
      errors++;
      if (errors <= 5) {
        console.error(`\n   ❌ Error con "${row.nombre}": ${e.message}`);
      }
    }
  }

  console.log(`\n\n✅ IMPORTACIÓN COMPLETADA`);
  console.log(`   Creados: ${created} | Ya existían: ${skipped} | Errores: ${errors}`);
  console.log(`\n💡 Recuerda: los emails son placeholders (@pormucha-importado.mx).`);
  console.log(`   Edítalos desde Admin → Clientes cuando tengas los datos reales.\n`);

  await db.$disconnect();
}

main().catch(e => {
  console.error("Error fatal:", e);
  db.$disconnect();
  process.exit(1);
});
