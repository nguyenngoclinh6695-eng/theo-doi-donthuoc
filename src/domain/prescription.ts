// Kiểm tra đơn thuốc trước khi CHỐT – chỉ kiểm tra TÍNH ĐẦY ĐỦ HÀNH CHÍNH của đơn.
// KHÔNG có kiểm tra lâm sàng (liều tối đa, tương tác, chống chỉ định...), KHÔNG gợi ý thuốc:
// những việc đó thuộc trách nhiệm chuyên môn của bác sĩ kê đơn.
//
// Danh sách trường bắt buộc dưới đây bám theo các ô có trên mẫu đơn; phòng khám cần đối chiếu lại với
// Phụ lục I Thông tư 26/2025/TT-BYT và chỉnh tại đây nếu văn bản yêu cầu khác.

import { ageOn, type Sex } from "./patient";
import type { DrugControl } from "./drug";

export interface PatientForPrescription {
  fullName: string;
  dateOfBirth: string | null;
  sex: Sex | null;
  address: string | null;
  idNumber: string | null;
  insuranceNo: string | null;
  guardianName: string | null;
}

export interface PrescriptionLine {
  drugId: string;
  drugName: string;
  drugActive: boolean;
  drugControl: DrugControl;
  quantity: number;
  /** Cách dùng theo Điều 6 khoản 6 TT 26/2025 – do bác sĩ ghi. */
  route: string | null;
  dosePerTime: string | null;
  timesPerDay: number | null;
  timing: string | null;
  durationDays: number | null;
}

export interface PrescriptionCheckInput {
  patient: PatientForPrescription;
  diagnosisText: string | null;
  lines: PrescriptionLine[];
  /** Cân nặng (kg) đo trong lượt khám; null nếu chưa đo. */
  weightKg: number | null;
  /** "YYYY-MM-DD" */
  todayKey: string;
  followUpDate: string | null;
}

export interface PrescriptionCheckResult {
  /** Lỗi chặn chốt đơn. */
  errors: string[];
  /** Lưu ý không chặn, bác sĩ tự quyết. */
  warnings: string[];
}

/** Trẻ dưới mức tháng tuổi này cần ghi tên cha/mẹ hoặc người giám hộ trên đơn. */
export const GUARDIAN_REQUIRED_UNDER_MONTHS = 72;
export const MAX_QUANTITY = 10000;
export const MAX_LINES = 30;

export function checkPrescription(input: PrescriptionCheckInput): PrescriptionCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const p = input.patient;

  // Thông tin bệnh nhân cần có trên đơn
  if (!p.fullName.trim()) errors.push("Hồ sơ thiếu họ tên bệnh nhân.");
  if (!p.dateOfBirth) errors.push("Hồ sơ thiếu ngày sinh (cần để ghi tuổi trên đơn).");
  if (!p.sex) errors.push("Hồ sơ thiếu giới tính.");
  if (!p.address) errors.push("Hồ sơ thiếu địa chỉ.");
  if (p.dateOfBirth) {
    const age = ageOn(p.dateOfBirth, input.todayKey);
    if (age.months < GUARDIAN_REQUIRED_UNDER_MONTHS) {
      if (!p.guardianName) errors.push(`Bệnh nhân dưới ${GUARDIAN_REQUIRED_UNDER_MONTHS} tháng tuổi: hồ sơ cần ghi tên cha/mẹ hoặc người đưa trẻ.`);
      if (input.weightKg === null) errors.push(`Bệnh nhân dưới ${GUARDIAN_REQUIRED_UNDER_MONTHS} tháng tuổi: cần ghi chỉ số “Cân nặng” trong lượt khám này.`);
    }
  }
  if (!p.idNumber) warnings.push("Hồ sơ chưa có số CCCD/định danh cá nhân.");

  // Nội dung đơn do bác sĩ ghi
  if (!input.diagnosisText?.trim()) errors.push("Chưa ghi chẩn đoán.");
  if (input.lines.length === 0) errors.push("Đơn chưa có thuốc nào.");
  if (input.lines.length > MAX_LINES) errors.push(`Đơn có quá ${MAX_LINES} dòng thuốc.`);
  if (input.followUpDate && input.followUpDate <= input.todayKey) errors.push("Ngày hẹn tái khám phải sau hôm nay.");

  const seen = new Set<string>();
  input.lines.forEach((l, i) => {
    const n = `Dòng ${i + 1} (${l.drugName})`;
    if (seen.has(l.drugId)) errors.push(`${n}: thuốc bị trùng với dòng khác.`);
    seen.add(l.drugId);
    if (!l.drugActive) errors.push(`${n}: thuốc đã ngừng dùng trong danh mục.`);
    // Fail-closed: hệ thống chưa hỗ trợ mẫu đơn riêng cho thuốc kiểm soát đặc biệt.
    if (l.drugControl !== "thuong") errors.push(`${n}: thuốc thuộc diện kiểm soát đặc biệt, cần kê bằng mẫu đơn riêng – hệ thống chưa hỗ trợ.`);
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > MAX_QUANTITY) errors.push(`${n}: số lượng phải là số nguyên từ 1 đến ${MAX_QUANTITY}.`);
    const missing = [
      !l.route?.trim() && "đường dùng",
      !l.dosePerTime?.trim() && "liều mỗi lần",
      l.timesPerDay === null && "số lần/ngày",
      !l.timing?.trim() && "thời điểm dùng",
      l.durationDays === null && "số ngày dùng",
    ].filter(Boolean);
    if (missing.length) errors.push(`${n}: chưa ghi ${missing.join(", ")}.`);
    if (l.timesPerDay !== null && (!Number.isInteger(l.timesPerDay) || l.timesPerDay < 1 || l.timesPerDay > 24)) errors.push(`${n}: số lần/ngày phải từ 1 đến 24.`);
    if (l.durationDays !== null && (!Number.isInteger(l.durationDays) || l.durationDays < 1 || l.durationDays > 365)) {
      errors.push(`${n}: số ngày dùng phải từ 1 đến 365.`);
    }
  });

  return { errors, warnings };
}

/** Ảnh chụp thông tin bệnh nhân in trên đơn, lưu lúc chốt. */
export interface PatientSnapshot extends PatientForPrescription {
  code: string;
  phone: string | null;
  /** Tuổi đã tính lúc chốt, vd. "45 tuổi" hoặc "30 tháng tuổi". */
  ageText: string;
}

export interface UsageParts {
  route: string | null;
  dosePerTime: string | null;
  timesPerDay: number | null;
  timing: string | null;
  durationDays: number | null;
  /** Ghi chú thêm (không bắt buộc). */
  note?: string | null;
}

/**
 * Câu cách dùng in trên đơn – cùng công thức với template in (Điều 6 khoản 6 TT 26/2025):
 * "Uống: mỗi lần 1 viên, ngày 2 lần, sau ăn. Dùng 5 ngày."
 */
export function usageText(u: UsageParts): string {
  const base = `${u.route ?? ""}: mỗi lần ${u.dosePerTime ?? ""}, ngày ${u.timesPerDay ?? ""} lần, ${u.timing ?? ""}. Dùng ${u.durationDays ?? ""} ngày.`;
  return u.note?.trim() ? `${base} ${u.note.trim()}` : base;
}

/** Số lượng in trên đơn: dưới 10 thì thêm số 0 phía trước (Điều 6 khoản 7a TT 26/2025). */
export const printedQuantity = (n: number) => (Number.isInteger(n) && n >= 0 && n < 10 ? `0${n}` : String(n));
