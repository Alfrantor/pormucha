import { db } from "@/lib/db";

let clientSchemaReady: Promise<void> | null = null;

export async function ensureClientStateSchema() {
  if (!clientSchemaReady) {
    clientSchemaReady = db
      .$executeRawUnsafe(`
        ALTER TABLE "Client"
        ADD COLUMN IF NOT EXISTS "state" TEXT
      `)
      .then(() => undefined)
      .catch((error) => {
        clientSchemaReady = null;
        throw error;
      });
  }

  await clientSchemaReady;
}
