import { db } from "@/lib/db";

let crmSchemaReady: Promise<void> | null = null;

export async function ensureCrmSchema() {
  if (!crmSchemaReady) {
    crmSchemaReady = (async () => {
      await db.$executeRawUnsafe(`
        ALTER TABLE "Lead"
        ADD COLUMN IF NOT EXISTS "company" TEXT,
        ADD COLUMN IF NOT EXISTS "personType" TEXT,
        ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'WEB',
        ADD COLUMN IF NOT EXISTS "state" TEXT,
        ADD COLUMN IF NOT EXISTS "city" TEXT,
        ADD COLUMN IF NOT EXISTS "interest" TEXT,
        ADD COLUMN IF NOT EXISTS "stage" TEXT NOT NULL DEFAULT 'NEW',
        ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        ADD COLUMN IF NOT EXISTS "responsible" TEXT,
        ADD COLUMN IF NOT EXISTS "responsibleUserId" TEXT,
        ADD COLUMN IF NOT EXISTS "responsibleName" TEXT,
        ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT,
        ADD COLUMN IF NOT EXISTS "createdByName" TEXT,
        ADD COLUMN IF NOT EXISTS "firstContactAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "lastContactAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "nextFollowUpAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "sampleSentAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "lostAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "lostReason" TEXT,
        ADD COLUMN IF NOT EXISTS "clientId" TEXT,
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      `);

      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "LeadActivity" (
          "id" TEXT NOT NULL,
          "leadId" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "note" TEXT NOT NULL,
          "outcome" TEXT,
          "nextFollowUpAt" TIMESTAMP(3),
          "createdBy" TEXT,
          "createdByUserId" TEXT,
          "createdByName" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
        )
      `);

      await db.$executeRawUnsafe(`
        ALTER TABLE "LeadActivity"
        ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT,
        ADD COLUMN IF NOT EXISTS "createdByName" TEXT
      `);

      await db.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Lead_clientId_fkey'
          ) THEN
            ALTER TABLE "Lead"
            ADD CONSTRAINT "Lead_clientId_fkey"
            FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
          END IF;
        END $$;
      `);

      await db.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'LeadActivity_leadId_fkey'
          ) THEN
            ALTER TABLE "LeadActivity"
            ADD CONSTRAINT "LeadActivity_leadId_fkey"
            FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `);

      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Lead_stage_idx" ON "Lead"("stage")`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status")`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Lead_source_idx" ON "Lead"("source")`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Lead_state_idx" ON "Lead"("state")`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Lead_clientId_idx" ON "Lead"("clientId")`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Lead_responsibleUserId_idx" ON "Lead"("responsibleUserId")`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LeadActivity_leadId_idx" ON "LeadActivity"("leadId")`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LeadActivity_type_idx" ON "LeadActivity"("type")`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LeadActivity_nextFollowUpAt_idx" ON "LeadActivity"("nextFollowUpAt")`);
    })().catch((error) => {
      crmSchemaReady = null;
      throw error;
    });
  }

  await crmSchemaReady;
}
