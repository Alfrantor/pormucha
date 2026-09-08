import { db } from "@/lib/db";

let flavorPresentationSchemaReady: Promise<void> | null = null;

export async function ensureFlavorPresentationSchema() {
  if (!flavorPresentationSchemaReady) {
    flavorPresentationSchemaReady = Promise.all([
      db.$executeRawUnsafe(`
        ALTER TABLE "Flavor"
        ADD COLUMN IF NOT EXISTS "presentations" TEXT
      `),
      db.$executeRawUnsafe(`
        ALTER TABLE "OrderItem"
        ADD COLUMN IF NOT EXISTS "presentation" TEXT
      `),
    ])
      .then(() => undefined)
      .catch((error) => {
        flavorPresentationSchemaReady = null;
        throw error;
      });
  }

  await flavorPresentationSchemaReady;
}
