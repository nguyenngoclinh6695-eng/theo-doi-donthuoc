"use client";

import { useActionState } from "react";
import { changePassword, type FormState } from "@/app/actions/auth";
import { FormError, FormField, primaryButtonClass } from "@/components/ui/form-field";

export function ChangePasswordForm({ minLength }: { minLength: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});

  return (
    <form action={action} className="space-y-4">
      <FormField id="currentPassword" name="currentPassword" label="Mật khẩu hiện tại" type="password" autoComplete="current-password" required />
      <FormField
        id="newPassword"
        name="newPassword"
        label="Mật khẩu mới"
        type="password"
        autoComplete="new-password"
        minLength={minLength}
        hint={`Ít nhất ${minLength} ký tự, không chứa tên đăng nhập. Nên dùng một câu dễ nhớ.`}
        required
      />
      <FormField id="confirmPassword" name="confirmPassword" label="Nhập lại mật khẩu mới" type="password" autoComplete="new-password" required />
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Đang lưu…" : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
