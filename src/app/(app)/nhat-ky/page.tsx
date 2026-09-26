import type { Metadata } from "next";
import { SectionCard } from "@/components/ui/section-card";
import { requirePermission } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Nhật ký thao tác" };

const PAGE_SIZE = 200;

// Tên hành động dễ đọc; mã gốc vẫn hiện kèm để tra cứu chính xác.
const actionLabels: Record<string, string> = {
  "auth.login.success": "Đăng nhập",
  "auth.login.failed": "Đăng nhập thất bại",
  "auth.account.locked": "Tạm khoá do nhập sai nhiều lần",
  "auth.logout": "Đăng xuất",
  "auth.password.change": "Tự đổi mật khẩu",
  "user.create": "Tạo tài khoản",
  "user.password.reset": "Đặt lại mật khẩu",
  "user.activate": "Mở khoá tài khoản",
  "user.deactivate": "Khoá tài khoản",
  "user.role.change": "Đổi vai trò",
  "reminder_call.create": "Ghi nhận gọi nhắc trễ hẹn",
};

export default async function AuditLogPage() {
  await requirePermission("audit.view");
  const rows = await prisma.auditLog.findMany({
    orderBy: { at: "desc" },
    take: PAGE_SIZE,
    include: { actor: { select: { fullName: true, username: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary-strong">Nhật ký thao tác</h1>
        <p className="mt-1 text-ink-muted">Nhật ký chỉ được thêm, không sửa hay xoá. Đang hiện {rows.length} mục gần nhất.</p>
      </div>

      <SectionCard id="nhat-ky" title="Hoạt động gần đây">
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-muted">Chưa có hoạt động nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Nhật ký thao tác, mới nhất ở trên</caption>
              <thead className="text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Thời điểm</th>
                  <th scope="col" className="px-3 py-3 font-medium">Người thực hiện</th>
                  <th scope="col" className="px-3 py-3 font-medium">Hành động</th>
                  <th scope="col" className="px-5 py-3 font-medium">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-3 tabular-nums text-ink-muted">{formatDateTime(r.at.toISOString())}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {r.actor ? (
                        <>
                          {r.actor.fullName}
                          <span className="block text-xs text-ink-muted">{r.actor.username}</span>
                        </>
                      ) : (
                        <span className="text-ink-muted">Chưa đăng nhập</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {actionLabels[r.action] ?? r.action}
                      <span className="block font-mono text-xs text-ink-muted">{r.action}</span>
                    </td>
                    <td className="max-w-md break-words px-5 py-3 font-mono text-xs text-ink-muted">
                      {r.entityType}
                      {r.details ? ` · ${JSON.stringify(r.details)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
