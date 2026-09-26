import { Icon } from "@/components/icons";

/** Hiện mật khẩu tạm đúng một lần sau khi tạo/đặt lại – tải lại trang là mất, hệ thống không lưu dạng gốc. */
export function IssuedPassword({ username, temporaryPassword }: { username: string; temporaryPassword: string }) {
  return (
    <div role="status" className="rounded-lg border border-success/40 bg-success-soft px-4 py-3 text-sm">
      <p className="flex items-center gap-2 font-medium text-success-ink">
        <Icon name="key" className="size-4" />
        Mật khẩu tạm cho <span className="font-semibold">{username}</span>
      </p>
      <p className="mt-2 select-all rounded-md bg-surface px-3 py-2 font-mono text-base tracking-wider text-ink">{temporaryPassword}</p>
      <p className="mt-2 text-ink-muted">
        Đưa trực tiếp cho nhân viên. Mật khẩu này chỉ hiện một lần; lần đăng nhập đầu tiên hệ thống sẽ bắt đổi mật khẩu.
      </p>
    </div>
  );
}
