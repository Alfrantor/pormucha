const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const FLAVOR_ID = "cmndgthxh0004ra6odukx3avi";
const LOCATION_ID = "cmndgpho10000ra6o7deka1y5";
const TARGET_QUANTITY = 99;

async function main() {
  const existing = await prisma.stock.findUnique({
    where: {
      flavorId_locationId: {
        flavorId: FLAVOR_ID,
        locationId: LOCATION_ID,
      },
    },
    select: {
      quantity: true,
      flavor: { select: { name: true } },
      location: { select: { name: true } },
    },
  });

  await prisma.stock.upsert({
    where: {
      flavorId_locationId: {
        flavorId: FLAVOR_ID,
        locationId: LOCATION_ID,
      },
    },
    update: { quantity: TARGET_QUANTITY },
    create: {
      flavorId: FLAVOR_ID,
      locationId: LOCATION_ID,
      quantity: TARGET_QUANTITY,
    },
  });

  console.log(
    JSON.stringify(
      {
        flavor: existing?.flavor?.name || "Kombucha Jamaica",
        location: existing?.location?.name || "Lerma",
        previousQuantity: Number(existing?.quantity || 0),
        newQuantity: TARGET_QUANTITY,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
