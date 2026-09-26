"use client";

import { startTransition, useActionState } from "react";
import type { RxState } from "@/app/actions/prescriptions";
import { FormField, inputClass, secondaryButtonClass } from "@/components/ui/form-field";

export function PrescriptionMetaForm({
  action,
  initial,
  minDate,
}: {
  action: (state: RxState, fd: FormData) => Promise<RxState>;
  initial: { advice: string; followUpDate: string };
  minDate: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <FormField id="advice" label="Lời dặn" optional>
          <textarea id="advice" name="advice" rows={2} maxLength={1000} defaultValue={initial.advice} className={inputClass} />
        </FormField>
        <FormField id="followUpDate" name="followUpDate" type="date" label="Hẹn tái khám" optional min={minDate} defaultValue={initial.followUpDate} />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={secondaryButtonClass}>
          {pending ? "Đang lưu…" : "Lưu lời dặn & hẹn"}
        </button>
        <span aria-live="polite" className="text-sm">
          {state.error && <span className="text-danger-ink">{state.error}</span>}
          {state.ok && <span className="text-success-ink">{state.ok}</span>}
        </span>
      </div>
    </form>
  );
}
