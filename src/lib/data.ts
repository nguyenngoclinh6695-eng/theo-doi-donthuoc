// Lớp truy cập dữ liệu. Giao diện chỉ gọi các hàm ở đây.
// Hiện trả về dữ liệu mẫu; bước sau chỉ cần đổi phần thân hàm sang Prisma, giữ nguyên chữ ký.

import type {
  Appointment,
  CurrentUser,
  MonthlySummary,
  OverdueFollowUp,
  PrescriptionAwaitingScan,
} from "@/domain/types";
import {
  mockCurrentUser,
  mockMonthlySummary,
  mockOverdueFollowUps,
  mockPrescriptionsAwaitingScan,
  mockTodayAppointments,
} from "@/mocks/dashboard";

export async function getCurrentUser(): Promise<CurrentUser> {
  return mockCurrentUser;
}

export async function getTodayAppointments(): Promise<Appointment[]> {
  return [...mockTodayAppointments].sort((a, b) => a.time.localeCompare(b.time));
}

export async function getOverdueFollowUps(): Promise<OverdueFollowUp[]> {
  // Trễ lâu nhất lên đầu để ưu tiên gọi trước.
  return [...mockOverdueFollowUps].sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export async function getPrescriptionsAwaitingScan(): Promise<PrescriptionAwaitingScan[]> {
  return mockPrescriptionsAwaitingScan;
}

export async function getMonthlySummary(): Promise<MonthlySummary> {
  return mockMonthlySummary;
}
