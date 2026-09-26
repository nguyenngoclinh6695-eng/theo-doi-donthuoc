import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getSessionUser } from "@/lib/auth/dal";
import { clinicConfig } from "@/lib/clinic-config";

export const metadata: Metadata = { title: `Đăng nhập – ${clinicConfig.name}` };

export default async function LoginPage(props: PageProps<"/dang-nhap">) {
  if (await getSessionUser()) redirect("/");
  const { next } = await props.searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-wider text-ink-muted">Hệ thống nội bộ</p>
          <h1 className="mt-1 text-xl font-semibold text-primary-strong">{clinicConfig.name}</h1>
        </div>
        <div className="rounded-xl border border-line bg-surface p-6">
          <h2 className="text-lg font-semibold">Đăng nhập</h2>
          <p className="mt-1 text-sm text-ink-muted">Dùng tài khoản do quản trị phòng khám cấp.</p>
          <LoginForm next={typeof next === "string" ? next : ""} />
        </div>
        <p className="mt-6 text-center text-xs text-ink-muted">
          Chỉ dành cho nhân viên. Mọi lượt đăng nhập đều được ghi nhật ký.
        </p>
      </div>
    </main>
  );
}
