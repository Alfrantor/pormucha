ALTER TABLE "ProductionFormulaItem"
ADD COLUMN IF NOT EXISTS "sourceKind" TEXT NOT NULL DEFAULT 'RAW_MATERIAL';

ALTER TABLE "ProductionFormulaItem"
ADD COLUMN IF NOT EXISTS "sourceProductionType" TEXT;

ALTER TABLE "ProductionFormulaItem"
ALTER COLUMN "rawMaterialId" DROP NOT NULL;
