-- AlterTable
ALTER TABLE "Drug" ADD COLUMN     "isCombination" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Patient" ALTER COLUMN "code" SET DEFAULT ('BN-' || lpad((nextval('patient_code_seq'::regclass))::text, 6, '0'));

-- AlterTable
ALTER TABLE "Prescription" ALTER COLUMN "code" SET DEFAULT ('DT-' || lpad((nextval('prescription_code_seq'::regclass))::text, 6, '0'));
