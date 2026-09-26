"use server";

import { revalidatePath } from "next/cache";
import { drugDisplayName } from "@/domain/drug";
import { ageOn, formatAge } from "@/domain/patient";
import { checkPrescription, MAX_LINES, type PatientSnapshot } from "@/domain/prescription";
import { requirePermission } from "@/lib/auth/dal";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { controlFromDb, listDrugs, type DrugItem } from "@/lib/drugs";
import { dateKeyOf, sexFromDb } from "@/lib/patients";
import { detectScanKind, MAX_SCAN_BYTES, saveScan } from "@/lib/scans";
import { clinicPeriods } from "@/lib/time";

export interface RxState {
  error?: string;
  errors?: string[];
  warnings?: string[];
  ok?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function draftOrError(prescriptionId: string) {
  if (!UUID_RE.test(prescriptionId)) return { error: "Mã đơn không hợp lệ." } as const;
  const rx = await prisma.prescription.findUnique({ where: { id: prescriptionId }, include: { visit: true } });
  if (!rx) return { error: "Không tìm thấy đơn thuốc." } as const;
  if (rx.status !== "DRAFT") return { error: "Đơn đã chốt hoặc đã huỷ, không sửa được." } as const;
  return { rx } as const;
}

const touch = (visitId: string | null) => {
  if (visitId) revalidatePath(`/kham-benh/${visitId}`);
  revalidatePath("/don-thuoc");
};

/** Tìm thuốc trong danh mục để bác sĩ tự chọn (sắp A→Z, không gợi ý). */
export async function searchDrugsForPrescribing(query: string): Promise<DrugItem[]> {
  await requirePermission("prescriptions.write");
  if (typeof query !== "string" || query.trim().length < 2) return [];
  return listDrugs({ query: query.slice(0, 100), limit: 20 });
}

export async function createPrescription(visitId: string): Promise<void> {
  const user = await requirePermission("prescriptions.write");
  if (!UUID_RE.test(visitId)) throw new Error("Mã lượt khám không hợp lệ.");
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit || visit.status !== "IN_PROGRESS") throw new Error("Chỉ kê đơn khi lượt khám đang mở.");
  const existingDraft = await prisma.prescription.findFirst({ where: { visitId, status: "DRAFT" } });
  if (existingDraft) return; // Đã có bản nháp thì dùng tiếp, không tạo thêm.

  const rx = await prisma.prescription.create({ data: { patientId: visit.patientId, doctorId: user.id, visitId } });
  if (!visit.doctorId) await prisma.visit.update({ where: { id: visitId }, data: { doctorId: user.id } });
  await writeAudit({ actorId: user.id, action: "prescription.create", entityType: "Prescription", entityId: rx.id, details: { visitId } });
  touch(visitId);
}

export async function addPrescriptionItem(prescriptionId: string, _prev: RxState, fd: FormData): Promise<RxState> {
  const user = await requirePermission("prescriptions.write");
  const found = await draftOrError(prescriptionId);
  if ("error" in found) return { error: found.error };
  const { rx } = found;

  const drugId = String(fd.get("drugId") ?? "");
  if (!UUID_RE.test(drugId)) return { error: "Chọn thuốc từ danh mục." };
  const drug = await prisma.drug.findUnique({ where: { id: drugId } });
  if (!drug) return { error: "Không tìm thấy thuốc." };
  if (!drug.isActive) return { error: "Thuốc đã ngừng dùng trong danh mục." };
  if (drug.control !== "NORMAL") return { error: "Thuốc thuộc diện kiểm soát đặc biệt, cần mẫu đơn riêng – hệ thống chưa hỗ trợ." };

  const text = (n: string, max: number) => String(fd.get(n) ?? "").trim().replace(/s+/g, " ").slice(0, max);
  const int = (n: string) => {
    const t = text(n, 10);
    return t === "" ? null : Number(t);
  };
  const quantity = Number(text("quantity", 10));
  const route = text("route", 100);
  const dosePerTime = text("dosePerTime", 100);
  const timesPerDay = int("timesPerDay");
  const timing = text("timing", 200);
  const durationDays = int("durationDays");
  const dosageInstruction = text("dosageInstruction", 500);
  // Cách dùng theo Điều 6 khoản 6 TT 26/2025: đủ đường dùng, liều mỗi lần, số lần/ngày, thời điểm, số ngày.
  const errors: string[] = [];
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) errors.push("Số lượng phải là số nguyên từ 1 đến 10000.");
  if (!route) errors.push("Ghi đường dùng (vd. Uống).");
  if (!dosePerTime) errors.push("Ghi liều mỗi lần (vd. 1 viên).");
  if (timesPerDay === null || !Number.isInteger(timesPerDay) || timesPerDay < 1 || timesPerDay > 24) errors.push("Số lần/ngày là số nguyên từ 1 đến 24.");
  if (!timing) errors.push("Ghi thời điểm dùng (vd. sau ăn sáng và tối).");
  if (durationDays === null || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365) errors.push("Số ngày dùng từ 1 đến 365.");
  const count = await prisma.prescriptionItem.count({ where: { prescriptionId } });
  if (count >= MAX_LINES) errors.push(`Đơn tối đa ${MAX_LINES} dòng thuốc.`);
  if (await prisma.prescriptionItem.findFirst({ where: { prescriptionId, drugId } })) errors.push("Thuốc này đã có trong đơn.");
  if (errors.length) return { errors };

  await prisma.prescriptionItem.create({
    data: {
      prescriptionId,
      drugId,
      drugName: drugDisplayName(drug),
      drugIngredient: drug.activeIngredient,
      drugBrand: drug.brandName,
      drugStrength: drug.strength,
      drugIsCombination: drug.isCombination,
      drugDosageForm: drug.dosageForm,
      unit: drug.unit,
      quantity,
      route,
      dosePerTime,
      timesPerDay,
      timing,
      durationDays,
      dosageInstruction,
      sortOrder: count,
    },
  });
  await writeAudit({ actorId: user.id, action: "prescription.item.add", entityType: "Prescription", entityId: prescriptionId, details: { drugId } });
  touch(rx.visitId);
  return { ok: `Đã thêm ${drugDisplayName(drug)}.` };
}

