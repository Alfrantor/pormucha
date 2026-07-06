ALTER TABLE "ProductionPhaseRecord"
ADD COLUMN IF NOT EXISTS "remainingLiters" DECIMAL(65,30);
