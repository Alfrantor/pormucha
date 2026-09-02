import { db } from "../src/lib/db";

async function main() {
  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`DELETE FROM "FinalBeverageBlendComponent"`);
    await tx.$executeRawUnsafe(`DELETE FROM "FinalBeverageBlend"`);
    await tx.$executeRawUnsafe(`DELETE FROM "BaseBeverageStorageEntry"`);
    await tx.$executeRawUnsafe(`DELETE FROM "BaseBeverageInventory"`);
    await tx.$executeRawUnsafe(`DELETE FROM "ProductionPhaseRecord"`);
    await tx.$executeRawUnsafe(`DELETE FROM "ProductionParameter"`);
    await tx.$executeRawUnsafe(`DELETE FROM "ProductionAddition"`);
    await tx.$executeRawUnsafe(`DELETE FROM "ProductionIngredient"`);
    await tx.$executeRawUnsafe(`DELETE FROM "Production"`);
    await tx.$executeRawUnsafe(`DELETE FROM "LabelingBatch"`);
    await tx.$executeRawUnsafe(`DELETE FROM "GasificationBatch"`);
  });

  console.log("OK");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
