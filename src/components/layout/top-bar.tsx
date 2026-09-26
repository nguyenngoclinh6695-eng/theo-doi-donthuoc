import Link from "next/link";
import { connection } from "next/server";
import { logout } from "@/app/actions/auth";
import { Icon } from "@/components/icons";
import type { SessionUser } from "@/lib/auth/dal";
import { clinicConfig } from "@/lib/clinic-config";
import { formatLongDate, roleLabels } from "@/lib/format";

export async function TopBar({ user }: { user: SessionUser | null }) {
  // Đánh dấu render theo từng yêu cầu, để "ngày hôm nay" không bị đóng băng vào lúc build.
  await connection();
  const today = formatLongDate(new Date());

  return (
    <div className="flex h-16 items-center gap-4">
      <div className="hidden min-w-0 md:block">
        <p className="truncate text-sm font-semibold text-primary-strong">{clinicConfig.name}</p>
        <p className="text-xs capitalize text-ink-muted">{today}</p>
      </div>

      {/* Ô tìm bệnh nhân – bước này chỉ dựng giao diện, chưa tìm thật.
          Cố ý không dùng <form> gửi đi: từ khoá (tên, SĐT) không được nằm trên URL. */}
      <div role="search" className="ml-auto w-full max-w-sm">
        <label htmlFor="patient-search" className="sr-only">
          Tìm bệnh nhân
        </label>
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            id="patient-search"
            name="q"
            type="search"
            placeholder="Tìm bệnh nhân theo tên, mã, SĐT…"
            className="w-full rounded-lg border border-line bg-page py-2 pl-9 pr-3 text-sm placeholder:text-ink-muted focus:border-primary focus:bg-surface"
          />
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-1">
          <Link
            href="/doi-mat-khau"
            className="hidden rounded-lg px-2 py-1 text-right hover:bg-accent sm:block"
            title="Đổi mật khẩu"
            aria-label={`${user.fullName}, ${roleLabels[user.role]} – đổi mật khẩu`}
          >
            <span className="block whitespace-nowrap text-sm font-medium">{user.fullName}</span>
            <span className="block text-xs text-ink-muted">{roleLabels[user.role]}</span>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              aria-label="Đăng xuất"
              title="Đăng xuất"
              className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-primary-ink hover:bg-accent"
            >
              <Icon name="logout" className="size-4" />
              <span className="hidden lg:inline" aria-hidden="true">
                Đăng xuất
              </span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
