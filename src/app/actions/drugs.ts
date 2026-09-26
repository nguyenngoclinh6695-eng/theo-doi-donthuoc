"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { drugSearchText, parseDrugForm, type DrugFieldErrors, type DrugInput } from "@/domain/drug";
import { requirePermission } from "@/lib/auth/dal";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { controlToDb } from "@/lib/drugs";

export interface DrugFormState {
  error?: string;
  fieldErrors?: DrugFieldErrors;
  values?: Partial<Record<keyof DrugInput, string>>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function read(formData: FormData) {
  const { data, errors } = parseDrugForm((n) => formData.get(n));
  const values = Object.fromEntries([...formData.entries()].filter(([k, v]) => !k.startsWith("$") && typeof v === "string")) as DrugFormState["values"];
  return { data, errors, values };
}

const toDb = (d: DrugInput) => ({
  activeIngredient: d.activeIngredient,
  strength: d.strength,
  dosageForm: d.dosageForm,
  unit: d.unit,
  brandName: d.brandName,
  route: d.route,
  control: controlToDb[d.control],
  isCombination: d.isCombination,
  note: d.note,
  searchText: drugSearchText(d),
});

export async function createDrug(_prev: DrugFormState, formData: FormData): Promise<DrugFormState> {
  const user = await requirePermission("drugs.manage");
  const { data, errors, values } = read(formData);
  if (Object.keys(errors).length) return { error: "Chưa lưu được – kiểm tra các ô được đánh dấu.", fieldErrors: errors, values };

  const created = await prisma.drug.create({ data: toDb(data) });
  await writeAudit({ actorId: user.id, action: "drug.create", entityType: "Drug", entityId: created.id, details: { name: `${data.activeIngredient} ${data.strength}` } });
  revalidatePath("/danh-muc-thuoc");
  redirect("/danh-muc-thuoc");
}

export async function updateDrug(drugId: string, _prev: DrugFormState, formData: FormData): Promise<DrugFormState> {
  const user = await requirePermission("drugs.manage");
  if (!UUID_RE.test(drugId)) return { error: "Mã thuốc không hợp lệ." };
  const { data, errors, values } = read(formData);
  if (Object.keys(errors).length) return { error: "Chưa lưu được – kiểm tra các ô được đánh dấu.", fieldErrors: errors, values };

  await prisma.drug.update({ where: { id: drugId }, data: toDb(data) });
  await writeAudit({ actorId: user.id, action: "drug.update", entityType: "Drug", entityId: drugId, details: { name: `${data.activeIngredient} ${data.strength}` } });
  revalidatePath("/danh-muc-thuoc");
  redirect("/danh-muc-thuoc");
}

/** Ngừng/cho dùng lại. Không xoá hẳn vì đơn cũ vẫn tham chiếu tới thuốc. */
export async function setDrugActive(drugId: string, active: boolean): Promise<void> {
  const user = await requirePermission("drugs.manage");
  if (!UUID_RE.test(drugId)) throw new Error("Mã thuốc không hợp lệ.");
  await prisma.drug.update({ where: { id: drugId }, data: { isActive: active } });
  await writeAudit({ actorId: user.id, action: active ? "drug.activate" : "drug.deactivate", entityType: "Drug", entityId: drugId });
  revalidatePath("/danh-muc-thuoc");
  revalidatePath(`/danh-muc-thuoc/${drugId}/sua`);
}
