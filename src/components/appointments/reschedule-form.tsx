"use client";

import { useActionState } from "react";
import type { ApptState } from "@/app/actions/appointments";
import { inputClass, secondaryButtonClass } from "@/components/ui/form-field";

export function RescheduleForm({
  action,
  id,
  dateKey,
  time,
  minDate,
}: {
  action: (s: ApptState, fd: FormData) => Promise<ApptState>;
  id: string;
  dateKey: string;
  time: string;
  minDate: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-primary-ink">Đổi giờ…</summary>
      <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor={`rs-d-${id}`} className="block text-xs font-medium">
            Ngày
          </label>
          <input id={`rs-d-${id}`} name="date" type="date" min={minDate} defaultValue={dateKey} required className={inputClass} />
        </div>
        <div>
          <label htmlFor={`rs-t-${id}`} className="block text-xs font-medium">
            Giờ
          </label>
          <input id={`rs-t-${id}`} name="time" type="time" step={300} defaultValue={time} required className={inputClass} />
        </div>
        <button type="submit" disabled={pending} className={secondaryButtonClass}>
          Lưu
        </button>
        <span aria-live="polite" className="basis-full">
          {state.error && <span className="text-danger-ink">{state.error}</span>}
          {state.errors?.map((e) => (
            <span key={e} className="block text-danger-ink">
              {e}
            </span>
          ))}
        </span>
      </form>
    </details>
  );
}
