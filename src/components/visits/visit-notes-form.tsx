"use client";

import { startTransition, useActionState } from "react";
import type { VisitActionState } from "@/app/actions/visits";
import { FormField, inputClass, primaryButtonClass } from "@/components/ui/form-field";

/** Ghi chép của bác sĩ. Hệ thống chỉ lưu lại, không sinh hay gợi ý chẩn đoán. */
export function VisitNotesForm({
  action,
  initial,
  readOnly,
}: {
  action: (state: VisitActionState, fd: FormData) => Promise<VisitActionState>;
  initial: { reason: string; diagnosisText: string; clinicalNote: string };
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      className="space-y-4"
      // Gửi thủ công để React không xoá trắng ô sau khi lưu (các ô này cần giữ nguyên nội dung).
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <FormField id="reason" name="reason" label="Lý do đến khám" optional defaultValue={initial.reason} readOnly={readOnly} maxLength={500} />
      <FormField id="diagnosisText" label="Chẩn đoán" hint="Do bác sĩ ghi; sẽ được in trên đơn thuốc.">
        <textarea id="diagnosisText" name="diagnosisText" rows={2} maxLength={1000} defaultValue={initial.diagnosisText} readOnly={readOnly} aria-describedby="diagnosisText-hint" className={inputClass} />
      </FormField>
      <FormField id="clinicalNote" label="Ghi chép khám" optional>
        <textarea id="clinicalNote" name="clinicalNote" rows={4} maxLength={5000} defaultValue={initial.clinicalNote} readOnly={readOnly} className={inputClass} />
      </FormField>
      {!readOnly && (
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={primaryButtonClass}>
            {pending ? "Đang lưu…" : "Lưu ghi chép"}
          </button>
          <span aria-live="polite" className="text-sm">
            {state.error && <span className="text-danger-ink">{state.error}</span>}
            {state.ok && <span className="text-success-ink">{state.ok}</span>}
          </span>
        </div>
      )}
    </form>
  );
}
