"use client";

import Link from "next/link";
import { useActionState, type InputHTMLAttributes, type ReactNode } from "react";
import type { PatientFormState } from "@/app/actions/patients";
import type { PatientInput } from "@/domain/patient";
import { FormError, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form-field";

type Values = Partial<Record<keyof PatientInput, string>>;

const inputClass =
  "mt-1.5 w-full rounded-lg border bg-surface px-3 py-2 text-sm focus:border-primary aria-[invalid=true]:border-danger";

function Field({
  name,
  label,
  hint,
  error,
  defaultValue,
  required,
  children,
  ...input
}: {
  name: keyof PatientInput;
  label: string;
  hint?: string;
  error?: string;
  defaultValue?: string;
  required?: boolean;
  children?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "defaultValue">) {
  const id = `pf-${name}`;
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required ? <span className="text-danger-ink"> *</span> : <span className="font-normal text-ink-muted"> (không bắt buộc)</span>}
      </label>
      {children ?? (
        <input
          id={id}
          name={name}
          defaultValue={defaultValue}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${inputClass} border-line`}
          {...input}
        />
      )}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}

/** Form thêm/sửa hồ sơ; action là server action đã gắn sẵn (tạo mới hoặc cập nhật hồ sơ cụ thể). */
export function PatientForm({
  action,
  initial,
  submitLabel,
  cancelHref,
  todayKey,
}: {
  action: (state: PatientFormState, formData: FormData) => Promise<PatientFormState>;
  initial: Values;
  submitLabel: string;
  cancelHref: string;
  todayKey: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  // Khi lưu lỗi, hiện lại đúng những gì người dùng vừa nhập.
  const v = state.values ?? initial;
  const e = state.fieldErrors ?? {};
  // key thay đổi theo lượt trả về để React gắn lại defaultValue sau khi server trả lỗi.
  const formKey = state.values ? JSON.stringify(state.values) : "initial";

  return (
    <form key={formKey} action={formAction} className="space-y-6" noValidate>
      <FormError message={state.error} />

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-primary-strong">Thông tin cá nhân</legend>
        <div className="sm:col-span-2">
          <Field name="fullName" label="Họ và tên" required defaultValue={v.fullName} error={e.fullName} maxLength={100} autoComplete="off" />
        </div>
        <Field name="dateOfBirth" label="Ngày sinh" type="date" max={todayKey} defaultValue={v.dateOfBirth} error={e.dateOfBirth} />
        <Field name="sex" label="Giới tính" error={e.sex}>
          <select id="pf-sex" name="sex" defaultValue={v.sex ?? ""} className={`${inputClass} border-line`}>
            <option value="">— Chưa ghi —</option>
            <option value="nam">Nam</option>
            <option value="nu">Nữ</option>
            <option value="khac">Khác</option>
          </select>
        </Field>
        <Field name="idNumber" label="Số CCCD / định danh cá nhân" inputMode="numeric" hint="12 chữ số" defaultValue={v.idNumber} error={e.idNumber} autoComplete="off" />
        <Field name="insuranceNo" label="Mã thẻ BHYT" defaultValue={v.insuranceNo} error={e.insuranceNo} autoComplete="off" />
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-primary-strong">Liên hệ</legend>
        <Field name="phone" label="Số điện thoại" type="tel" inputMode="tel" hint="Dùng để gọi nhắc tái khám" defaultValue={v.phone} error={e.phone} autoComplete="off" />
        <Field name="guardianName" label="Cha/mẹ hoặc người giám hộ" hint="Dùng khi bệnh nhân là trẻ nhỏ" defaultValue={v.guardianName} error={e.guardianName} autoComplete="off" />
        <div className="sm:col-span-2">
          <Field name="address" label="Địa chỉ" defaultValue={v.address} error={e.address} maxLength={300} autoComplete="off" />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-primary-strong">Ghi chú</legend>
        <Field name="allergyNote" label="Dị ứng đã biết" error={e.allergyNote} hint="Ghi đúng như bệnh nhân/người nhà khai báo hoặc theo giấy tờ.">
          <textarea
            id="pf-allergyNote"
            name="allergyNote"
            rows={3}
            maxLength={1000}
            defaultValue={v.allergyNote}
            aria-describedby="pf-allergyNote-hint"
            className={`${inputClass} border-line`}
          />
        </Field>
      </fieldset>

      <div className="flex flex-wrap gap-3 border-t border-line pt-5">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Đang lưu…" : submitLabel}
        </button>
        <Link href={cancelHref} className={secondaryButtonClass}>
          Huỷ
        </Link>
      </div>
    </form>
  );
}
