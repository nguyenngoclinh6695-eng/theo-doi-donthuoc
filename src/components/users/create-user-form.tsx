"use client";

import { useActionState } from "react";
import { createUser, type UserFormState } from "@/app/actions/users";
import { IssuedPassword } from "@/components/users/issued-password";
import { FormError, FormField, primaryButtonClass } from "@/components/ui/form-field";
import { roleLabels } from "@/lib/format";
import type { UserRole } from "@/domain/types";

export function CreateUserForm({ roles }: { roles: UserRole[] }) {
  const [state, action, pending] = useActionState<UserFormState, FormData>(createUser, {});

  return (
    <div className="space-y-4">
      <form action={action} className="grid gap-4 sm:grid-cols-[1fr_1fr_12rem_auto] sm:items-start">
        <FormField id="new-fullName" name="fullName" label="Họ tên" required maxLength={100} />
        <FormField id="new-username" name="username" label="Tên đăng nhập" required autoCapitalize="none" pattern="[a-z0-9._\-]{3,32}" hint="Chữ thường không dấu, số, dấu . _ -" />
        <div>
          <label htmlFor="new-role" className="block text-sm font-medium">
            Vai trò
          </label>
          <select id="new-role" name="role" required defaultValue="" className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-primary">
            <option value="" disabled>
              Chọn vai trò
            </option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]}
              </option>
            ))}
          </select>
        </div>
        {/* sm:mt-7 để nút thẳng hàng với ô nhập (nằm dưới nhãn). */}
        <button type="submit" disabled={pending} className={`${primaryButtonClass} sm:mt-7`}>
          {pending ? "Đang tạo…" : "Tạo tài khoản"}
        </button>
      </form>
      <FormError message={state.error} />
      {state.issued && <IssuedPassword {...state.issued} />}
    </div>
  );
}
