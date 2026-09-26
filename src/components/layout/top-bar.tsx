import Link from "next/link";
import { connection } from "next/server";
import { logout } from "@/app/actions/auth";
import { Icon } from "@/components/icons";
import { PatientQuickSearch } from "@/components/patients/patient-quick-search";
import { can } from "@/domain/permissions";
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

      {/* Chỉ vai trò được xem hồ sơ mới có ô tìm bệnh nhân. */}
      {user && can(user.role, "patients.view") ? <PatientQuickSearch /> : <div className="ml-auto" />}

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
