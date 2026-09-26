"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ageOn } from "@/domain/patient";
import { classify, parseDecimal } from "@/domain/standards";
import { requirePermission } from "@/lib/auth/dal";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { dateKeyOf, sexFromDb } from "@/lib/patients";
import { getActiveSetsByType } from "@/lib/standards";
import { clinicDateKey } from "@/lib/time";

export interface VisitActionState {
  error?: string;
  ok?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function openVisitOrThrow(visitId: string) {
  if (!UUID_RE.test(visitId)) throw new Error("Mã lượt khám không hợp lệ.");
  const visit = await prisma.visit.findUnique({ where: { id: visitId }, include: { patient: true } });
  if (!visit) throw new Error("Không tìm thấy lượt khám.");
  return visit;
}

/** Mở lượt khám cho bệnh nhân (từ lịch hẹn hôm nay hoặc khám không hẹn). */
export async function startVisit(patientId: string, appointmentId: string | null): Promise<void> {
  const user = await requirePermission("visits.record");
  if (!UUID_RE.test(patientId) || (appointmentId !== null && !UUID_RE.test(appointmentId))) throw new Error("Dữ liệu không hợp lệ.");

  if (appointmentId) {
    const existing = await prisma.visit.findUnique({ where: { appointmentId } });
    if (existing) redirect(`/kham-benh/${existing.id}`); // Lịch hẹn đã có lượt khám thì mở lại, không tạo trùng.
    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt || appt.patientId !== patientId) throw new Error("Lịch hẹn không khớp với bệnh nhân.");
  }

  const visit = await prisma.$transaction(async (tx) => {
    const created = await tx.visit.create({
      data: {
        patientId,
        appointmentId,
        startedById: user.id,
        // Bác sĩ mở lượt khám thì là bác sĩ phụ trách; điều dưỡng mở để đo trước thì bác sĩ nhận sau.
        doctorId: user.role === "bac_si" ? user.id : null,
        visitedAt: new Date(),
        status: "IN_PROGRESS",
      },
    });
    if (appointmentId) await tx.appointment.update({ where: { id: appointmentId }, data: { status: "ARRIVED" } });
    return created;
  });
  await writeAudit({ actorId: user.id, action: "visit.start", entityType: "Visit", entityId: visit.id, details: { patientId, appointmentId } });
  revalidatePath("/kham-benh");
  revalidatePath("/");
  redirect(`/kham-benh/${visit.id}`);
}

/** Ghi một chỉ số. Phân loại bằng Thư viện chuẩn ngay lúc ghi và lưu kèm căn cứ đã dùng. */
export async function recordMeasurement(visitId: string, _prev: VisitActionState, fd: FormData): Promise<VisitActionState> {
  const user = await requirePermission("visits.record");
  const visit = await openVisitOrThrow(visitId);
  if (visit.status !== "IN_PROGRESS") return { error: "Lượt khám đã kết thúc, không ghi thêm chỉ số." };

  const typeId = String(fd.get("measurementTypeId") ?? "");
  if (!UUID_RE.test(typeId)) return { error: "Chọn loại chỉ số." };
  const type = await prisma.measurementType.findUnique({ where: { id: typeId } });
  if (!type || !type.isActive) return { error: "Loại chỉ số không hợp lệ." };

  const raw = String(fd.get("value") ?? "");
  const value = parseDecimal(raw);
  if (value === null || Number.isNaN(value)) return { error: "Nhập giá trị là số (dùng dấu phẩy hoặc chấm cho phần thập phân)." };
  if (Math.abs(value) >= 1e8) return { error: "Giá trị quá lớn." };
  const decimals = (raw.trim().replace(",", ".").split(".")[1] ?? "").length;
  if (decimals > type.decimals) return { error: `${type.name} ghi tối đa ${type.decimals} chữ số thập phân.` };

  const now = new Date();
  const todayKey = clinicDateKey(now);
  const p = visit.patient;
  const result = classify(value, (await getActiveSetsByType([type.id])).get(type.id) ?? [], {
    dateKey: todayKey,
    ageYears: p.dateOfBirth ? ageOn(dateKeyOf(p.dateOfBirth), todayKey).years : null,
    sex: p.sex ? sexFromDb[p.sex] : null,
  });

  const m = await prisma.measurement.create({
    data: {
      visitId,
      patientId: visit.patientId,
      measurementTypeId: type.id,
      value: value.toString(),
      measuredAt: now,
      recordedById: user.id,
      classificationLabel: result.kind === "classified" ? result.label : null,
      standardSetId: result.kind === "classified" ? result.setId : null,
    },
  });
  await writeAudit({ actorId: user.id, action: "measurement.create", entityType: "Measurement", entityId: m.id, details: { visitId, type: type.code } });
  revalidatePath(`/kham-benh/${visitId}`);
  return { ok: `Đã ghi ${type.name}.` };
}

