const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const stocks = await prisma.stock.findMany({
    include: {
      flavor: {
        select: {
          id: true,
          name: true,
          isArchived: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
          isArchived: true,
        },
      },
    },
    orderBy: [
      { flavor: { name: "asc" } },
      { location: { name: "asc" } },
    ],
  });

  const byFlavor = new Map();

  for (const row of stocks) {
    const flavorId = row.flavorId;
    const current = byFlavor.get(flavorId) || {
      flavorId,
      flavorName: row.flavor?.name || "Sin sabor",
      archived: Boolean(row.flavor?.isArchived),
      total: 0,
      locations: [],
    };

    const quantity = Number(row.quantity || 0);
    current.total += quantity;
    current.locations.push({
      locationId: row.locationId,
      locationName: row.location?.name || "Sin ubicación",
      archived: Boolean(row.location?.isArchived),
      quantity,
    });

    byFlavor.set(flavorId, current);
  }

  const report = Array.from(byFlavor.values()).sort((a, b) =>
    a.flavorName.localeCompare(b.flavorName, "es-MX", { sensitivity: "base" }),
  );

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
