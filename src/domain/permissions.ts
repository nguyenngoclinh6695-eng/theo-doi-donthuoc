// Bảng phân quyền theo vai trò – NGUỒN DUY NHẤT quyết định ai được làm gì.
// Menu, trang và server action đều hỏi qua hàm can(); muốn đổi quyền chỉ sửa bảng dưới đây.
//
// Nguyên tắc: mỗi vai trò chỉ có quyền tối thiểu cho công việc của mình.
// Riêng Quản trị được TOÀN QUYỀN theo yêu cầu của phòng khám (kể cả kê/chốt đơn, duyệt ngưỡng).
// Quy tắc hai người vẫn áp dụng cho mọi vai trò: không ai tự duyệt bộ ngưỡng do chính mình soạn.

import type { UserRole } from "@/domain/types";

export const PERMISSIONS = [
  "dashboard.view",
  "appointments.view",
  "appointments.manage",
  "reminders.record",
  "patients.view",
  "patients.edit",
  "visits.view",
  "visits.record", // Mở lượt khám, ghi chỉ số
  "visits.diagnose", // Ghi chẩn đoán và ghi chép khám – chỉ bác sĩ
  "prescriptions.view",
  "prescriptions.write", // Kê và chốt đơn – chỉ bác sĩ
  "prescriptions.uploadScan",
  "standards.view",
  "standards.manage", // Soạn bộ ngưỡng (bản nháp), thêm văn bản nguồn, loại chỉ số
  "standards.approve", // Duyệt để bộ ngưỡng có hiệu lực / ngừng áp dụng – chỉ bác sĩ, và không tự duyệt bản mình soạn
  "drugs.view",
  "drugs.manage",
  "users.manage",
  "audit.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  bac_si: [
    "dashboard.view",
    "appointments.view",
    "appointments.manage",
    "reminders.record",
    "patients.view",
    "patients.edit",
    "visits.view",
    "visits.record",
    "visits.diagnose",
    "prescriptions.view",
    "prescriptions.write",
    "prescriptions.uploadScan",
    "standards.view",
    "standards.manage",
    "standards.approve",
    "drugs.view",
  ],
  dieu_duong: [
    "dashboard.view",
    "appointments.view",
    "appointments.manage",
    "reminders.record",
    "patients.view",
    "patients.edit",
    "visits.view",
    "visits.record",
    "prescriptions.view",
    "prescriptions.uploadScan",
    "standards.view",
    "drugs.view",
  ],
  tiep_don: [
    "dashboard.view",
    "appointments.view",
    "appointments.manage",
    "reminders.record",
    "patients.view",
    "patients.edit",
    "prescriptions.uploadScan",
  ],
  duoc_si: [
    "dashboard.view",
    "patients.view",
    "prescriptions.view",
    "prescriptions.uploadScan",
    "drugs.view",
    "drugs.manage",
    "standards.view",
  ],
  // Kỹ thuật viên: đo chỉ số và nhập kết quả xét nghiệm (dưới dạng chỉ số); không chẩn đoán, không kê đơn.
  ky_thuat_vien: ["dashboard.view", "appointments.view", "patients.view", "visits.view", "visits.record", "standards.view"],
  quan_tri: PERMISSIONS,
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
