// Xoá TOÀN BỘ dữ liệu mẫu trước khi phòng khám bắt đầu dùng thật:
// bệnh nhân mẫu (kèm lịch hẹn, lượt khám, chỉ số, đơn thuốc, lần gọi nhắc), thuốc mẫu, tài khoản mẫu.
// Không đụng tới dữ liệu thật (isSample = false), Thư viện chuẩn, loại chỉ số.
//
// Chạy: npm run db:clear-sample -- --xac-nhan

import { createPrismaClient } from "../src/lib/prisma-client";

try {
  process.loadEnvFile();
} catch {}

async function main() {
  if (!process.argv.includes("--xac-nhan")) {
    console.log("Lệnh này xoá vĩnh viễn toàn bộ dữ liệu mẫu. Chạy lại kèm --xac-nhan để thực hiện:");
    console.log("  npm run db:clear-sample -- --xac-nhan");
    return;
  }
  const prisma = createPrismaClient();
  try {
    const samplePatients = { patient: { isSample: true } };
    const result = await prisma.$transaction(async (tx) => {
      const counts = {
        measurements: (await tx.measurement.deleteMany({ where: samplePatients })).count,
        reminderCalls: (await tx.reminderCall.deleteMany({ where: samplePatients })).count,
        prescriptions: (await tx.prescription.deleteMany({ where: samplePatients })).count,
        visits: (await tx.visit.deleteMany({ where: samplePatients })).count,
        appointments: (await tx.appointment.deleteMany({ where: samplePatients })).count,
        patients: (await tx.patient.deleteMany({ where: { isSample: true } })).count,
      };
      // Thuốc mẫu còn được đơn thật tham chiếu thì giữ lại (chỉ ngừng dùng), còn lại xoá.
      const usedDrugIds = (await tx.prescriptionItem.findMany({ where: { drug: { isSample: true } }, select: { drugId: true } })).map((i) => i.drugId);
      await tx.drug.updateMany({ where: { id: { in: usedDrugIds } }, data: { isActive: false } });
      const drugs = (await tx.drug.deleteMany({ where: { isSample: true, id: { notIn: usedDrugIds } } })).count;
      await tx.session.deleteMany({ where: { user: { isSample: true } } });
      // Tài khoản mẫu còn dính dữ liệu (vd. đã soạn bộ ngưỡng) thì chỉ khoá lại thay vì xoá.
      const sampleUsers = await tx.user.findMany({ where: { isSample: true }, select: { id: true } });
      let usersDeleted = 0;
      for (const u of sampleUsers) {
        try {
          await tx.$executeRaw`SAVEPOINT xoa_tk`;
          await tx.auditLog.deleteMany({ where: { actorId: u.id } });
          await tx.user.delete({ where: { id: u.id } });
          usersDeleted++;
        } catch {
          await tx.$executeRaw`ROLLBACK TO SAVEPOINT xoa_tk`;
          await tx.user.update({ where: { id: u.id }, data: { isActive: false } });
        }
      }
      return { ...counts, drugs, usersDeleted, usersDeactivated: sampleUsers.length - usersDeleted };
    });
    console.log("Đã xoá dữ liệu mẫu:", result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
