import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function serialize(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return Number(value);
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serialize(entry)]));
  }
  return value;
}

async function main() {
  const productionRows = await db.$queryRaw`
    SELECT p.*, t.id AS tank_id, t.name AS tank_name
    FROM "Production" p
    LEFT JOIN "Tank" t ON t.id = p."tankId"
    ORDER BY p."completedAt" DESC NULLS LAST, p."createdAt" DESC
    LIMIT 1
  `;
  const production = productionRows[0] || null;

  if (!production) {
    console.log("NO_PRODUCTION_FOUND");
    return;
  }

  const inventoryRows = await db.$queryRaw`
    SELECT *
    FROM "BaseBeverageInventory"
    WHERE "productionId" = ${production.id}
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;
  const inventory = inventoryRows[0] || null;

  const entries = inventory
    ? await db.$queryRaw`
        SELECT se.*, st.*
        FROM "BaseBeverageStorageEntry" se
        LEFT JOIN "BaseBeverageStorageTank" st ON st.id = se."storageTankId"
        WHERE se."baseBeverageInventoryId" = ${inventory.id}
        ORDER BY se."createdAt" ASC
      `
    : [];

  console.log(
    JSON.stringify(
      {
        production: serialize(production),
        inventory: serialize(inventory),
        entries: serialize(entries),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