export async function removePrescriptionItem(itemId: string): Promise<void> {
  const user = await requirePermission("prescriptions.write");
  if (!UUID_RE.test(itemId)) throw new Error("Mã không hợp lệ.");
  const item = await prisma.prescriptionItem.findUnique({ where: { id: itemId }, include: { prescription: true } });
  if (!item) return;
  if (item.prescription.status !== "DRAFT") throw new Error("Đơn đã chốt, không sửa được.");
  await prisma.prescriptionItem.delete({ where: { id: itemId } });
  await writeAudit({ actorId: user.id, action: "prescription.item.remove", entityType: "Prescription", entityId: item.prescriptionId, details: { drugId: item.drugId } });
  touch(item.prescription.visitId);
}

export async function savePrescriptionMeta(prescriptionId: string, _prev: RxState, fd: FormData): Promise<RxState> {
  await requirePermission("prescriptions.write");
  const found = await draftOrError(prescriptionId);
  if ("error" in found) return { error: found.error };
  const advice = String(fd.get("advice") ?? "").trim().slice(0, 1000) || null;
  const follow = String(fd.get("followUpDate") ?? "").trim();
  if (follow && !/^\d{4}-\d{2}-\d{2}$/.test(follow)) return { error: "Ngày hẹn tái khám không hợp lệ." };
  if (follow && follow <= clinicPeriods().todayKey) return { error: "Ngày hẹn tái khám phải sau hôm nay." };
  await prisma.prescription.update({
    where: { id: prescriptionId },
    data: { advice, followUpDate: follow ? new Date(`${follow}T00:00:00Z`) : null },
  });
  touch(found.rx.visitId);
  return { ok: "Đã lưu lời dặn và hẹn tái khám." };
}

/**
 * Chốt đơn: chạy kiểm tra tính đầy đủ hành chính; qua thì khoá đơn, chép chẩn đoán từ lượt khám
 * và chụp thông tin bệnh nhân vào đơn (bản in sau này luôn khớp lúc chốt).
 */
export async function finalizePrescription(prescriptionId: string): Promise<RxState> {
  const user = await requirePermission("prescriptions.write");
  const found = await draftOrError(prescriptionId);
  if ("error" in found) return { error: found.error };
  const { rx } = found;
  if (rx.doctorId !== user.id) return { error: "Chỉ bác sĩ đã kê đơn này mới được chốt." };

  const [patient, items, weight, doctor] = await Promise.all([
    prisma.patient.findUniqueOrThrow({ where: { id: rx.patientId } }),
    prisma.prescriptionItem.findMany({ where: { prescriptionId }, orderBy: { sortOrder: "asc" }, include: { drug: true } }),
    // Cân nặng in trên đơn = lần đo "Cân nặng" gần nhất TRONG lượt khám này.
    rx.visitId
      ? prisma.measurement.findFirst({ where: { visitId: rx.visitId, measurementType: { code: "CAN_NANG" } }, orderBy: { measuredAt: "desc" } })
      : null,
    prisma.user.findUniqueOrThrow({ where: { id: rx.doctorId }, select: { fullName: true } }),
  ]);
  const weightKg = weight ? Number(weight.value.toString()) : null;
  const { todayKey } = clinicPeriods();
  const patientInfo = {
    fullName: patient.fullName,
    dateOfBirth: patient.dateOfBirth ? dateKeyOf(patient.dateOfBirth) : null,
    sex: patient.sex ? sexFromDb[patient.sex] : null,
    address: patient.address,
    idNumber: patient.idNumber,
    insuranceNo: patient.insuranceNo,
    guardianName: patient.guardianName,
  };
  const diagnosisText = rx.visit?.diagnosisText ?? null;
  const check = checkPrescription({
    patient: patientInfo,
    diagnosisText,
    weightKg,
    todayKey,
    followUpDate: rx.followUpDate ? dateKeyOf(rx.followUpDate) : null,
    lines: items.map((i) => ({
      drugId: i.drugId,
      drugName: i.drugName,
      drugActive: i.drug.isActive,
      drugControl: controlFromDb[i.drug.control],
      quantity: i.quantity,
      route: i.route,
      dosePerTime: i.dosePerTime,
      timesPerDay: i.timesPerDay,
      timing: i.timing,
      durationDays: i.durationDays,
    })),
  });
  if (check.errors.length) return { errors: check.errors, warnings: check.warnings };

  const snapshot: PatientSnapshot = {
    ...patientInfo,
    code: patient.code,
    phone: patient.phone,
    ageText: patientInfo.dateOfBirth ? formatAge(ageOn(patientInfo.dateOfBirth, todayKey)) : "",
  };
  // updateMany có điều kiện status = DRAFT: nếu hai người bấm chốt cùng lúc thì chỉ một lần thành công.
  const updated = await prisma.prescription.updateMany({
    where: { id: prescriptionId, status: "DRAFT" },
    data: {
      status: "FINALIZED",
      finalizedAt: new Date(),
      diagnosisText,
      patientSnapshot: { ...snapshot },
      doctorNameSnapshot: doctor.fullName,
      weightKgSnapshot: weightKg === null ? null : weightKg.toString(),
    },
  });
  if (updated.count === 0) return { error: "Đơn đã được chốt hoặc thay đổi trạng thái." };
  await writeAudit({ actorId: user.id, action: "prescription.finalize", entityType: "Prescription", entityId: prescriptionId, details: { items: items.length } });
  touch(rx.visitId);
  revalidatePath("/");
  return { ok: "Đã chốt đơn.", warnings: check.warnings };
}

