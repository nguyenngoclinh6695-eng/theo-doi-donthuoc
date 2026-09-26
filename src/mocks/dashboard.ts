// DỮ LIỆU MẪU – toàn bộ tên, số điện thoại, mã đơn dưới đây là giả, không thuộc về người thật.
// Sẽ được thay bằng truy vấn database ở bước 2.

import type {
  Appointment,
  CurrentUser,
  MonthlySummary,
  OverdueFollowUp,
  PrescriptionAwaitingScan,
} from "@/domain/types";

export const mockCurrentUser: CurrentUser = {
  id: "u-mau-01",
  fullName: "BS. Mẫu Văn Một",
  role: "bac_si",
};

export const mockTodayAppointments: Appointment[] = [
  { id: "a1", time: "07:30", patientId: "bn-01", patientName: "Nguyễn Văn A (mẫu)", reason: "Tái khám định kỳ theo lịch hẹn", status: "da_den" },
  { id: "a2", time: "08:00", patientId: "bn-02", patientName: "Trần Thị B (mẫu)", reason: "Tái khám, mang kết quả xét nghiệm", status: "da_den" },
  { id: "a3", time: "08:45", patientId: "bn-03", patientName: "Lê Văn C (mẫu)", reason: "Tái khám định kỳ theo lịch hẹn", status: "vang" },
  { id: "a4", time: "09:30", patientId: "bn-04", patientName: "Phạm Thị D (mẫu)", reason: "Lấy đơn thuốc tháng tiếp theo", status: "cho" },
  { id: "a5", time: "10:15", patientId: "bn-05", patientName: "Hoàng Văn E (mẫu)", reason: "Tái khám sau 2 tuần", status: "cho" },
  { id: "a6", time: "14:00", patientId: "bn-06", patientName: "Vũ Thị G (mẫu)", reason: "Tái khám định kỳ theo lịch hẹn", status: "cho" },
];

export const mockOverdueFollowUps: OverdueFollowUp[] = [
  { id: "o1", patientId: "bn-11", patientName: "Đỗ Văn H (mẫu)", missedDate: "2026-09-10", daysOverdue: 16, phone: "0900000111" },
  { id: "o2", patientId: "bn-12", patientName: "Bùi Thị K (mẫu)", missedDate: "2026-09-17", daysOverdue: 9, phone: "0900000222" },
  { id: "o3", patientId: "bn-13", patientName: "Ngô Văn L (mẫu)", missedDate: "2026-09-22", daysOverdue: 4, phone: "0900000333" },
];

export const mockPrescriptionsAwaitingScan: PrescriptionAwaitingScan[] = [
  { id: "p1", code: "ĐT-MAU-0192", patientName: "Nguyễn Văn A (mẫu)", doctorName: "BS. Mẫu Văn Một", finalizedAt: "2026-09-26T07:52:00+07:00" },
  { id: "p2", code: "ĐT-MAU-0188", patientName: "Trần Thị M (mẫu)", doctorName: "BS. Mẫu Thị Hai", finalizedAt: "2026-09-25T15:20:00+07:00" },
];

export const mockMonthlySummary: MonthlySummary = {
  month: "2026-09",
  appointmentsDue: 64,
  appointmentsKept: 53,
  visitsThisWeek: 41,
};
