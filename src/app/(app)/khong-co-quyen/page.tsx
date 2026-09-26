import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { requireUser } from "@/lib/auth/dal";
import { roleLabels } from "@/lib/format";

export const metadata: Metadata = { title: "Không có quyền truy cập" };

export default async function ForbiddenPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-xl py-12 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger-ink">
        <Icon name="lock" className="size-7" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold text-primary-strong">Không có quyền truy cập</h1>
      <p className="mt-2 text-ink-muted">
        Vai trò <strong className="font-semibold text-ink">{roleLabels[user.role]}</strong> không được mở trang này.
        Nếu cần, hãy liên hệ quản trị phòng khám.
      </p>
      <div className="mt-8">
        <Link href="/" className="text-sm font-medium text-primary-ink underline-offset-4 hover:underline">
          ← Về trang Tổng quan
        </Link>
      </div>
    </div>
  );
}
