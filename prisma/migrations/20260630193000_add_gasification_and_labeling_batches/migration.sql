-- CreateTable
CREATE TABLE "GasificationBatch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flavorId" TEXT,
    "tankId" TEXT,
    "locationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "litersProcessed" DECIMAL(65,30),
    "pressurePsi" DECIMAL(65,30),
    "carbonationVol" DECIMAL(65,30),
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GasificationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabelingBatch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flavorId" TEXT,
    "locationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "unitsReceived" INTEGER,
    "unitsLabeled" INTEGER,
    "labelsUsed" INTEGER,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabelingBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GasificationBatch_status_idx" ON "GasificationBatch"("status");

-- CreateIndex
CREATE INDEX "GasificationBatch_tankId_idx" ON "GasificationBatch"("tankId");

-- CreateIndex
CREATE INDEX "GasificationBatch_flavorId_idx" ON "GasificationBatch"("flavorId");

-- CreateIndex
CREATE INDEX "LabelingBatch_status_idx" ON "LabelingBatch"("status");

-- CreateIndex
CREATE INDEX "LabelingBatch_flavorId_idx" ON "LabelingBatch"("flavorId");

-- CreateIndex
CREATE INDEX "LabelingBatch_locationId_idx" ON "LabelingBatch"("locationId");

-- AddForeignKey
ALTER TABLE "GasificationBatch" ADD CONSTRAINT "GasificationBatch_flavorId_fkey" FOREIGN KEY ("flavorId") REFERENCES "Flavor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GasificationBatch" ADD CONSTRAINT "GasificationBatch_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GasificationBatch" ADD CONSTRAINT "GasificationBatch_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelingBatch" ADD CONSTRAINT "LabelingBatch_flavorId_fkey" FOREIGN KEY ("flavorId") REFERENCES "Flavor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelingBatch" ADD CONSTRAINT "LabelingBatch_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
