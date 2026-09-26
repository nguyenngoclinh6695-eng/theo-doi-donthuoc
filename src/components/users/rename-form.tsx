"use client";

import { useActionState } from "react";
import type { UserFormState } from "@/app/actions/users";
import { secondaryButtonClass } from "@/components/ui/form-field";

/** Sửa họ tên hiển thị (in trên đơn thuốc với tài khoản bác sĩ). */
export function RenameForm({ action, id, fullName }: { action: (s: UserFormState, fd: FormData) => Promise<UserFormState>; id: string; fullName: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-primary-ink">Sửa họ tên</summary>
      <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
        <label htmlFor={`name-${id}`} className="sr-only">
          Họ tên
        </label>
        <input id={`name-${id}`} name="fullName" defaultValue={fullName} required maxLength={100} className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm" />
        <button type="submit" disabled={pending} className={secondaryButtonClass}>
          Lưu
        </button>
        {state.error && <span className="text-danger-ink">{state.error}</span>}
      </form>
    </details>
  );
}
