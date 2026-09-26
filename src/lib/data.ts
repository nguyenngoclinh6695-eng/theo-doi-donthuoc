// Lớp truy cập dữ liệu. Giao diện chỉ gọi các hàm ở đây và chỉ nhận kiểu trong src/domain/types.ts,
// không nhận thẳng object của Prisma – để đổi cách lưu trữ sau này không phải sửa giao diện.

import type {
  Appointment,
  AppointmentStatus,
  CurrentUser,
  MonthlySummary,
  OverdueFollowUp,
  PrescriptionAwaitingScan,
  UserRole,
} from "@/domain/types";
import type { AppointmentStatus as DbAppointmentStatus, UserRole as DbUserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { clinicDateKey, clinicPeriods, clinicTime, daysBetween } from "@/lib/time";

const roleMap: Record<DbUserRole, UserRole> = {
  DOCTOR: "bac_si",
  NURSE: "dieu_duong",
  RECEPTION: "tiep_don",
  ADMIN: "quan_tri",
};

const appointmentStatusMap: Record<Exclude<DbAppointmentStatus, "CANCELLED">, AppointmentStatus> = {
  SCHEDULED: "cho",
  ARRIVED: "da_den",
  NO_SHOW: "vang",
};

/**
 * TẠM THỜI: chưa có đăng nhập, nên coi bác sĩ đầu tiên đang hoạt động là người dùng hiện tại.
 * Bước phân quyền sẽ thay bằng người dùng lấy từ phiên đăng nhập.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const user = await prisma.user.findFirst({
    where: { isActive: true, role: "DOCTOR" },
    orderBy: { createdAt: "asc" },
  });
  if (!user) throw new Error("Chưa có người dùng nào trong database. Chạy: npm run db:seed");
  return { id: user.id, fullName: user.fullName, role: roleMap[user.role] };
}

export async function hasSampleData(): Promise<boolean> {
  return (await prisma.patient.count({ where: { isSample: true } })) > 0;
}

export async function getTodayAppointments(): Promise<Appointment[]> {
  const { todayStart, tomorrowStart } = clinicPeriods();
  const rows = await prisma.appointment.findMany({
    where: { scheduledAt: { gte: todayStart, lt: tomorrowStart }, status: { not: "CANCELLED" } },
    orderBy: { scheduledAt: "asc" },
    include: { patient: { select: { id: true, fullName: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    time: clinicTime(r.scheduledAt),
    patientId: r.patient.id,
    patientName: r.patient.fullName,
    reason: r.reason,
    status: appointmentStatusMap[r.status as Exclude<DbAppointmentStatus, "CANCELLED">],
  }));
}

/**
 * Bệnh nhân trễ hẹn = có lịch hẹn trước hôm nay mà không đến (vắng hoặc chưa cập nhật),
 * sau đó chưa quay lại khám và cũng chưa được hẹn lịch mới.
 */
export async function getOverdueFollowUps(): Promise<OverdueFollowUp[]> {
  const { todayStart, todayKey } = clinicPeriods();
  // Quy mô một phòng khám nên lọc phần "chưa quay lại" bằng JS cho dễ đọc; khi dữ liệu lớn có thể chuyển sang SQL.
  const missed = await prisma.appointment.findMany({
    where: { scheduledAt: { lt: todayStart }, status: { in: ["SCHEDULED", "NO_SHOW"] } },
    orderBy: { scheduledAt: "asc" },
    include: {
      patient: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          visits: { orderBy: { visitedAt: "desc" }, take: 1, select: { visitedAt: true } },
          appointments: {
            where: { status: { not: "CANCELLED" } },
            orderBy: { scheduledAt: "desc" },
            take: 1,
            select: { id: true },
          },
        },
      },
      reminderCalls: { orderBy: { calledAt: "desc" }, take: 1, select: { calledAt: true } },
    },
  });

  return missed
    .filter((a) => {
      const isLatestAppointment = a.patient.appointments[0]?.id === a.id;
      const lastVisit = a.patient.visits[0]?.visitedAt;
      const cameBackAfter = lastVisit !== undefined && lastVisit >= a.scheduledAt;
      return isLatestAppointment && !cameBackAfter;
    })
    .map((a) => {
      const missedKey = clinicDateKey(a.scheduledAt);
      return {
        id: a.id,
        appointmentId: a.id,
        patientId: a.patient.id,
        patientName: a.patient.fullName,
        missedDate: missedKey,
        daysOverdue: daysBetween(missedKey, todayKey),
        phone: a.patient.phone ?? "",
        lastCalledAt: a.reminderCalls[0]?.calledAt.toISOString() ?? null,
      };
    })
    .sort((x, y) => y.daysOverdue - x.daysOverdue);
}

export async function getPrescriptionsAwaitingScan(): Promise<PrescriptionAwaitingScan[]> {
  const rows = await prisma.prescription.findMany({
    where: { status: "FINALIZED", scanUploadedAt: null },
    orderBy: { finalizedAt: "asc" },
    include: { patient: { select: { fullName: true } }, doctor: { select: { fullName: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    patientName: r.patient.fullName,
    doctorName: r.doctor.fullName,
    finalizedAt: (r.finalizedAt ?? r.createdAt).toISOString(),
  }));
}

export async function getMonthlySummary(): Promise<MonthlySummary> {
  const { monthKey, monthStart, todayStart, weekStart, tomorrowStart } = clinicPeriods();
  // Chỉ tính lịch hẹn đến hết hôm qua: lịch hôm nay còn đang diễn ra, tính vào sẽ kéo tỷ lệ xuống sai.
  const dueWhere = { scheduledAt: { gte: monthStart, lt: todayStart }, status: { not: "CANCELLED" as const } };
  const [appointmentsDue, appointmentsKept, visitsThisWeek] = await Promise.all([
    prisma.appointment.count({ where: dueWhere }),
    prisma.appointment.count({ where: { ...dueWhere, status: "ARRIVED" } }),
    prisma.visit.count({ where: { visitedAt: { gte: weekStart, lt: tomorrowStart } } }),
  ]);
  return { month: monthKey, appointmentsDue, appointmentsKept, visitsThisWeek };
}
