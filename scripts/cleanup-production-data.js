const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function deletePhaseRecords() {
  try {
    const rows = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "ProductionPhaseRecord"`;
    const count = Number(rows[0]?.count || 0);
    await prisma.$executeRawUnsafe(`DELETE FROM "ProductionPhaseRecord"`);
    return count;
  } catch {
    return 0;
  }
}

async function main() {
  const [
    productions,
    productionIngredients,
    productionAdditions,
    labelingBatches,
    gasificationCount,
    phaseRecordCountRows,
    baseInventoryCount,
    formulaCount,
    formulaStepCount,
    formulaItemCount,
  ] = await Promise.all([
    prisma.production.findMany({
      select: { id: true, name: true },
    }),
    prisma.productionIngredient.findMany({
      select: { rawMaterialId: true, locationId: true, quantity: true },
    }),
    prisma.productionAddition.findMany({
      select: { rawMaterialId: true, locationId: true, quantity: true },
    }),
    prisma.labelingBatch.findMany({
      where: {
        status: "COMPLETED",
        flavorId: { not: null },
        locationId: { not: null },
        unitsLabeled: { not: null },
      },
      select: {
        id: true,
        name: true,
        flavorId: true,
        locationId: true,
        unitsLabeled: true,
      },
    }),
    prisma.gasificationBatch.count(),
    prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "ProductionPhaseRecord"`.catch(() => [{ count: 0 }]),
    prisma.baseBeverageInventory.count(),
    prisma.productionFormula.count(),
    prisma.productionFormulaStep.count(),
    prisma.productionFormulaItem.count(),
  ]);

  const rawMaterialAdjustments = new Map();
  for (const row of [...productionIngredients, ...productionAdditions]) {
    if (!row.locationId) continue;
    const key = `${row.rawMaterialId}::${row.locationId}`;
    rawMaterialAdjustments.set(key, {
      rawMaterialId: row.rawMaterialId,
      locationId: row.locationId,
      quantity: (rawMaterialAdjustments.get(key)?.quantity || 0) + Number(row.quantity || 0),
    });
  }

  const productStockAdjustments = new Map();
  for (const batch of labelingBatches) {
    if (!batch.flavorId || !batch.locationId) continue;
    const key = `${batch.flavorId}::${batch.locationId}`;
    productStockAdjustments.set(key, {
      flavorId: batch.flavorId,
      locationId: batch.locationId,
      quantity: (productStockAdjustments.get(key)?.quantity || 0) + Number(batch.unitsLabeled || 0),
    });
  }

  for (const adjustment of rawMaterialAdjustments.values()) {
    await prisma.rawMaterialStock.upsert({
      where: {
        rawMaterialId_locationId: {
          rawMaterialId: adjustment.rawMaterialId,
          locationId: adjustment.locationId,
        },
      },
      update: {
        quantity: { increment: adjustment.quantity },
      },
      create: {
        rawMaterialId: adjustment.rawMaterialId,
        locationId: adjustment.locationId,
        quantity: adjustment.quantity,
      },
    });
  }

  for (const adjustment of productStockAdjustments.values()) {
    await prisma.stock.upsert({
      where: {
        flavorId_locationId: {
          flavorId: adjustment.flavorId,
          locationId: adjustment.locationId,
        },
      },
      update: {
        quantity: { decrement: adjustment.quantity },
      },
      create: {
        flavorId: adjustment.flavorId,
        locationId: adjustment.locationId,
        quantity: -adjustment.quantity,
      },
    });
  }

  const rawMaterialMovementDelete = await prisma.rawMaterialMovement.deleteMany({
    where: {
      OR: [
        { reason: { startsWith: "Produccion:" } },
        { reason: "Adición en producción" },
        { reason: "Adicion de insumo en fase 2" },
      ],
    },
  });

  const inventoryMovementDelete = await prisma.inventoryMovement.deleteMany({
    where: {
      reason: {
        startsWith: "Entrada por etiquetado:",
      },
    },
  });

  const baseInventoryDelete = await prisma.baseBeverageInventory.deleteMany();
  const parameterDelete = await prisma.productionParameter.deleteMany();
  const additionDelete = await prisma.productionAddition.deleteMany();
  const ingredientDelete = await prisma.productionIngredient.deleteMany();
  const productionDelete = await prisma.production.deleteMany();
  const gasificationDelete = await prisma.gasificationBatch.deleteMany();
  const labelingDelete = await prisma.labelingBatch.deleteMany();
  const formulaItemDelete = await prisma.productionFormulaItem.deleteMany();
  const formulaStepDelete = await prisma.productionFormulaStep.deleteMany();
  const formulaDelete = await prisma.productionFormula.deleteMany();
  const phaseRecordDelete = await deletePhaseRecords();

  const summary = {
    productions: productions.length,
    productionIngredients: productionIngredients.length,
    productionAdditions: productionAdditions.length,
    labelingCompletedAdjusted: labelingBatches.length,
    gasificationCount,
    phaseRecordCount: Number(phaseRecordCountRows[0]?.count || 0),
    baseInventoryCount,
    formulaCount,
    formulaStepCount,
    formulaItemCount,
    rawMaterialAdjustmentRows: rawMaterialAdjustments.size,
    productStockAdjustmentRows: productStockAdjustments.size,
    rawMaterialMovementDelete: rawMaterialMovementDelete.count,
    inventoryMovementDelete: inventoryMovementDelete.count,
    baseInventoryDelete: baseInventoryDelete.count,
    parameterDelete: parameterDelete.count,
    additionDelete: additionDelete.count,
    ingredientDelete: ingredientDelete.count,
    productionDelete: productionDelete.count,
    gasificationDelete: gasificationDelete.count,
    labelingDelete: labelingDelete.count,
    formulaItemDelete: formulaItemDelete.count,
    formulaStepDelete: formulaStepDelete.count,
    formulaDelete: formulaDelete.count,
    phaseRecordDelete,
  };

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
