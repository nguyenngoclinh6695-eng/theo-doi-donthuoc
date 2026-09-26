import { AppShell } from "@/components/layout/app-shell";
import { TopBar } from "@/components/layout/top-bar";
import { can } from "@/domain/permissions";
import { getSessionUser } from "@/lib/auth/dal";
import { clinicConfig } from "@/lib/clinic-config";
import { navItems } from "@/lib/navigation";

// Layout chỉ LẤY người dùng để vẽ menu và thanh trên; việc CHẶN truy cập nằm ở từng trang (requirePermission),
// vì layout không chạy lại khi chuyển trang phía trình duyệt.
export default async function WorkspaceLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  const visibleNav = user
    ? navItems.filter((i) => can(user.role, i.permission)).map(({ slug, label, icon }) => ({ slug, label, icon }))
    : [];

  return (
    <AppShell clinicName={clinicConfig.name} navItems={visibleNav} topBar={<TopBar user={user} />}>
      {children}
    </AppShell>
  );
}
