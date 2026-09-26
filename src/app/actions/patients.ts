"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildSearchText, parsePatientForm, type PatientFieldErrors, type PatientInput } from "@/domain/patient";
import { requirePermission } from "@/lib/auth/dal";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { searchPatients, sexToDb, type PatientListItem } from "@/lib/patients";
import { clinicPeriods } from "@/lib/time";

export interface PatientFormState {
  error?: string;
  fieldErrors?: PatientFieldErrors;
  /** Giữ lại giá trị đã nhập khi có lỗi, để người dùng không phải gõ lại. */
  values?: Partial<Record<keyof PatientInput, string>>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tìm bệnh nhân. Dùng server action (POST) thay vì ?q= trên URL,
 * để tên/SĐT không nằm trong lịch sử trình duyệt và log máy chủ.
 */
export async function searchPatientsAction(query: string): Promise<PatientListItem[]> {
  await requirePermission("patients.view");
  if (typeof query !== "string") return [];
  return searchPatients(query.slice(0, 100));
}

function readForm(formData: FormData) {
  const { data, errors } = parsePatientForm((name) => formData.get(name), clinicPeriods().todayKey);
  const values = Object.fromEntries(
    [...formData.entries()].filter(([k, v]) => !k.startsWith("$") && typeof v === "string"),
  ) as PatientFormState["values"];
  return { data, errors, values };
}

function toDbFields(data: PatientInput) {
  return {
    fullName: data.fullName,
    dateOfBirth: data.dateOfBirth ? new Date(`${data.dateOfBirth}T00:00:00Z`) : null,
    sex: data.sex ? sexToDb[data.sex] : null,
    phone: data.phone,
    address: data.address,
    idNumber: data.idNumber,
    insuranceNo: data.insuranceNo,
    guardianName: data.guardianName,
    allergyNote: data.allergyNote,
  };
}

const FORM_ERROR = "Chưa lưu được – kiểm tra các ô được đánh dấu bên dưới.";

export async function createPatient(_prev: PatientFormState, formData: FormData): Promise<PatientFormState> {
  const user = await requirePermission("patients.edit");
  const { data, errors, values } = readForm(formData);
  if (Object.keys(errors).length > 0) return { error: FORM_ERROR, fieldErrors: errors, values };

  const id = await prisma.$transaction(async (tx) => {
    // Mã BN do sequence của DB cấp; tạo xong mới biết mã để ghép chuỗi tìm kiếm.
    const created = await tx.patient.create({ data: toDbFields(data) });
    await tx.patient.update({
      where: { id: created.id },
      data: { searchText: buildSearchText({ ...data, code: created.code }) },
    });
    // Nhật ký chỉ ghi mã hồ sơ, không ghi nội dung (quản trị xem được nhật ký nhưng không được xem hồ sơ).
    await writeAudit({ actorId: user.id, action: "patient.create", entityType: "Patient", entityId: created.id }, tx);
    return created.id;
  });

  revalidatePath("/benh-nhan");
  redirect(`/benh-nhan/${id}`);
}

export async function updatePatient(patientId: string, _prev: PatientFormState, formData: FormData): Promise<PatientFormState> {
  const user = await requirePermission("patients.edit");
  if (!UUID_RE.test(patientId)) return { error: "Mã hồ sơ không hợp lệ." };
  const { data, errors, values } = readForm(formData);
  if (Object.keys(errors).length > 0) return { error: FORM_ERROR, fieldErrors: errors, values };

  const before = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!before) return { error: "Không tìm thấy hồ sơ." };

  const next = toDbFields(data);
  // Chỉ ghi TÊN các trường đã đổi vào nhật ký, không ghi giá trị.
  const changedFields = (Object.keys(next) as (keyof typeof next)[]).filter((k) => {
    const a = before[k];
    const b = next[k];
    return a instanceof Date || b instanceof Date ? a?.valueOf() !== b?.valueOf() : a !== b;
  });

  if (changedFields.length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.patient.update({
        where: { id: patientId },
        data: { ...next, searchText: buildSearchText({ ...data, code: before.code }) },
      });
      await writeAudit({ actorId: user.id, action: "patient.update", entityType: "Patient", entityId: patientId, details: { changedFields } }, tx);
    });
  }

  revalidatePath("/benh-nhan");
  revalidatePath(`/benh-nhan/${patientId}`);
  redirect(`/benh-nhan/${patientId}`);
}