/** Bản nháp: xoá hẳn. Đơn đã chốt: chỉ huỷ (giữ lại để tra cứu), bắt buộc ghi lý do. */
export async function cancelPrescription(prescriptionId: string, _prev: RxState, fd: FormData): Promise<RxState> {
  const user = await requirePermission("prescriptions.write");
  if (!UUID_RE.test(prescriptionId)) return { error: "Mã đơn không hợp lệ." };
  const rx = await prisma.prescription.findUnique({ where: { id: prescriptionId } });
  if (!rx) return { error: "Không tìm thấy đơn." };

  if (rx.status === "DRAFT") {
    await prisma.prescription.delete({ where: { id: prescriptionId } });
    await writeAudit({ actorId: user.id, action: "prescription.draft.delete", entityType: "Prescription", entityId: prescriptionId });
    touch(rx.visitId);
    return { ok: "Đã xoá bản nháp." };
  }
  if (rx.status !== "FINALIZED") return { error: "Đơn đã huỷ trước đó." };
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 500);
  if (reason.length < 5) return { error: "Ghi lý do huỷ đơn (ít nhất 5 ký tự)." };
  await prisma.prescription.update({ where: { id: prescriptionId }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason } });
  await writeAudit({ actorId: user.id, action: "prescription.cancel", entityType: "Prescription", entityId: prescriptionId });
  touch(rx.visitId);
  revalidatePath("/");
  return { ok: "Đã huỷ đơn." };
}

/**
 * Tải bản scan đơn đã ký tay. Chỉ nhận đơn đã chốt; file kiểm tra bằng nội dung (PDF/JPG/PNG, tối đa 10 MB).
 * Tải lại thì lưu file mới và giữ file cũ trên ổ đĩa (có nhật ký), không ghi đè.
 */
export async function uploadSignedScan(prescriptionId: string, _prev: RxState, fd: FormData): Promise<RxState> {
  const user = await requirePermission("prescriptions.uploadScan");
  if (!UUID_RE.test(prescriptionId)) return { error: "Mã đơn không hợp lệ." };
  const rx = await prisma.prescription.findUnique({ where: { id: prescriptionId } });
  if (!rx) return { error: "Không tìm thấy đơn." };
  if (rx.status !== "FINALIZED") return { error: "Chỉ tải bản scan cho đơn đã chốt (chưa huỷ)." };

  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Chọn file bản scan." };
  if (file.size > MAX_SCAN_BYTES) return { error: "File quá lớn (tối đa 10 MB). Hãy scan ở độ phân giải thấp hơn." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectScanKind(bytes);
  if (!kind) return { error: "Chỉ nhận file PDF, JPG hoặc PNG." };

  const relPath = await saveScan(prescriptionId, bytes, kind);
  await prisma.prescription.update({ where: { id: prescriptionId }, data: { signedScanPath: relPath, scanUploadedAt: new Date() } });
  await writeAudit({
    actorId: user.id,
    action: rx.signedScanPath ? "prescription.scan.replace" : "prescription.scan.upload",
    entityType: "Prescription",
    entityId: prescriptionId,
    details: { type: kind.ext, bytes: bytes.length, previous: rx.signedScanPath },
  });
  touch(rx.visitId);
  revalidatePath("/");
  return { ok: rx.signedScanPath ? "Đã thay bản scan mới (bản cũ vẫn được giữ lại)." : "Đã lưu bản scan." };
}
