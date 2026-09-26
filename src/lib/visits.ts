// Truy vấn cho màn hình khám và kê đơn. Quyền được kiểm tra ở trang/server action gọi tới.

import type { Sex } from "@/domain/patient";
import type { DrugControl } from "@/domain/drug";
import { usageText, type PatientSnapshot } from "@/domain/prescription";
import { NO_BASIS_MESSAGE, type Tone } from "@/domain/standards";
import type { AppointmentStatus, PrescriptionStatus, VisitStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { controlFromDb } from "@/lib/drugs";
import { dateKeyOf, sexFromDb } from "@/lib/patients";
import { toBand } from "@/lib/standards";
import { clinicPeriods } from "@/lib/time";

// ───────────── Bảng "Khám bệnh" hôm nay ─────────────

export interface TodayBoard {
  appointments: { id: string; scheduledAt: string; patientId: string; patientName: string; reason: string; status: AppointmentStatus; visitId: string | null }[];
  walkIns: { id: string; visitedAt: string; patientId: string; patientName: string; status: VisitStatus; doctorName: string | null }[];
}

export async function getTodayBoard(): Promise<TodayBoard> {
  const { todayStart, tomorrowStart } = clinicPeriods();
  const [appointments, visits] = await Promise.all([
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: todayStart, lt: tomorrowStart }, status: { not: "CANCELLED" } },
      orderBy: { scheduledAt: "asc" },
      include: { patient: { select: { id: true, fullName: true } }, visit: { select: { id: true } } },
    }),
    prisma.visit.findMany({
      where: { visitedAt: { gte: todayStart, lt: tomorrowStart }, appointmentId: null },
      orderBy: { visitedAt: "asc" },
      include: { patient: { select: { id: true, fullName: true } }, doctor: { select: { fullName: true } } },
    }),
  ]);
  return {
    appointments: appointments.map((a) => ({
      id: a.id,
      scheduledAt: a.scheduledAt.toISOString(),
      patientId: a.patient.id,
      patientName: a.patient.fullName,
      reason: a.reason,
      status: a.status,
      visitId: a.visit?.id ?? null,
    })),
    walkIns: visits.map((v) => ({
      id: v.id,
      visitedAt: v.visitedAt.toISOString(),
      patientId: v.patient.id,
      patientName: v.patient.fullName,
      status: v.status,
      doctorName: v.doctor?.fullName ?? null,
    })),
  };
}

// ───────────── Màn hình một lượt khám ─────────────

export interface MeasurementView {
  id: string;
  typeId: string;
  typeName: string;
  unit: string;
  decimals: number;
  value: number;
  measuredAt: string;
  recordedBy: string;
  /** Phân loại đã lưu lúc ghi – null nghĩa là lúc đó chưa có căn cứ. */
  classification: { label: string; tone: Tone; version: string; sourceTitle: string } | null;
  noBasisMessage: string;
}

export interface PrescriptionView {
  id: string;
  code: string;
  status: PrescriptionStatus;
  doctorName: string;
  diagnosisText: string | null;
  advice: string | null;
  followUpDate: string | null;
  finalizedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  patientSnapshot: PatientSnapshot | null;
  items: {
    id: string;
    drugId: string;
    drugName: string;
    drugDosageForm: string;
    unit: string;
    quantity: number;
    /** Câu cách dùng như sẽ in trên đơn. */
    usage: string;
    drugActive: boolean;
    drugControl: DrugControl;
  }[];
}

export interface VisitWorkspace {
  id: string;
  status: VisitStatus;
  visitedAt: string;
  completedAt: string | null;
  reason: string | null;
  diagnosisText: string | null;
  clinicalNote: string | null;
  doctorId: string | null;
  doctorName: string | null;
  appointmentId: string | null;
  patient: {
    id: string;
    code: string;
    fullName: string;
    dateOfBirth: string | null;
    sex: Sex | null;
    phone: string | null;
    address: string | null;
    idNumber: string | null;
    insuranceNo: string | null;
    guardianName: string | null;
    allergyNote: string | null;
    isSample: boolean;
  };
  measurements: MeasurementView[];
  /** Giá trị lần đo gần nhất TRƯỚC lượt khám này, theo loại chỉ số (để so sánh). */
  previous: Record<string, { value: number; measuredAt: string }>;
  prescriptions: PrescriptionView[];
}

const num = (d: { toString(): string }) => Number(d.toString());

