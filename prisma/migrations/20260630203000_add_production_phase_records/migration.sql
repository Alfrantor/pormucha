CREATE TABLE "ProductionPhaseRecord" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "phase" INTEGER NOT NULL DEFAULT 2,
    "receivedCondition" TEXT,
    "receivedBy" TEXT,
    "measuredBy" TEXT,
    "startedBy" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ph" DECIMAL(65,30),
    "brix" DECIMAL(65,30),
    "temperature" DECIMAL(65,30),
    "acidity" DECIMAL(65,30),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionPhaseRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductionPhaseRecord_productionId_idx" ON "ProductionPhaseRecord"("productionId");
CREATE INDEX "ProductionPhaseRecord_phase_idx" ON "ProductionPhaseRecord"("phase");

ALTER TABLE "ProductionPhaseRecord"
ADD CONSTRAINT "ProductionPhaseRecord_productionId_fkey"
FOREIGN KEY ("productionId") REFERENCES "Production"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
