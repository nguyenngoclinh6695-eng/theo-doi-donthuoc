import { connection } from "next/server";
import { Icon } from "@/components/icons";
import { clinicConfig } from "@/lib/clinic-config";
import { getCurrentUser } from "@/lib/data";
import { formatLongDate, roleLabels } from "@/lib/format";

export async function TopBar() {
  // Đánh dấu render theo từng yêu cầu, để "ngày hôm nay" không bị đóng băng vào lúc build.
  await connection();
  const user = await getCurrentUser();
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

      <div className="hidden text-right sm:block">
        <p className="whitespace-nowrap text-sm font-medium">{user.fullName}</p>
        <p className="text-xs text-ink-muted">{roleLabels[user.role]}</p>
      </div>
    </div>
  );
}