export async function getVisitWorkspace(visitId: string): Promise<VisitWorkspace | null> {
  const v = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      patient: true,
      doctor: { select: { fullName: true } },
      measurements: {
        orderBy: { measuredAt: "asc" },
        include: {
          measurementType: true,
          recordedBy: { select: { fullName: true } },
          standardSet: { include: { source: { select: { title: true } }, bands: true } },
        },
      },
      prescriptions: {
        orderBy: { createdAt: "asc" },
        include: { doctor: { select: { fullName: true } }, items: { orderBy: { sortOrder: "asc" }, include: { drug: true } } },
      },
    },
  });
  if (!v) return null;

  const previousRows = await prisma.measurement.findMany({
    where: { patientId: v.patientId, measuredAt: { lt: v.visitedAt }, visitId: { not: v.id } },
    orderBy: { measuredAt: "desc" },
    take: 100,
    select: { measurementTypeId: true, value: true, measuredAt: true },
  });
  const previous: VisitWorkspace["previous"] = {};
  for (const m of previousRows) {
    previous[m.measurementTypeId] ??= { value: num(m.value), measuredAt: m.measuredAt.toISOString() };
  }

  const p = v.patient;
  return {
    id: v.id,
    status: v.status,
    visitedAt: v.visitedAt.toISOString(),
    completedAt: v.completedAt?.toISOString() ?? null,
    reason: v.reason,
    diagnosisText: v.diagnosisText,
    clinicalNote: v.clinicalNote,
    doctorId: v.doctorId,
    doctorName: v.doctor?.fullName ?? null,
    appointmentId: v.appointmentId,
    patient: {
      id: p.id,
      code: p.code,
      fullName: p.fullName,
      dateOfBirth: p.dateOfBirth ? dateKeyOf(p.dateOfBirth) : null,
      sex: p.sex ? sexFromDb[p.sex] : null,
      phone: p.phone,
      address: p.address,
      idNumber: p.idNumber,
      insuranceNo: p.insuranceNo,
      guardianName: p.guardianName,
      allergyNote: p.allergyNote,
      isSample: p.isSample,
    },
    measurements: v.measurements.map((m) => {
      // Mức hiển thị lấy từ đúng bộ ngưỡng đã dùng lúc ghi (không phân loại lại theo ngưỡng hiện tại).
      const band = m.standardSet?.bands.map(toBand).find((b) => b.label === m.classificationLabel);
      return {
        id: m.id,
        typeId: m.measurementTypeId,
        typeName: m.measurementType.name,
        unit: m.measurementType.unit,
        decimals: m.measurementType.decimals,
        value: num(m.value),
        measuredAt: m.measuredAt.toISOString(),
        recordedBy: m.recordedBy.fullName,
        classification:
          m.classificationLabel && m.standardSet && band
            ? { label: m.classificationLabel, tone: band.tone, version: m.standardSet.version, sourceTitle: m.standardSet.source.title }
            : null,
        noBasisMessage: NO_BASIS_MESSAGE,
      };
    }),
    previous,
    prescriptions: v.prescriptions.map((r) => ({
      id: r.id,
      code: r.code,
      status: r.status,
      doctorName: r.doctor.fullName,
      diagnosisText: r.diagnosisText,
      advice: r.advice,
      followUpDate: r.followUpDate ? dateKeyOf(r.followUpDate) : null,
      finalizedAt: r.finalizedAt?.toISOString() ?? null,
      cancelledAt: r.cancelledAt?.toISOString() ?? null,
      cancelReason: r.cancelReason,
      patientSnapshot: (r.patientSnapshot as PatientSnapshot | null) ?? null,
      items: r.items.map((i) => ({
        id: i.id,
        drugId: i.drugId,
        drugName: i.drugName,
        drugDosageForm: i.drugDosageForm,
        unit: i.unit,
        quantity: i.quantity,
        usage: usageText({ ...i, note: i.dosageInstruction }),
        drugActive: i.drug.isActive,
        drugControl: controlFromDb[i.drug.control],
      })),
    })),
  };
}

// ───────────── Danh sách đơn thuốc ─────────────

export async function listPrescriptions(status: PrescriptionStatus | null) {
  const rows = await prisma.prescription.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      patient: { select: { id: true, fullName: true, code: true } },
      doctor: { select: { fullName: true } },
      _count: { select: { items: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    status: r.status,
    visitId: r.visitId,
    patientId: r.patient.id,
    patientName: r.patient.fullName,
    patientCode: r.patient.code,
    doctorName: r.doctor.fullName,
    itemCount: r._count.items,
    createdAt: r.createdAt.toISOString(),
    finalizedAt: r.finalizedAt?.toISOString() ?? null,
    hasScan: r.scanUploadedAt !== null,
  }));
}
