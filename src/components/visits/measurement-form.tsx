"use client";

import { useActionState } from "react";
import type { VisitActionState } from "@/app/actions/visits";
import { inputClass, primaryButtonClass } from "@/components/ui/form-field";

/** Form ghi một chỉ số. Phân loại do máy chủ thực hiện theo Thư viện chuẩn – form không tự đánh giá gì. */
export function MeasurementForm({
  action,
  types,
}: {
  action: (state: VisitActionState, fd: FormData) => Promise<VisitActionState>;
  types: { id: string; name: string; unit: string; decimals: number }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-56 flex-1">
        <label htmlFor="m-type" className="block text-sm font-medium">
          Chỉ số
        </label>
        <select id="m-type" name="measurementTypeId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            — Chọn chỉ số —
          </option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.unit})
            </option>
          ))}
        </select>
      </div>
      <div className="w-36">
        <label htmlFor="m-value" className="block text-sm font-medium">
          Giá trị
        </label>
        <input id="m-value" name="value" inputMode="decimal" required autoComplete="off" className={inputClass} />
      </div>
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Đang ghi…" : "Ghi chỉ số"}
      </button>
      <div className="basis-full" aria-live="polite">
        {state.error && <p className="text-sm text-danger-ink">{state.error}</p>}
        {state.ok && <p className="text-sm text-success-ink">{state.ok}</p>}
      </div>
    </form>
  );
}
