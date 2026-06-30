const { PrismaClient } = require("@prisma/client");

async function main() {
  const db = new PrismaClient();
  try {
    const rows = await db.rawMaterial.findMany({
      select: { id: true, name: true, unit: true, category: true },
      orderBy: { name: "asc" },
    });
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
