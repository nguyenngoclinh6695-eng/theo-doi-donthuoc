import type { Metadata } from "next";
import { renameUser } from "@/app/actions/users";
import { CreateUserForm } from "@/components/users/create-user-form";
import { RenameForm } from "@/components/users/rename-form";
import { RoleSelect, UserRowActions } from "@/components/users/user-row-actions";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePermission } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { ALL_ROLES, toDomainRole } from "@/lib/roles";

export const metadata: Metadata = { title: "Người dùng" };

export default async function UsersPage() {
  const admin = await requirePermission("users.manage");
  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { fullName: "asc" }],
    select: { id: true, username: true, fullName: true, role: true, isActive: true, isSample: true, lastLoginAt: true, lockedUntil: true, mustChangePassword: true },
  });
  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary-strong">Người dùng</h1>
        <p className="mt-1 text-ink-muted">Tạo tài khoản cho nhân viên, đặt lại mật khẩu, khoá tài khoản khi nghỉ việc.</p>
      </div>

      <SectionCard id="tao-tai-khoan" title="Tạo tài khoản mới" description="Hệ thống sinh mật khẩu tạm; nhân viên phải đổi ở lần đăng nhập đầu.">
        <div className="p-5">
          <CreateUserForm roles={ALL_ROLES} />
        </div>
      </SectionCard>

      <SectionCard id="danh-sach" title="Danh sách tài khoản" description={`${users.length} tài khoản · ${users.filter((u) => u.isActive).length} đang hoạt động`}>
        <ul className="divide-y divide-line">
          {users.map((u) => {
            const locked = u.lockedUntil !== null && u.lockedUntil > now;
            return (
              <li key={u.id} className={`grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_16rem_minmax(0,22rem)] lg:items-start ${u.isActive ? "" : "bg-page"}`}>
                <div className="min-w-0">
                  <p className="font-medium">{u.fullName}</p>
                  <p className="text-sm text-ink-muted">
                    {u.username} · Đăng nhập gần nhất: {u.lastLoginAt ? formatDateTime(u.lastLoginAt.toISOString()) : "chưa"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {u.isActive ? <StatusBadge tone="success" icon="check" label="Đang hoạt động" /> : <StatusBadge tone="danger" icon="lock" label="Đã khoá" />}
                    {locked && <StatusBadge tone="attention" icon="clock" label="Tạm khoá do nhập sai" />}
                    {u.mustChangePassword && <StatusBadge tone="neutral" icon="key" label="Chờ đổi mật khẩu" />}
                    {u.isSample && <StatusBadge tone="attention" icon="alert" label="Tài khoản mẫu" />}
                  </div>
                  <div className="mt-2">
                    <RenameForm id={u.id} fullName={u.fullName} action={renameUser.bind(null, u.id)} />
                  </div>
                </div>
                <RoleSelect userId={u.id} role={toDomainRole(u.role)} roles={ALL_ROLES} disabled={u.id === admin.id} />
                <UserRowActions userId={u.id} isActive={u.isActive} isSelf={u.id === admin.id} />
              </li>
            );
          })}
        </ul>
      </SectionCard>
    </div>
  );
}
