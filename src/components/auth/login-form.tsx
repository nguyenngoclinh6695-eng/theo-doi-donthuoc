"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/app/actions/auth";
import { FormError, FormField, primaryButtonClass } from "@/components/ui/form-field";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});

  return (
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormField id="username" name="username" label="Tên đăng nhập" autoComplete="username" autoCapitalize="none" required autoFocus />
      <FormField id="password" name="password" label="Mật khẩu" type="password" autoComplete="current-password" required />
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full`}>
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}
