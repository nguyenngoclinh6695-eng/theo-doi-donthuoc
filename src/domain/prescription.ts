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
  dosageInstruction: string;
  durationDays: number | null;
}

export interface PrescriptionCheckInput {
  patient: PatientForPrescription;
  diagnosisText: string | null;
  lines: PrescriptionLine[];
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
    if (age.months < GUARDIAN_REQUIRED_UNDER_MONTHS && !p.guardianName) {
      errors.push(`Bệnh nhân dưới ${GUARDIAN_REQUIRED_UNDER_MONTHS} tháng tuổi: hồ sơ cần ghi tên cha/mẹ hoặc người giám hộ.`);
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
    if (!l.dosageInstruction.trim()) errors.push(`${n}: chưa ghi cách dùng.`);
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
