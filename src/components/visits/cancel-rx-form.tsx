"use client";

import { useActionState } from "react";
import type { RxState } from "@/app/actions/prescriptions";
import { dangerButtonClass, inputClass } from "@/components/ui/form-field";

/** Huỷ đơn đã chốt: bắt buộc ghi lý do; đơn vẫn được giữ lại để tra cứu. */
export function CancelRxForm({ action, id }: { action: (state: RxState, fd: FormData) => Promise<RxState>; id: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-danger-ink">Huỷ đơn đã chốt…</summary>
      <form action={formAction} className="mt-2 max-w-md space-y-2">
        <label htmlFor={`cancel-${id}`} className="block text-sm font-medium">
          Lý do huỷ (bắt buộc)
        </label>
        <input id={`cancel-${id}`} name="reason" required minLength={5} maxLength={500} className={inputClass} />
        <button type="submit" disabled={pending} className={dangerButtonClass}>
          {pending ? "Đang huỷ…" : "Xác nhận huỷ đơn"}
        </button>
        {state.error && (
          <p role="alert" className="text-danger-ink">
            {state.error}
          </p>
        )}
      </form>
    </details>
  );
}
