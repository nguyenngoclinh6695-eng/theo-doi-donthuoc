// Bảng phân quyền theo vai trò – NGUỒN DUY NHẤT quyết định ai được làm gì.
// Menu, trang và server action đều hỏi qua hàm can(); muốn đổi quyền chỉ sửa bảng dưới đây.
//
// Nguyên tắc: mỗi vai trò chỉ có quyền tối thiểu cho công việc của mình.
// Quản trị lo tài khoản, danh mục, nhật ký – mặc định KHÔNG xem hồ sơ bệnh nhân.

import type { UserRole } from "@/domain/types";

export const PERMISSIONS = [
  "dashboard.view",
  "appointments.view",
  "appointments.manage",
  "reminders.record",
  "patients.view",
  "patients.edit",
  "visits.view",
  "visits.record",
  "prescriptions.view",
  "prescriptions.write", // Kê và chốt đơn – chỉ bác sĩ
  "prescriptions.uploadScan",
  "standards.view",
  "standards.manage",
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
    "prescriptions.view",
    "prescriptions.write",
    "prescriptions.uploadScan",
    "standards.view",
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
  quan_tri: ["dashboard.view", "standards.view", "standards.manage", "drugs.view", "drugs.manage", "users.manage", "audit.view"],
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
