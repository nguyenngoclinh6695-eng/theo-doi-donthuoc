// Nạp DỮ LIỆU MẪU cho máy phát triển. Mọi tên, số điện thoại, mã số đều là giả.
// Ngày giờ được tính tương đối theo "hôm nay" để trang Tổng quan luôn có số liệu hợp lý mỗi khi seed lại.
//
// Chạy: npm run db:seed   (xoá dữ liệu mẫu cũ rồi nạp lại)

import type { AppointmentStatus, Patient } from "../src/generated/prisma/client";
import { drugSearchText } from "../src/domain/drug";
import { buildSearchText } from "../src/domain/patient";
import { hashPassword, PASSWORD_MIN_LENGTH } from "../src/lib/auth/password";
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

  // Thư viện chuẩn là dữ liệu chuyên môn do người dùng nhập (không có bản mẫu) – có dữ liệu thì dừng, không xoá.
  const sources = await prisma.standardSource.count();
  if (sources > 0) {
    throw new Error(`Thư viện chuẩn đã có ${sources} văn bản nguồn – dừng seed để không làm mất ngưỡng đã nhập và duyệt.`);
  }

  // Xoá dữ liệu mẫu cũ theo thứ tự phụ thuộc khoá ngoại.
  // Tài khoản thật và thuốc thật (isSample = false) được giữ nguyên, kèm phiên đăng nhập và nhật ký của họ.
  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { actor: { isSample: true } } }),
    prisma.session.deleteMany({ where: { user: { isSample: true } } }),
    prisma.measurement.deleteMany(),
    prisma.reminderCall.deleteMany(),
    prisma.prescription.deleteMany(), // Xoá kèm các dòng thuốc (cascade), nên phải trước khi xoá thuốc mẫu
    prisma.drug.deleteMany({ where: { isSample: true } }),
    prisma.visit.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.patient.deleteMany(),
    prisma.user.deleteMany({ where: { isSample: true } }),
  ]);
  // Chỉ có dữ liệu mẫu nên đặt lại bộ đếm mã bệnh nhân: hồ sơ thật đầu tiên sẽ là BN-000001.
  await prisma.$executeRaw`ALTER SEQUENCE "patient_code_seq" RESTART WITH 1`;
  await prisma.$executeRaw`ALTER SEQUENCE "prescription_code_seq" RESTART WITH 1`;

  // Tài khoản mẫu dùng chung một mật khẩu lấy từ .env (SEED_USER_PASSWORD), không ghi cứng trong code.
  // Không bắt đổi mật khẩu để tiện chuyển qua lại giữa các vai trò khi thử nghiệm.
  const seedPassword = process.env.SEED_USER_PASSWORD;
  if (!seedPassword || seedPassword.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Đặt SEED_USER_PASSWORD (ít nhất ${PASSWORD_MIN_LENGTH} ký tự) trong file .env trước khi seed.`);
  }
  const passwordHash = await hashPassword(seedPassword);
  const account = (username: string, fullName: string, role: "DOCTOR" | "NURSE" | "RECEPTION" | "ADMIN") =>
    prisma.user.create({ data: { username, fullName, role, passwordHash, mustChangePassword: false, isSample: true } });

  const [doctor1, doctor2, reception] = await Promise.all([
    account("bs.mau1", "BS. Mẫu Văn Một", "DOCTOR"),
    account("bs.mau2", "BS. Mẫu Thị Hai", "DOCTOR"),
    account("tiepdon.mau", "Mẫu Thị Tiếp Đón", "RECEPTION"),
    account("dieuduong.mau", "ĐD. Mẫu Thị Ba", "NURSE"),
    account("quantri.mau", "Mẫu Văn Quản Trị", "ADMIN"),
  ]);
  const doctors = [doctor1, doctor2];

  // 30 bệnh nhân mẫu.
  const patients: Patient[] = [];
  for (let i = 0; i < 30; i++) {
    const sex = i % 2 === 0 ? "MALE" : "FEMALE";
    const name = `${lastNames[i % lastNames.length]} ${middle[i % 2]} ${letters[i % letters.length]}${i >= letters.length ? 2 : ""} (mẫu)`;
    const code = `BN-MAU-${String(i + 1).padStart(4, "0")}`;
    const phone = `0900000${String(100 + i * 7).padStart(3, "0")}`;
    // Bệnh nhân số 10 là trẻ nhỏ (3 tuổi) để thử hiển thị tuổi theo tháng và người giám hộ.
    const isChild = i === 9;
    patients.push(
      await prisma.patient.create({
        data: {
          code,
          fullName: name,
          sex,
          dateOfBirth: isChild
            ? new Date(`${addDays(clinicPeriods().todayKey, -3 * 365 - 40)}T00:00:00Z`)
            : new Date(`${1950 + ((i * 7) % 45)}-${String((i % 12) + 1).padStart(2, "0")}-15`),
          phone,
          address: "Địa chỉ mẫu, không có thật",
          guardianName: isChild ? "Người giám hộ mẫu" : null,
          allergyNote: i === 0 ? "Ghi chú dị ứng mẫu – dữ liệu thử nghiệm, không phải thông tin thật." : null,
          searchText: buildSearchText({ fullName: name, code, phone }),
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

  // 5) Loại chỉ số: CHỈ tên và đơn vị, KHÔNG có ngưỡng nào (ngưỡng phải nhập ở Thư viện chuẩn kèm văn bản nguồn).
  //    Dùng upsert theo mã để không xoá loại chỉ số người dùng đã tự thêm.
  const measurementTypes: [code: string, name: string, unit: string, decimals: number][] = [
    ["HA_TAM_THU", "Huyết áp tâm thu", "mmHg", 0],
    ["HA_TAM_TRUONG", "Huyết áp tâm trương", "mmHg", 0],
    ["MACH", "Mạch", "lần/phút", 0],
    ["NHIET_DO", "Nhiệt độ", "°C", 1],
    ["SPO2", "SpO2", "%", 0],
    ["DUONG_HUYET_DOI", "Đường huyết lúc đói", "mmol/L", 1],
    ["HBA1C", "HbA1c", "%", 1],
    ["CAN_NANG", "Cân nặng", "kg", 1],
    ["CHIEU_CAO", "Chiều cao", "cm", 0],
  ];
  for (const [i, [code, name, unit, decimals]] of measurementTypes.entries()) {
    await prisma.measurementType.upsert({ where: { code }, update: {}, create: { code, name, unit, decimals, sortOrder: i + 1 } });
  }

  // 6) Thuốc mẫu cho danh mục (đánh dấu isSample, tên thương mại ghi rõ là mẫu). Chỉ để thử chức năng chọn thuốc.
  const sampleDrugs: [ingredient: string, strength: string, form: string, unit: string][] = [
    ["Paracetamol", "500 mg", "Viên nén", "viên"],
    ["Amoxicillin", "500 mg", "Viên nang", "viên"],
    ["Metformin", "500 mg", "Viên nén", "viên"],
    ["Amlodipin", "5 mg", "Viên nén", "viên"],
    ["Omeprazol", "20 mg", "Viên nang", "viên"],
    ["Natri clorid", "0,9% – 10 ml", "Dung dịch nhỏ mắt", "lọ"],
  ];
  for (const [activeIngredient, strength, dosageForm, unit] of sampleDrugs) {
    const brandName = "Thuốc mẫu";
    await prisma.drug.create({
      data: { activeIngredient, strength, dosageForm, unit, brandName, isSample: true, searchText: drugSearchText({ activeIngredient, strength, brandName }) },
    });
  }
  await prisma.drug.create({
    data: {
      activeIngredient: "Thuốc kiểm soát đặc biệt (mẫu)",
      strength: "10 mg",
      dosageForm: "Viên nén",
      unit: "viên",
      control: "PSYCHOTROPIC",
      isSample: true,
      note: "Mục mẫu để thử việc chặn kê thuốc cần mẫu đơn riêng.",
      searchText: drugSearchText({ activeIngredient: "Thuốc kiểm soát đặc biệt (mẫu)", strength: "10 mg", brandName: null }),
    },
  });

  // 4) Đơn thuốc: vài đơn đã chốt có scan, 2 đơn đã chốt nhưng chưa có scan.
  const prescriptionPlan = [
    { idx: 0, daysAgo: 0, scanned: false },
    { idx: 11, daysAgo: 1, scanned: false },
    { idx: 12, daysAgo: 2, scanned: true },
    { idx: 13, daysAgo: 3, scanned: true },
  ];
  let seq = 180;
  const firstDrug = await prisma.drug.findFirstOrThrow({ where: { isSample: true, control: "NORMAL" }, orderBy: { activeIngredient: "asc" } });
  for (const plan of prescriptionPlan) {
    const finalizedAt = at(addDays(today, -plan.daysAgo), "08:05");
    const pt = patients[plan.idx];
    await prisma.prescription.create({
      data: {
        code: `ĐT-MAU-${String(++seq).padStart(4, "0")}`,
        patientId: pt.id,
        doctorId: doctors[plan.idx % 2].id,
        status: "FINALIZED",
        finalizedAt,
        diagnosisText: "Chẩn đoán mẫu – dữ liệu thử nghiệm",
        patientSnapshot: {
          code: pt.code,
          fullName: pt.fullName,
          dateOfBirth: pt.dateOfBirth?.toISOString().slice(0, 10) ?? null,
          sex: pt.sex === "MALE" ? "nam" : "nu",
          address: pt.address,
          phone: pt.phone,
          idNumber: null,
          insuranceNo: null,
          guardianName: pt.guardianName,
          ageText: "",
        },
        signedScanPath: plan.scanned ? `mau/scan-${seq}.pdf` : null,
        scanUploadedAt: plan.scanned ? new Date(finalizedAt.getTime() + 3_600_000) : null,
        items: {
          create: {
            drugId: firstDrug.id,
            drugName: `${firstDrug.activeIngredient} ${firstDrug.strength} (${firstDrug.brandName})`,
            drugDosageForm: firstDrug.dosageForm,
            unit: firstDrug.unit,
            quantity: 10,
            dosageInstruction: "Cách dùng mẫu – dữ liệu thử nghiệm",
          },
        },
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
  console.log("Tài khoản mẫu: bs.mau1, bs.mau2, dieuduong.mau, tiepdon.mau, quantri.mau – mật khẩu là SEED_USER_PASSWORD trong .env");
  console.log(`Đã nạp dữ liệu mẫu (ngày ${today}, ${daysBetween(`${p.monthKey}-01`, today) + 1} ngày đầu tháng):`, counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
