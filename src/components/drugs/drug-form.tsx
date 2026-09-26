"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { DrugFormState } from "@/app/actions/drugs";
import { drugControlLabels, type DrugInput } from "@/domain/drug";
import { FormError, FormField, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form-field";

type Values = Partial<Record<keyof DrugInput, string>>;

export function DrugForm({
  action,
  initial,
  submitLabel,
}: {
  action: (state: DrugFormState, formData: FormData) => Promise<DrugFormState>;
  initial: Values;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = state.values ?? initial;
  const e = state.fieldErrors ?? {};

  return (
    <form key={state.values ? JSON.stringify(state.values) : "initial"} action={formAction} className="space-y-5" noValidate>
      <FormError message={state.error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField id="activeIngredient" name="activeIngredient" label="Tên hoạt chất (tên chung)" defaultValue={v.activeIngredient} error={e.activeIngredient} />
        </div>
        <FormField id="strength" name="strength" label="Hàm lượng / nồng độ" hint="Vd. 500 mg; 250 mg/5 ml" defaultValue={v.strength} error={e.strength} />
        <FormField id="dosageForm" name="dosageForm" label="Dạng bào chế" hint="Vd. Viên nén, Siro, Viên nang" defaultValue={v.dosageForm} error={e.dosageForm} />
        <FormField id="unit" name="unit" label="Đơn vị tính khi kê" hint="Vd. viên, chai, ống" defaultValue={v.unit} error={e.unit} />
        <FormField id="route" name="route" label="Đường dùng" optional hint="Vd. Uống, Nhỏ mắt" defaultValue={v.route} error={e.route} />
        <FormField id="brandName" name="brandName" label="Tên thương mại" optional defaultValue={v.brandName} error={e.brandName} />
        <FormField id="control" label="Nhóm kiểm soát" error={e.control} hint="Thuốc khác nhóm Thông thường cần mẫu đơn riêng – hệ thống sẽ chặn khi kê.">
          <select id="control" name="control" defaultValue={v.control ?? "thuong"} aria-describedby="control-hint" className={inputClass}>
            {Object.entries(drugControlLabels).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <div className="sm:col-span-2">
          <FormField id="note" name="note" label="Ghi chú nội bộ" optional defaultValue={v.note} error={e.note} />
        </div>
      </div>
      <div className="flex flex-wrap gap-3 border-t border-line pt-5">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Đang lưu…" : submitLabel}
        </button>
        <Link href="/danh-muc-thuoc" className={secondaryButtonClass}>
          Huỷ
        </Link>
      </div>
    </form>
  );
}
