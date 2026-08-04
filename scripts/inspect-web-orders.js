const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const grouped = await prisma.order.groupBy({
    by: ["channel"],
    _count: { _all: true },
    orderBy: { channel: "asc" },
  });

  const samples = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      folio: true,
      channel: true,
      status: true,
      subscriptionId: true,
      total: true,
      createdAt: true,
      fullName: true,
    },
  });

  console.log(JSON.stringify({ grouped, samples }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
