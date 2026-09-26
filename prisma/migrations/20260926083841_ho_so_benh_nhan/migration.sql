-- Sequence cấp mã bệnh nhân BN-000001, BN-000002... (thêm tay: Prisma không tự sinh câu lệnh này).
CREATE SEQUENCE IF NOT EXISTS "patient_code_seq" START 1;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "allergyNote" TEXT,
ADD COLUMN     "guardianName" TEXT,
ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "code" SET DEFAULT ('BN-' || lpad((nextval('patient_code_seq'::regclass))::text, 6, '0'));

-- CreateIndex
CREATE INDEX "Patient_updatedAt_idx" ON "Patient"("updatedAt");

-- Điền chuỗi tìm kiếm tạm cho hồ sơ đã có (chưa bỏ dấu); ứng dụng sẽ tính lại đầy đủ ở lần lưu tiếp theo.
UPDATE "Patient" SET "searchText" = lower("fullName" || ' ' || "code" || ' ' || coalesce("phone", ''));
