-- Sequence cấp số đơn thuốc DT-000001... (thêm tay: Prisma không tự sinh câu lệnh này).
CREATE SEQUENCE IF NOT EXISTS "prescription_code_seq" START 1;

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "Visit" DROP CONSTRAINT "Visit_doctorId_fkey";

-- AlterTable
ALTER TABLE "Patient" ALTER COLUMN "code" SET DEFAULT ('BN-' || lpad((nextval('patient_code_seq'::regclass))::text, 6, '0'));

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "advice" TEXT,
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMPTZ(3),
ADD COLUMN     "diagnosisText" TEXT,
ADD COLUMN     "followUpDate" DATE,
ADD COLUMN     "patientSnapshot" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "code" SET DEFAULT ('DT-' || lpad((nextval('prescription_code_seq'::regclass))::text, 6, '0'));

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "clinicalNote" TEXT,
ADD COLUMN     "completedAt" TIMESTAMPTZ(3),
ADD COLUMN     "diagnosisText" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "startedById" UUID,
ADD COLUMN     "status" "VisitStatus" NOT NULL DEFAULT 'COMPLETED',
ALTER COLUMN "doctorId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "id" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "drugId" UUID NOT NULL,
    "drugName" TEXT NOT NULL,
    "drugDosageForm" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "dosageInstruction" TEXT NOT NULL,
    "durationDays" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