/** Xoá chỉ số ghi nhầm (chỉ khi lượt khám còn đang mở). Có ghi nhật ký. */
export async function deleteMeasurement(measurementId: string): Promise<void> {
  const user = await requirePermission("visits.record");
  if (!UUID_RE.test(measurementId)) throw new Error("Mã không hợp lệ.");
  const m = await prisma.measurement.findUnique({ where: { id: measurementId }, include: { visit: true, measurementType: true } });
  if (!m) throw new Error("Không tìm thấy chỉ số.");
  if (m.visit.status !== "IN_PROGRESS") throw new Error("Lượt khám đã kết thúc, không xoá được chỉ số.");
  await prisma.measurement.delete({ where: { id: measurementId } });
  await writeAudit({ actorId: user.id, action: "measurement.delete", entityType: "Measurement", entityId: measurementId, details: { visitId: m.visitId, type: m.measurementType.code } });
  revalidatePath(`/kham-benh/${m.visitId}`);
}

/** Bác sĩ ghi lý do khám, chẩn đoán, ghi chép. Bác sĩ lưu đầu tiên sẽ nhận làm bác sĩ phụ trách nếu chưa có. */
export async function saveVisitNotes(visitId: string, _prev: VisitActionState, fd: FormData): Promise<VisitActionState> {
  const user = await requirePermission("visits.diagnose");
  const visit = await openVisitOrThrow(visitId);
  if (visit.status !== "IN_PROGRESS") return { error: "Lượt khám đã kết thúc." };
  const get = (n: string, max: number) => {
    const v = fd.get(n);
    return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  };
  await prisma.visit.update({
    where: { id: visitId },
    data: {
      reason: get("reason", 500),
      diagnosisText: get("diagnosisText", 1000),
      clinicalNote: get("clinicalNote", 5000),
      doctorId: visit.doctorId ?? user.id,
    },
  });
  await writeAudit({ actorId: user.id, action: "visit.notes.update", entityType: "Visit", entityId: visitId });
  revalidatePath(`/kham-benh/${visitId}`);
  return { ok: "Đã lưu." };
}

export async function completeVisit(visitId: string): Promise<VisitActionState> {
  const user = await requirePermission("visits.diagnose");
  const visit = await openVisitOrThrow(visitId);
  if (visit.status !== "IN_PROGRESS") return { error: "Lượt khám đã kết thúc." };
  const draft = await prisma.prescription.count({ where: { visitId, status: "DRAFT" } });
  if (draft > 0) return { error: "Còn đơn thuốc đang kê dở. Hãy chốt hoặc xoá bản nháp trước khi kết thúc lượt khám." };
  await prisma.visit.update({ where: { id: visitId }, data: { status: "COMPLETED", completedAt: new Date(), doctorId: visit.doctorId ?? user.id } });
  await writeAudit({ actorId: user.id, action: "visit.complete", entityType: "Visit", entityId: visitId });
  revalidatePath(`/kham-benh/${visitId}`);
  revalidatePath("/kham-benh");
  return { ok: "Đã kết thúc lượt khám." };
}
