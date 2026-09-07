import { db } from "@/lib/db";

let productImageEuroSchemaReady: Promise<void> | null = null;

export async function ensureProductImageEuroSchema() {
  if (!productImageEuroSchemaReady) {
    productImageEuroSchemaReady = db.$executeRawUnsafe(`
      ALTER TABLE "Product"
      ADD COLUMN IF NOT EXISTS "imageEuro" TEXT
    `)
      .then(() => undefined)
      .catch((error) => {
        productImageEuroSchemaReady = null;
        throw error;
      });
  }

  await productImageEuroSchemaReady;
}
