// Truy vấn Danh mục thuốc. Quyền được kiểm tra ở trang/server action gọi tới.

import type { DrugControl } from "@/domain/drug";
import { searchTokens } from "@/domain/patient";
import type { DrugControl as DbDrugControl } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

export const controlFromDb: Record<DbDrugControl, DrugControl> = {
  NORMAL: "thuong",
  NARCOTIC: "gay_nghien",
  PSYCHOTROPIC: "huong_than",
  PRECURSOR: "tien_chat",
};
export const controlToDb = Object.fromEntries(Object.entries(controlFromDb).map(([k, v]) => [v, k])) as Record<DrugControl, DbDrugControl>;

export interface DrugItem {
  id: string;
  activeIngredient: string;
  strength: string;
  dosageForm: string;
  unit: string;
  brandName: string | null;
  route: string | null;
  control: DrugControl;
  isCombination: boolean;
  isActive: boolean;
  note: string | null;
}

type DrugRow = Omit<DrugItem, "control"> & { control: DbDrugControl };
export const toDrugItem = (d: DrugRow): DrugItem => ({
  id: d.id,
  activeIngredient: d.activeIngredient,
  strength: d.strength,
  dosageForm: d.dosageForm,
  unit: d.unit,
  brandName: d.brandName,
  route: d.route,
  control: controlFromDb[d.control],
  isCombination: d.isCombination,
  isActive: d.isActive,
  note: d.note,
});

/** Danh sách theo tên hoạt chất (A→Z), không xếp hạng hay ưu tiên thuốc nào. */
export async function listDrugs(options: { query?: string; includeInactive?: boolean; limit?: number }): Promise<DrugItem[]> {
  const tokens = searchTokens(options.query ?? "");
  const rows = await prisma.drug.findMany({
    where: {
      ...(options.includeInactive ? {} : { isActive: true }),
      ...(tokens.length ? { AND: tokens.map((t) => ({ searchText: { contains: t } })) } : {}),
    },
    orderBy: [{ activeIngredient: "asc" }, { strength: "asc" }, { id: "asc" }],
    take: options.limit ?? 500,
  });
  return rows.map(toDrugItem);
}

export async function getDrug(id: string): Promise<DrugItem | null> {
  const d = await prisma.drug.findUnique({ where: { id } });
  return d ? toDrugItem(d) : null;
}
