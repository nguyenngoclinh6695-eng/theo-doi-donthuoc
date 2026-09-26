// Truy vấn cho trang Tiếp đón & lịch hẹn. Quyền được kiểm tra ở trang/server action gọi tới.

import type { ApptStatus } from "@/domain/appointment";
import { prisma } from "@/lib/db";
import { dateKeyOf } from "@/lib/patients";
import { addDays, clinicTime, startOfClinicDay } from "@/lib/time";

/** Thời điểm "HH:mm" của ngày "YYYY-MM-DD" theo giờ phòng khám. */
export function clinicDateTime(dateKey: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  return new Date(startOfClinicDay(dateKey).getTime() + (h * 60 + m) * 60_000);
}

export interface DayAppointment {
  id: string;
  time: string;
  scheduledAt: string;
  status: ApptStatus;
  reason: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  phone: string | null;
  visitId: string | null;
}

export async function listAppointmentsOn(dateKey: string): Promise<DayAppointment[]> {
  const rows = await prisma.appointment.findMany({
    where: { scheduledAt: { gte: startOfClinicDay(dateKey), lt: startOfClinicDay(addDays(dateKey, 1)) } },
    orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
    include: { patient: { select: { id: true, fullName: true, code: true, phone: true } }, visit: { select: { id: true } } },
  });
  return rows.map((a) => ({
    id: a.id,
    time: clinicTime(a.scheduledAt),
    scheduledAt: a.scheduledAt.toISOString(),
    status: a.status,
    reason: a.reason,
    patientId: a.patient.id,
    patientName: a.patient.fullName,
    patientCode: a.patient.code,
    phone: a.patient.phone,
    visitId: a.visit?.id ?? null,
  }));
}

/**
 * Đơn đã chốt có ngày hẹn tái khám (từ hôm nay trở đi) mà bệnh nhân CHƯA có lịch hẹn vào đúng ngày đó.
 * Hệ thống không tự đặt lịch (không đoán giờ) – chỉ liệt kê để tiếp đón đặt.
 */
export async function pendingFollowUps(todayKey: string) {
  const rxs = await prisma.prescription.findMany({
    where: { status: "FINALIZED", followUpDate: { gte: new Date(`${todayKey}T00:00:00Z`) } },
    orderBy: { followUpDate: "asc" },
    take: 100,
    include: { patient: { select: { id: true, fullName: true, code: true } } },
  });
  const result = [];
  for (const rx of rxs) {
    const dayKey = dateKeyOf(rx.followUpDate!);
    const booked = await prisma.appointment.count({
      where: {
        patientId: rx.patientId,
        status: { not: "CANCELLED" },
        scheduledAt: { gte: startOfClinicDay(dayKey), lt: startOfClinicDay(addDays(dayKey, 1)) },
      },
    });
    if (booked === 0) {
      result.push({ prescriptionId: rx.id, code: rx.code, followUpDate: dayKey, patientId: rx.patient.id, patientName: rx.patient.fullName, patientCode: rx.patient.code });
    }
  }
  return result;
}

export async function getPatientBrief(id: string) {
  return prisma.patient.findUnique({ where: { id }, select: { id: true, fullName: true, code: true, phone: true } });
}
