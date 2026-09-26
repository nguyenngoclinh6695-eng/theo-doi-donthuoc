"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import type { ApptState } from "@/app/actions/appointments";
import { PatientPicker, type PickedPatient } from "@/components/appointments/patient-picker";
import { FormField, inputClass, primaryButtonClass } from "@/components/ui/form-field";

/** Đặt lịch hẹn mới. Lỗi thì giữ nguyên dữ liệu đã nhập; thành công thì xoá trắng để đặt lịch tiếp. */
export function AppointmentForm({
  action,
  initialPatient,
  initialDate,
  initialReason,
  minDate,
}: {
  action: (s: ApptState, fd: FormData) => Promise<ApptState>;
  initialPatient: PickedPatient | null;
  initialDate: string;
  initialReason: string;
  minDate: string;
}) {
  // Đổi key để làm mới ô chọn bệnh nhân sau khi đặt lịch thành công.
  const [round, setRound] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (prev: ApptState, fd: FormData) => {
    const r = await action(prev, fd);
    if (r.ok) {
      formRef.current?.reset();
      setRound((n) => n + 1);
    }
    return r;
  }, {});

  return (
    <form
      ref={formRef}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <PatientPicker key={round} initial={round === 0 ? initialPatient : null} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="appt-date" name="date" type="date" label="Ngày hẹn" min={minDate} defaultValue={initialDate} required />
        <FormField id="appt-time" name="time" type="time" label="Giờ hẹn" step={300} required />
      </div>
      <FormField id="appt-reason" label="Lý do hẹn">
        <input id="appt-reason" name="reason" defaultValue={initialReason} required maxLength={300} placeholder="vd. Tái khám định kỳ" className={inputClass} />
      </FormField>
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Đang đặt…" : "Đặt lịch hẹn"}
      </button>
      <div aria-live="polite" className="text-sm">
        {state.error && <p className="text-danger-ink">{state.error}</p>}
        {state.errors?.map((e) => (
          <p key={e} className="text-danger-ink">
            {e}
          </p>
        ))}
        {state.ok && <p className="text-success-ink">{state.ok}</p>}
      </div>
    </form>
  );
}
