-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'PHARMACIST';
ALTER TYPE "UserRole" ADD VALUE 'TECHNICIAN';

-- AlterTable
ALTER TABLE "Patient" ALTER COLUMN "code" SET DEFAULT ('BN-' || lpad((nextval('patient_code_seq'::regclass))::text, 6, '0'));

-- AlterTable
ALTER TABLE "Prescription" ALTER COLUMN "code" SET DEFAULT ('DT-' || lpad((nextval('prescription_code_seq'::regclass))::text, 6, '0'));

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSample" BOOLEAN NOT NULL DEFAULT false;
