-- CreateEnum
CREATE TYPE "DrugControl" AS ENUM ('NORMAL', 'NARCOTIC', 'PSYCHOTROPIC', 'PRECURSOR');

-- CreateEnum
CREATE TYPE "StandardSetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "BandTone" AS ENUM ('NORMAL', 'ATTENTION', 'ALERT');

-- AlterTable
ALTER TABLE "Patient" ALTER COLUMN "code" SET DEFAULT ('BN-' || lpad((nextval('patient_code_seq'::regclass))::text, 6, '0'));

-- CreateTable
CREATE TABLE "Drug" (
    "id" UUID NOT NULL,
    "activeIngredient" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "dosageForm" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "brandName" TEXT,
    "route" TEXT,
    "control" "DrugControl" NOT NULL DEFAULT 'NORMAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "searchText" TEXT NOT NULL DEFAULT '',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Drug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeasurementType" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeasurementType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandardSource" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "documentNumber" TEXT,
    "issuer" TEXT,
    "issuedDate" DATE,
    "url" TEXT,
    "note" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StandardSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandardSet" (
    "id" UUID NOT NULL,
    "measurementTypeId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "sourceSection" TEXT,
    "effectiveFrom" DATE NOT NULL,
    "sexScope" "Sex",
    "ageMinYears" INTEGER,
    "ageMaxYears" INTEGER,
    "status" "StandardSetStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" UUID,
    "approvedAt" TIMESTAMPTZ(3),
    "retiredAt" TIMESTAMPTZ(3),

    CONSTRAINT "StandardSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandardBand" (
    "id" UUID NOT NULL,
    "setId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "lowerBound" DECIMAL(12,3),
    "lowerInclusive" BOOLEAN NOT NULL DEFAULT true,
    "upperBound" DECIMAL(12,3),
    "upperInclusive" BOOLEAN NOT NULL DEFAULT false,
    "tone" "BandTone" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StandardBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" UUID NOT NULL,
    "visitId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "measurementTypeId" UUID NOT NULL,
    "value" DECIMAL(12,3) NOT NULL,
    "measuredAt" TIMESTAMPTZ(3) NOT NULL,
    "recordedById" UUID NOT NULL,
    "classificationLabel" TEXT,
    "standardSetId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Drug_activeIngredient_idx" ON "Drug"("activeIngredient");

-- CreateIndex
CREATE UNIQUE INDEX "MeasurementType_code_key" ON "MeasurementType"("code");

-- CreateIndex
CREATE INDEX "StandardSet_measurementTypeId_status_idx" ON "StandardSet"("measurementTypeId", "status");

-- CreateIndex
CREATE INDEX "Measurement_patientId_measurementTypeId_measuredAt_idx" ON "Measurement"("patientId", "measurementTypeId", "measuredAt");

-- AddForeignKey
ALTER TABLE "StandardSource" ADD CONSTRAINT "StandardSource_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardSet" ADD CONSTRAINT "StandardSet_measurementTypeId_fkey" FOREIGN KEY ("measurementTypeId") REFERENCES "MeasurementType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardSet" ADD CONSTRAINT "StandardSet_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "StandardSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardSet" ADD CONSTRAINT "StandardSet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardSet" ADD CONSTRAINT "StandardSet_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardBand" ADD CONSTRAINT "StandardBand_setId_fkey" FOREIGN KEY ("setId") REFERENCES "StandardSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_measurementTypeId_fkey" FOREIGN KEY ("measurementTypeId") REFERENCES "MeasurementType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_standardSetId_fkey" FOREIGN KEY ("standardSetId") REFERENCES "StandardSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
