ALTER TABLE "Production"
ADD COLUMN IF NOT EXISTS "inputLiters" DECIMAL(65,30);

CREATE TABLE IF NOT EXISTS "BaseBeverageInventory" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "tankId" TEXT,
    "litersEntered" DECIMAL(65,30),
    "litersProduced" DECIMAL(65,30) NOT NULL,
    "litersRemaining" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaseBeverageInventory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BaseBeverageInventory_productionId_key" ON "BaseBeverageInventory"("productionId");
CREATE INDEX IF NOT EXISTS "BaseBeverageInventory_status_idx" ON "BaseBeverageInventory"("status");
CREATE INDEX IF NOT EXISTS "BaseBeverageInventory_productType_idx" ON "BaseBeverageInventory"("productType");
CREATE INDEX IF NOT EXISTS "BaseBeverageInventory_tankId_idx" ON "BaseBeverageInventory"("tankId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'BaseBeverageInventory_productionId_fkey'
    ) THEN
        ALTER TABLE "BaseBeverageInventory"
        ADD CONSTRAINT "BaseBeverageInventory_productionId_fkey"
        FOREIGN KEY ("productionId") REFERENCES "Production"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'BaseBeverageInventory_tankId_fkey'
    ) THEN
        ALTER TABLE "BaseBeverageInventory"
        ADD CONSTRAINT "BaseBeverageInventory_tankId_fkey"
        FOREIGN KEY ("tankId") REFERENCES "Tank"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
