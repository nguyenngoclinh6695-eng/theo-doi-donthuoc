"use client";

import { useActionState } from "react";
import { changeUserRole, resetUserPassword, setUserActive, type UserFormState } from "@/app/actions/users";
import { IssuedPassword } from "@/components/users/issued-password";
import { FormError, secondaryButtonClass } from "@/components/ui/form-field";
import type { UserRole } from "@/domain/types";
import { roleLabels } from "@/lib/format";

export function RoleSelect({ userId, role, roles, disabled }: { userId: string; role: UserRole; roles: UserRole[]; disabled: boolean }) {
  return (
    <form action={changeUserRole.bind(null, userId)} className="flex items-center gap-2">
      <label htmlFor={`role-${userId}`} className="sr-only">
        Vai trò
      </label>
      <select
        id={`role-${userId}`}
        name="role"
        defaultValue={role}
        disabled={disabled}
        // Đổi vai trò là thao tác nhạy cảm: phải bấm "Lưu" chứ không tự lưu khi chọn.
        className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm disabled:bg-page"
      >
        {roles.map((r) => (
          <option key={r} value={r}>
            {roleLabels[r]}
          </option>
        ))}
      </select>
      {!disabled && (
        <button type="submit" className={secondaryButtonClass}>
          Lưu
        </button>
      )}
    </form>
  );
}

export function UserRowActions({ userId, isActive, isSelf }: { userId: string; isActive: boolean; isSelf: boolean }) {
  const [state, resetAction, resetting] = useActionState<UserFormState>(resetUserPassword.bind(null, userId), {});

  if (isSelf) return <p className="text-xs text-ink-muted">Tài khoản của bạn</p>;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <form action={resetAction}>
          <button type="submit" disabled={resetting} className={secondaryButtonClass}>
            {resetting ? "Đang đặt lại…" : "Đặt lại mật khẩu"}
          </button>
        </form>
        <form action={setUserActive.bind(null, userId, !isActive)}>
          <button type="submit" className={secondaryButtonClass}>
            {isActive ? "Khoá tài khoản" : "Mở khoá"}
          </button>
        </form>
      </div>
      <FormError message={state.error} />
      {state.issued && <IssuedPassword {...state.issued} />}
    </div>
  );
}
