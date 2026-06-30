CREATE TABLE "ProductionFormula" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "formulaSummary" TEXT,
    "durationHours" INTEGER NOT NULL,
    "phMin" DECIMAL(65,30) NOT NULL,
    "phMax" DECIMAL(65,30) NOT NULL,
    "brixMin" DECIMAL(65,30) NOT NULL,
    "brixMax" DECIMAL(65,30) NOT NULL,
    "temperatureMin" DECIMAL(65,30) NOT NULL,
    "temperatureMax" DECIMAL(65,30) NOT NULL,
    "acidityMin" DECIMAL(65,30) NOT NULL,
    "acidityMax" DECIMAL(65,30) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductionFormula_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductionFormulaItem" (
    "id" TEXT NOT NULL,
    "formulaId" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "defaultLocationId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductionFormulaItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Production" ADD COLUMN "productionFormulaId" TEXT;

CREATE UNIQUE INDEX "ProductionFormula_code_key" ON "ProductionFormula"("code");
CREATE INDEX "ProductionFormulaItem_formulaId_idx" ON "ProductionFormulaItem"("formulaId");
CREATE INDEX "ProductionFormulaItem_rawMaterialId_idx" ON "ProductionFormulaItem"("rawMaterialId");
CREATE INDEX "Production_productionFormulaId_idx" ON "Production"("productionFormulaId");

ALTER TABLE "ProductionFormulaItem"
ADD CONSTRAINT "ProductionFormulaItem_formulaId_fkey"
FOREIGN KEY ("formulaId") REFERENCES "ProductionFormula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductionFormulaItem"
ADD CONSTRAINT "ProductionFormulaItem_rawMaterialId_fkey"
FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductionFormulaItem"
ADD CONSTRAINT "ProductionFormulaItem_defaultLocationId_fkey"
FOREIGN KEY ("defaultLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Production"
ADD CONSTRAINT "Production_productionFormulaId_fkey"
FOREIGN KEY ("productionFormulaId") REFERENCES "ProductionFormula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ProductionFormula"
("id","code","name","description","formulaSummary","durationHours","phMin","phMax","brixMin","brixMax","temperatureMin","temperatureMax","acidityMin","acidityMax","isActive","createdAt","updatedAt")
VALUES
('prod_formula_A','A','Formula A',NULL,'Usa los insumos iniciales del lote como formula base y valida el arranque antes de pasar a fase dos.',48,2.8,3.4,5,8,18,24,0.6,1.2,true,NOW(),NOW()),
('prod_formula_B','B','Formula B',NULL,'Mantiene una fermentacion mas larga y requiere control mas estable antes de segunda fase.',72,2.9,3.5,4,7,18,23,0.7,1.3,true,NOW(),NOW()),
('prod_formula_C','C','Formula C',NULL,'Proceso mas largo con seguimiento mas fino del cierre de azucares y acidez.',96,2.7,3.3,3,6,17,22,0.8,1.5,true,NOW(),NOW());
