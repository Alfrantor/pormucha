const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const LOCATION_LERMA = "cmndgpho10000ra6o7deka1y5";
const LOCATION_MERIDA = "cmp31f9i20004jr04kd8mucui";

const TARGETS = [
  {
    flavorId: "cmndgthxh0004ra6odukx3avi",
    flavorName: "Kombucha Jamaica",
    quantities: {
      [LOCATION_LERMA]: 116,
      [LOCATION_MERIDA]: 7,
    },
  },
  {
    flavorId: "cmndgu5y30006ra6ologeh1ok",
    flavorName: "Kombucha Té Verde",
    quantities: {
      [LOCATION_LERMA]: 190,
      [LOCATION_MERIDA]: 6,
    },
  },
  {
    flavorId: "cmndgttmk0005ra6o8n0seajd",
    flavorName: "Kombucha Té Negro",
    quantities: {
      [LOCATION_LERMA]: 143,
      [LOCATION_MERIDA]: 7,
    },
  },
  {
    flavorId: "cmndgt0td0003ra6o3h2by8qb",
    flavorName: "Kombucha Piña",
    quantities: {
      [LOCATION_LERMA]: 249,
      [LOCATION_MERIDA]: 8,
    },
  },
];

async function main() {
  const summary = [];

  for (const target of TARGETS) {
    for (const [locationId, quantity] of Object.entries(target.quantities)) {
      const existing = await prisma.stock.findUnique({
        where: {
          flavorId_locationId: {
            flavorId: target.flavorId,
            locationId,
          },
        },
      });

      await prisma.stock.upsert({
        where: {
          flavorId_locationId: {
            flavorId: target.flavorId,
            locationId,
          },
        },
        update: {
          quantity,
        },
        create: {
          flavorId: target.flavorId,
          locationId,
          quantity,
        },
      });

      summary.push({
        flavorId: target.flavorId,
        flavorName: target.flavorName,
        locationId,
        previousQuantity: Number(existing?.quantity || 0),
        newQuantity: quantity,
      });
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
