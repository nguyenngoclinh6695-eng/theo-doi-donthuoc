-- AlterTable
ALTER TABLE "Patient" ALTER COLUMN "code" SET DEFAULT ('BN-' || lpad((nextval('patient_code_seq'::regclass))::text, 6, '0'));

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "doctorNameSnapshot" TEXT,
ADD COLUMN     "weightKgSnapshot" DECIMAL(6,2),
ALTER COLUMN "code" SET DEFAULT ('DT-' || lpad((nextval('prescription_code_seq'::regclass))::text, 6, '0'));

-- AlterTable
ALTER TABLE "PrescriptionItem" ADD COLUMN     "dosePerTime" TEXT,
ADD COLUMN     "drugBrand" TEXT,
ADD COLUMN     "drugIngredient" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "drugIsCombination" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "drugStrength" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "route" TEXT,
ADD COLUMN     "timesPerDay" INTEGER,
ADD COLUMN     "timing" TEXT,
ALTER COLUMN "dosageInstruction" SET DEFAULT '';
