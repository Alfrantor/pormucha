const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const out = {
    productions: await prisma.production.count(),
    productionParameters: await prisma.productionParameter.count(),
    productionAdditions: await prisma.productionAddition.count(),
    productionIngredients: await prisma.productionIngredient.count(),
    baseBeverageInventory: await prisma.baseBeverageInventory.count(),
    formulas: await prisma.productionFormula.count(),
    formulaSteps: await prisma.productionFormulaStep.count(),
    formulaItems: await prisma.productionFormulaItem.count(),
    gasification: await prisma.gasificationBatch.count(),
    labeling: await prisma.labelingBatch.count(),
  };

  try {
    const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "ProductionPhaseRecord"`);
    out.phaseRecords = Number(rows[0]?.count || 0);
  } catch {
    out.phaseRecords = "n/a";
  }

  console.log(JSON.stringify(out, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
