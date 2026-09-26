// Phép tính thống kê vận hành (không phải chỉ số lâm sàng), tách riêng để kiểm thử độc lập với giao diện.

import type { MonthlySummary } from "@/domain/types";

/** Tỷ lệ đúng hẹn (%), làm tròn số nguyên. Trả về null khi chưa có lịch hẹn nào để tránh chia cho 0. */
export function onTimeRate(summary: MonthlySummary): number | null {
  if (summary.appointmentsDue === 0) return null;
  return Math.round((summary.appointmentsKept / summary.appointmentsDue) * 100);
}
