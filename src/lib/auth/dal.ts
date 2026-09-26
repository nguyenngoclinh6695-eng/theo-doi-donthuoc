// Lớp kiểm tra quyền (Data Access Layer). Mọi trang và server action cần dữ liệu đều phải đi qua đây.
// proxy.ts chỉ chặn sơ bộ người chưa đăng nhập; kiểm tra thật sự nằm ở các hàm dưới.

import { cache } from "react";
import { redirect } from "next/navigation";
import { can, type Permission } from "@/domain/permissions";
import type { CurrentUser } from "@/domain/types";
import { toDomainRole } from "@/lib/roles";
import { getValidSession } from "@/lib/auth/session";

export interface SessionUser extends CurrentUser {
  mustChangePassword: boolean;
}

/** Người dùng của phiên hiện tại, hoặc null. Dùng cache() để trong một lượt tải trang chỉ truy vấn DB một lần. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getValidSession();
  if (!session) return null;
  const u = session.user;
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: toDomainRole(u.role),
    mustChangePassword: u.mustChangePassword,
  };
});

/**
 * Bắt buộc đã đăng nhập. Tài khoản đang bị yêu cầu đổi mật khẩu sẽ bị đưa sang trang đổi mật khẩu,
 * trừ khi chính trang đó gọi (allowPendingPasswordChange).
 */
export async function requireUser(options: { allowPendingPasswordChange?: boolean } = {}): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/dang-nhap");
  if (user.mustChangePassword && !options.allowPendingPasswordChange) redirect("/doi-mat-khau");
  return user;
}

/** Bắt buộc có quyền; thiếu quyền thì chuyển sang trang thông báo "Không có quyền". */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect("/khong-co-quyen");
  return user;
}
