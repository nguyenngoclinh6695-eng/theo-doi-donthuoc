import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { Icon } from "@/components/icons";
import { requireUser } from "@/lib/auth/dal";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password";

export const metadata: Metadata = { title: "Đổi mật khẩu" };

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPendingPasswordChange: true });

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-primary-strong">Đổi mật khẩu</h1>
      <p className="mt-1 text-ink-muted">Tài khoản: {user.username}</p>

      {user.mustChangePassword && (
        <p className="mt-4 flex gap-2 rounded-lg border border-attention/40 bg-attention-soft px-3 py-2 text-sm text-attention-ink">
          <Icon name="lock" className="mt-0.5 size-4 shrink-0" />
          Bạn đang dùng mật khẩu tạm. Hãy đặt mật khẩu riêng trước khi tiếp tục làm việc.
        </p>
      )}

      <div className="mt-6 rounded-xl border border-line bg-surface p-6">
        <ChangePasswordForm minLength={PASSWORD_MIN_LENGTH} />
      </div>
    </div>
  );
}
