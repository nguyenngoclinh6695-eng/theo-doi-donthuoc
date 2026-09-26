// Nghiệp vụ Danh mục thuốc (thuần): kiểm tra dữ liệu nhập, tên hiển thị. Không gợi ý hay xếp hạng thuốc.

import { foldVietnamese } from "./patient";

export type DrugControl = "thuong" | "gay_nghien" | "huong_than" | "tien_chat";

export const drugControlLabels: Record<DrugControl, string> = {
  thuong: "Thông thường",
  gay_nghien: "Gây nghiện",
  huong_than: "Hướng thần",
  tien_chat: "Tiền chất",
};

export interface DrugInput {
  activeIngredient: string;
  strength: string;
  dosageForm: string;
  unit: string;
  brandName: string | null;
  route: string | null;
  control: DrugControl;
  note: string | null;
}

export type DrugFieldErrors = Partial<Record<keyof DrugInput, string>>;

const clean = (v: FormDataEntryValue | null | undefined): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  return t === "" ? null : t;
};

export function parseDrugForm(get: (name: keyof DrugInput) => FormDataEntryValue | null): { data: DrugInput; errors: DrugFieldErrors } {
  const controlRaw = clean(get("control")) ?? "thuong";
  const data: DrugInput = {
    activeIngredient: clean(get("activeIngredient")) ?? "",
    strength: clean(get("strength")) ?? "",
    dosageForm: clean(get("dosageForm")) ?? "",
    unit: clean(get("unit")) ?? "",
    brandName: clean(get("brandName")),
    route: clean(get("route")),
    control: (controlRaw in drugControlLabels ? controlRaw : "thuong") as DrugControl,
    note: clean(get("note")),
  };
  const errors: DrugFieldErrors = {};
  const required: [keyof DrugInput, string][] = [
    ["activeIngredient", "Nhập tên hoạt chất."],
    ["strength", "Nhập hàm lượng/nồng độ (vd. 500 mg)."],
    ["dosageForm", "Nhập dạng bào chế (vd. Viên nén)."],
    ["unit", "Nhập đơn vị tính (vd. viên)."],
  ];
  for (const [k, msg] of required) if (!data[k]) errors[k] = msg;
  for (const k of ["activeIngredient", "brandName", "dosageForm"] as const) {
    if ((data[k]?.length ?? 0) > 200) errors[k] = "Tối đa 200 ký tự.";
  }
  if (!(controlRaw in drugControlLabels)) errors.control = "Nhóm kiểm soát không hợp lệ.";
  return { data, errors };
}

/** Tên hiển thị: "Hoạt chất Hàm lượng (Tên thương mại)". */
export function drugDisplayName(d: Pick<DrugInput, "activeIngredient" | "strength" | "brandName">): string {
  return `${d.activeIngredient} ${d.strength}${d.brandName ? ` (${d.brandName})` : ""}`;
}

export function drugSearchText(d: Pick<DrugInput, "activeIngredient" | "brandName" | "strength">): string {
  return foldVietnamese([d.activeIngredient, d.brandName ?? "", d.strength].join(" ")).trim();
}
