// Nạp DỮ LIỆU MẪU cho máy phát triển. Mọi tên, số điện thoại, mã số đều là giả.
// Ngày giờ được tính tương đối theo "hôm nay" để trang Tổng quan luôn có số liệu hợp lý mỗi khi seed lại.
//
// Chạy: npm run db:seed   (xoá dữ liệu mẫu cũ rồi nạp lại)

import type { AppointmentStatus, Patient } from "../src/generated/prisma/client";
import { createPrismaClient } from "../src/lib/prisma-client";
import { addDays, clinicPeriods, daysBetween, startOfClinicDay } from "../src/lib/time";

try {
  process.loadEnvFile();
} catch {}

const prisma = createPrismaClient();

/** Thời điểm "HH:mm" của ngày dateKey theo giờ phòng khám. */
function at(dateKey: string, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(startOfClinicDay(dateKey).getTime() + (h * 60 + m) * 60_000);
}

const lastNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đỗ", "Bùi", "Ngô", "Dương"];
const middle = ["Văn", "Thị"];
const letters = ["A", "B", "C", "D", "E", "G", "H", "K", "L", "M", "N", "P", "Q", "S", "T", "V", "X", "Y"];
const reasons = [
  "Tái khám định kỳ theo lịch hẹn",
  "Tái khám, mang kết quả xét nghiệm",
  "Lấy đơn thuốc tháng tiếp theo",
  "Tái khám sau 2 tuần",
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Không chạy seed dữ liệu mẫu trên môi trường production.");
  }
  // An toàn: nếu database đã có bệnh nhân thật thì dừng, không xoá gì cả.
  const realPatients = await prisma.patient.count({ where: { isSample: false } });
  if (realPatients > 0) {
    throw new Error(`Database có ${realPatients} bệnh nhân không phải dữ liệu mẫu – dừng seed để tránh mất dữ liệu.`);
  }

  // Xoá dữ liệu mẫu cũ theo thứ tự phụ thuộc khoá ngoại.
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.reminderCall.deleteMany(),
    prisma.prescription.deleteMany(),
    prisma.visit.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.patient.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const [doctor1, doctor2, reception] = await Promise.all([
    prisma.user.create({ data: { username: "bs.mau1", fullName: "BS. Mẫu Văn Một", role: "DOCTOR" } }),
    prisma.user.create({ data: { username: "bs.mau2", fullName: "BS. Mẫu Thị Hai", role: "DOCTOR" } }),
    prisma.user.create({ data: { username: "tiepdon.mau", fullName: "Mẫu Thị Tiếp Đón", role: "RECEPTION" } }),
  ]);
  const doctors = [doctor1, doctor2];

  // 30 bệnh nhân mẫu.
  const patients: Patient[] = [];
  for (let i = 0; i < 30; i++) {
    const sex = i % 2 === 0 ? "MALE" : "FEMALE";
    const name = `${lastNames[i % lastNames.length]} ${middle[i % 2]} ${letters[i % letters.length]}${i >= letters.length ? 2 : ""} (mẫu)`;
    patients.push(
      await prisma.patient.create({
        data: {
          code: `BN-MAU-${String(i + 1).padStart(4, "0")}`,
          fullName: name,
          sex,
          dateOfBirth: new Date(`${1950 + ((i * 7) % 45)}-${String((i % 12) + 1).padStart(2, "0")}-15`),
          phone: `0900000${String(100 + i * 7).padStart(3, "0")}`,
          address: "Địa chỉ mẫu, không có thật",
          isSample: true,
        },
      }),
    );
  }

  const p = clinicPeriods();
  const today = p.todayKey;
  const now = new Date();

  const createAppointment = (patientIdx: number, scheduledAt: Date, status: AppointmentStatus, reasonIdx = patientIdx) =>
    prisma.appointment.create({
      data: {
        patientId: patients[patientIdx].id,
        scheduledAt,
        status,
        reason: reasons[reasonIdx % reasons.length],
        createdById: reception.id,
      },
    });

  const createVisitFor = async (patientIdx: number, visitedAt: Date, appointmentId?: string) =>
    prisma.visit.create({
      data: { patientId: patients[patientIdx].id, doctorId: doctors[patientIdx % 2].id, visitedAt, appointmentId },
    });

  // 1) Lịch hẹn trong quá khứ của tháng này (và tháng trước) – dùng cho tỷ lệ đúng hẹn và lượt khám tuần.
  //    Bệnh nhân 10..29 xoay vòng; khoảng 1/6 số lịch là vắng nhưng đã quay lại khám sau đó (không tính trễ hẹn).
  let rotating = 10;
  const lastWasNoShow = new Map<number, boolean>();
  for (let back = 35; back >= 1; back--) {
    const dayKey = addDays(today, -back);
    const weekday = new Date(`${dayKey}T12:00:00Z`).getUTCDay();
    if (weekday === 0) continue; // Chủ nhật nghỉ
    for (const slot of ["08:00", "09:30", "14:30"]) {
      const idx = rotating;
      rotating = rotating === 29 ? 10 : rotating + 1;
      const noShow = (back + slot.length + idx) % 6 === 0;
      const appt = await createAppointment(idx, at(dayKey, slot), noShow ? "NO_SHOW" : "ARRIVED");
      if (!noShow) await createVisitFor(idx, at(dayKey, slot), appt.id);
      lastWasNoShow.set(idx, noShow);
    }
  }
  // Ai vắng ở lần hẹn gần nhất thì coi như đã được hẹn lại vào tuần sau,
  // để danh sách trễ hẹn chỉ gồm đúng các ca ở mục 2.
  for (const [idx, noShow] of lastWasNoShow) {
    if (noShow) await createAppointment(idx, at(addDays(today, 3), "08:30"), "SCHEDULED");
  }

  // 2) Bệnh nhân trễ hẹn: lỡ hẹn 16, 9, 4 ngày trước và chưa quay lại.
  for (const [idx, daysAgo] of [[6, 16], [7, 9], [8, 4]] as const) {
    await createAppointment(idx, at(addDays(today, -daysAgo), "09:00"), "NO_SHOW");
  }

  // 3) Lịch hẹn hôm nay; trạng thái tuỳ theo giờ hiện tại so với giờ hẹn.
  const todaySlots = ["07:30", "08:00", "08:45", "09:30", "10:15", "14:00"];
  for (let i = 0; i < todaySlots.length; i++) {
    const when = at(today, todaySlots[i]);
    const passed = when.getTime() + 30 * 60_000 < now.getTime();
    const status: AppointmentStatus = !passed ? "SCHEDULED" : i === 2 ? "NO_SHOW" : "ARRIVED";
    const appt = await createAppointment(i, when, status);
    if (status === "ARRIVED") await createVisitFor(i, when, appt.id);
  }

  // 4) Đơn thuốc: vài đơn đã chốt có scan, 2 đơn đã chốt nhưng chưa có scan.
  const prescriptionPlan = [
    { idx: 0, daysAgo: 0, scanned: false },
    { idx: 11, daysAgo: 1, scanned: false },
    { idx: 12, daysAgo: 2, scanned: true },
    { idx: 13, daysAgo: 3, scanned: true },
  ];
  let seq = 180;
  for (const plan of prescriptionPlan) {
    const finalizedAt = at(addDays(today, -plan.daysAgo), "08:05");
    await prisma.prescription.create({
      data: {
        code: `ĐT-MAU-${String(++seq).padStart(4, "0")}`,
        patientId: patients[plan.idx].id,
        doctorId: doctors[plan.idx % 2].id,
        status: "FINALIZED",
        finalizedAt,
        signedScanPath: plan.scanned ? `mau/scan-${seq}.pdf` : null,
        scanUploadedAt: plan.scanned ? new Date(finalizedAt.getTime() + 3_600_000) : null,
      },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    patients: await prisma.patient.count(),
    appointments: await prisma.appointment.count(),
    visits: await prisma.visit.count(),
    prescriptions: await prisma.prescription.count(),
  };
  console.log(`Đã nạp dữ liệu mẫu (ngày ${today}, ${daysBetween(`${p.monthKey}-01`, today) + 1} ngày đầu tháng):`, counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
