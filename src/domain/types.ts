// Kiểu dữ liệu nghiệp vụ dùng chung. Giao diện chỉ phụ thuộc vào các kiểu này,
// nên khi thay dữ liệu mẫu bằng database (Prisma) thì giao diện không phải sửa.

export type UserRole = "bac_si" | "dieu_duong" | "tiep_don" | "quan_tri" | "duoc_si" | "ky_thuat_vien";

export interface CurrentUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
}

export type AppointmentStatus = "cho" | "da_den" | "vang";

export interface Appointment {
  id: string;
  /** Giờ hẹn dạng "HH:mm", theo giờ Việt Nam. */
  time: string;
  patientId: string;
  patientName: string;
  /** Lý do tái khám do nhân viên ghi khi đặt hẹn (văn bản tự do, không phải chẩn đoán). */
  reason: string;
  status: AppointmentStatus;
}

export interface OverdueFollowUp {
  id: string;
  /** Lịch hẹn bị lỡ; lượt gọi nhắc được ghi gắn với lịch hẹn này. */
  appointmentId: string;
  /** Lần gọi nhắc gần nhất cho lịch hẹn này (ISO), null nếu chưa gọi. */
  lastCalledAt: string | null;
  patientId: string;
  patientName: string;
  /** Ngày hẹn đã lỡ, dạng ISO "YYYY-MM-DD". */
  missedDate: string;
  /** Số ngày tính từ ngày hẹn đến hôm nay. */
  daysOverdue: number;
  phone: string;
}

export interface PrescriptionAwaitingScan {
  id: string;
  /** Số đơn nội bộ. */
  code: string;
  patientName: string;
  doctorName: string;
  /** Thời điểm chốt đơn, ISO. */
  finalizedAt: string;
}

export interface MonthlySummary {
  /** Tháng đang thống kê, dạng "YYYY-MM". */
  month: string;
  /** Số lịch hẹn từ đầu tháng đến hết hôm qua (không tính lịch huỷ). */
  appointmentsDue: number;
  /** Trong số đó, số lượt bệnh nhân đến đúng ngày hẹn. */
  appointmentsKept: number;
  /** Số lượt khám từ thứ Hai tuần này đến hôm nay. */
  visitsThisWeek: number;
}
