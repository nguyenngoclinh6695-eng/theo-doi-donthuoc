// Truy vấn hồ sơ bệnh nhân. Chỉ trả về kiểu nghiệp vụ (không trả object Prisma cho giao diện).
// Quyền được kiểm tra ở trang/server action gọi tới.

import type { Sex } from "@/domain/patient";
import { PATIENT_SEARCH_LIMIT, searchTokens } from "@/domain/patient";
import type { AppointmentStatus as DbAppointmentStatus, PrescriptionStatus, Sex as DbSex } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

export const sexFromDb: Record<DbSex, Sex> = { MALE: "nam", FEMALE: "nu", OTHER: "khac" };
export const sexToDb: Record<Sex, DbSex> = { nam: "MALE", nu: "FEMALE", khac: "OTHER" };

/** Ngày dạng date (không giờ) trong DB -> "YYYY-MM-DD". Cột @db.Date luôn là 00:00 UTC nên lấy phần ngày theo UTC. */
export const dateKeyOf = (d: Date) => d.toISOString().slice(0, 10);

export interface PatientListItem {
  id: string;
  code: string;
  fullName: string;
  dateOfBirth: string | null;
  sex: Sex | null;
  phone: string | null;
  isSample: boolean;
  lastVisitAt: string | null;
}

const listSelect = {
  id: true,
  code: true,
  fullName: true,
  dateOfBirth: true,
  sex: true,
  phone: true,
  isSample: true,
  visits: { orderBy: { visitedAt: "desc" as const }, take: 1, select: { visitedAt: true } },
};

type ListRow = {
  id: string;
  code: string;
  fullName: string;
  dateOfBirth: Date | null;
  sex: DbSex | null;
  phone: string | null;
  isSample: boolean;
  visits: { visitedAt: Date }[];
};

const toListItem = (p: ListRow): PatientListItem => ({
  id: p.id,
  code: p.code,
  fullName: p.fullName,
  dateOfBirth: p.dateOfBirth ? dateKeyOf(p.dateOfBirth) : null,
  sex: p.sex ? sexFromDb[p.sex] : null,
  phone: p.phone,
  isSample: p.isSample,
  lastVisitAt: p.visits[0]?.visitedAt.toISOString() ?? null,
});

export const PATIENT_PAGE_SIZE = 25;

/** Danh sách theo hồ sơ cập nhật gần nhất, phân trang. */
export async function listPatients(page: number): Promise<{ items: PatientListItem[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.patient.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * PATIENT_PAGE_SIZE,
      take: PATIENT_PAGE_SIZE,
      select: listSelect,
    }),
    prisma.patient.count(),
  ]);
  return { items: rows.map(toListItem), total };
}

/** Tìm theo tên (không cần gõ dấu), mã bệnh nhân, số điện thoại hoặc CCCD. Mọi từ khoá đều phải khớp. */
export async function searchPatients(query: string): Promise<PatientListItem[]> {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return [];
  const rows = await prisma.patient.findMany({
    where: { AND: tokens.map((t) => ({ searchText: { contains: t } })) },
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
    take: PATIENT_SEARCH_LIMIT,
    select: listSelect,
  });
  return rows.map(toListItem);
}

export interface PatientDetail {
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
  createdAt: string;
  updatedAt: string;
  appointments: { id: string; scheduledAt: string; reason: string; status: DbAppointmentStatus }[];
  visits: { id: string; visitedAt: string; doctorName: string }[];
  prescriptions: { id: string; code: string; status: PrescriptionStatus; finalizedAt: string | null; hasScan: boolean; doctorName: string }[];
  reminderCalls: { id: string; calledAt: string; calledBy: string }[];
}

/** Hồ sơ đầy đủ. includePrescriptions = false khi vai trò không có quyền xem đơn thuốc (không truy vấn luôn). */
export async function getPatientDetail(id: string, options: { includePrescriptions: boolean }): Promise<PatientDetail | null> {
  const [p, prescriptions] = await Promise.all([
    prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: { orderBy: { scheduledAt: "desc" }, take: 50 },
        visits: { orderBy: { visitedAt: "desc" }, take: 50, include: { doctor: { select: { fullName: true } } } },
        reminderCalls: { orderBy: { calledAt: "desc" }, take: 20, include: { calledBy: { select: { fullName: true } } } },
      },
    }),
    options.includePrescriptions
      ? prisma.prescription.findMany({
          where: { patientId: id },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { doctor: { select: { fullName: true } } },
        })
      : Promise.resolve([]),
  ]);
  if (!p) return null;
  return {
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
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    appointments: p.appointments.map((a) => ({ id: a.id, scheduledAt: a.scheduledAt.toISOString(), reason: a.reason, status: a.status })),
    visits: p.visits.map((v) => ({ id: v.id, visitedAt: v.visitedAt.toISOString(), doctorName: v.doctor.fullName })),
    prescriptions: prescriptions.map((r) => ({
      id: r.id,
      code: r.code,
      status: r.status,
      finalizedAt: r.finalizedAt?.toISOString() ?? null,
      hasScan: r.scanUploadedAt !== null,
      doctorName: r.doctor.fullName,
    })),
    reminderCalls: p.reminderCalls.map((c) => ({ id: c.id, calledAt: c.calledAt.toISOString(), calledBy: c.calledBy.fullName })),
  };
}
