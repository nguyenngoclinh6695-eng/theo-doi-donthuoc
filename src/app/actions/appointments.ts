"use server";

import { revalidatePath } from "next/cache";
import { canReschedule, canTransition, parseAppointmentForm, type ApptStatus } from "@/domain/appointment";
import { requirePermission } from "@/lib/auth/dal";
import { writeAudit } from "@/lib/audit";
import { clinicDateTime } from "@/lib/appointments";
import { prisma } from "@/lib/db";
import { addDays, clinicPeriods, clinicTime, startOfClinicDay } from "@/lib/time";

export interface ApptState {
  error?: string;
  errors?: string[];
  ok?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES: ApptStatus[] = ["SCHEDULED", "ARRIVED", "NO_SHOW", "CANCELLED"];

function refresh() {
  revalidatePath("/tiep-don");
  revalidatePath("/kham-benh");
  revalidatePath("/");
}

/** Bệnh nhân đã có lịch (chưa huỷ) trong ngày đó chưa – tránh đặt trùng. */
async function existingSameDay(patientId: string, dateKey: string, exceptId?: string) {
  return prisma.appointment.findFirst({
    where: {
      patientId,
      status: { not: "CANCELLED" },
      scheduledAt: { gte: startOfClinicDay(dateKey), lt: startOfClinicDay(addDays(dateKey, 1)) },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
  });
}

export async function createAppointment(_prev: ApptState, fd: FormData): Promise<ApptState> {
  const user = await requirePermission("appointments.manage");
  const { data, errors } = parseAppointmentForm((n) => fd.get(n), clinicPeriods().todayKey);
  if (errors.length) return { errors };
  const patient = await prisma.patient.findUnique({ where: { id: data.patientId }, select: { id: true, fullName: true } });
  if (!patient) return { error: "Không tìm thấy bệnh nhân." };
  const dup = await existingSameDay(patient.id, data.dateKey);
  if (dup) return { error: `${patient.fullName} đã có lịch hẹn ngày này lúc ${clinicTime(dup.scheduledAt)}. Hãy đổi giờ lịch đó thay vì đặt thêm.` };

  const appt = await prisma.appointment.create({
    data: { patientId: patient.id, scheduledAt: clinicDateTime(data.dateKey, data.time), reason: data.reason, createdById: user.id },
  });
  await writeAudit({ actorId: user.id, action: "appointment.create", entityType: "Appointment", entityId: appt.id, details: { patientId: patient.id } });
  refresh();
  return { ok: `Đã đặt lịch cho ${patient.fullName} lúc ${data.time} ngày ${data.dateKey.split("-").reverse().join("/")}.` };
}

export async function rescheduleAppointment(appointmentId: string, _prev: ApptState, fd: FormData): Promise<ApptState> {
  const user = await requirePermission("appointments.manage");
  if (!UUID_RE.test(appointmentId)) return { error: "Mã lịch hẹn không hợp lệ." };
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: { visit: { select: { id: true } } } });
  if (!appt) return { error: "Không tìm thấy lịch hẹn." };
  if (!canReschedule(appt.status, appt.visit !== null)) return { error: "Lịch này đã khám hoặc đã huỷ – không đổi giờ được." };

  const { data, errors } = parseAppointmentForm((n) => fd.get(n), clinicPeriods().todayKey, { requirePatient: false });
  if (errors.length) return { errors };
  const dup = await existingSameDay(appt.patientId, data.dateKey, appt.id);
  if (dup) return { error: `Bệnh nhân đã có lịch khác ngày này lúc ${clinicTime(dup.scheduledAt)}.` };

  const to = clinicDateTime(data.dateKey, data.time);
  await prisma.appointment.update({ where: { id: appt.id }, data: { scheduledAt: to, status: "SCHEDULED" } });
  await writeAudit({
    actorId: user.id,
    action: "appointment.reschedule",
    entityType: "Appointment",
    entityId: appt.id,
    details: { from: appt.scheduledAt.toISOString(), to: to.toISOString() },
  });
  refresh();
  return { ok: "Đã đổi lịch." };
}

export async function setAppointmentStatus(appointmentId: string, to: ApptStatus): Promise<ApptState> {
  const user = await requirePermission("appointments.manage");
  if (!UUID_RE.test(appointmentId) || !STATUSES.includes(to)) return { error: "Dữ liệu không hợp lệ." };
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: { visit: { select: { id: true } } } });
  if (!appt) return { error: "Không tìm thấy lịch hẹn." };
  if (!canTransition(appt.status, to, appt.visit !== null)) return { error: "Không chuyển được sang trạng thái này." };

  await prisma.appointment.update({ where: { id: appt.id }, data: { status: to } });
  await writeAudit({ actorId: user.id, action: "appointment.status", entityType: "Appointment", entityId: appt.id, details: { from: appt.status, to } });
  refresh();
  return {};
}
