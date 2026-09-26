"use server";

import { revalidatePath } from "next/cache";
import type { UserRole } from "@/domain/types";
import { requirePermission } from "@/lib/auth/dal";
import { generateTemporaryPassword, hashPassword } from "@/lib/auth/password";
import { destroyUserSessions } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { ALL_ROLES, toDbRole } from "@/lib/roles";

export interface UserFormState {
  error?: string;
  /** Mật khẩu tạm chỉ trả về đúng một lần để quản trị đọc cho nhân viên; không lưu ở đâu dạng gốc. */
  issued?: { username: string; temporaryPassword: string };
}

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseRole(value: FormDataEntryValue | null): UserRole | null {
  return ALL_ROLES.includes(value as UserRole) ? (value as UserRole) : null;
}

/** Không cho thao tác làm phòng khám mất quản trị viên cuối cùng (sẽ không ai quản lý được tài khoản). */
async function isLastActiveAdmin(userId: string): Promise<boolean> {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  return admins.length === 1 && admins[0].id === userId;
}

export async function createUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const admin = await requirePermission("users.manage");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim().replace(/\s+/g, " ");
  const role = parseRole(formData.get("role"));

  if (!USERNAME_RE.test(username)) return { error: "Tên đăng nhập 3–32 ký tự, chỉ gồm chữ thường không dấu, số, dấu chấm, gạch dưới, gạch ngang." };
  if (fullName.length < 2 || fullName.length > 100) return { error: "Họ tên phải từ 2 đến 100 ký tự." };
  if (!role) return { error: "Chọn vai trò." };
  if (await prisma.user.findUnique({ where: { username } })) return { error: `Tên đăng nhập "${username}" đã tồn tại.` };

  const temporaryPassword = generateTemporaryPassword();
  const created = await prisma.user.create({
    data: { username, fullName, role: toDbRole(role), passwordHash: await hashPassword(temporaryPassword), mustChangePassword: true },
  });
  await writeAudit({ actorId: admin.id, action: "user.create", entityType: "User", entityId: created.id, details: { username, role } });

  revalidatePath("/nguoi-dung");
  return { issued: { username, temporaryPassword } };
}

export async function resetUserPassword(userId: string): Promise<UserFormState> {
  const admin = await requirePermission("users.manage");
  if (!UUID_RE.test(userId)) return { error: "Mã người dùng không hợp lệ." };
  if (userId === admin.id) return { error: "Tự đổi mật khẩu của mình ở trang Đổi mật khẩu." };
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Không tìm thấy người dùng." };

  const temporaryPassword = generateTemporaryPassword();
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(temporaryPassword), mustChangePassword: true, failedLoginCount: 0, lockedUntil: null },
  });
  // Mật khẩu cũ có thể đã lộ: đăng xuất người đó ở mọi máy.
  await destroyUserSessions(userId);
  await writeAudit({ actorId: admin.id, action: "user.password.reset", entityType: "User", entityId: userId });

  revalidatePath("/nguoi-dung");
  return { issued: { username: target.username, temporaryPassword } };
}

export async function setUserActive(userId: string, active: boolean): Promise<void> {
  const admin = await requirePermission("users.manage");
  if (!UUID_RE.test(userId)) throw new Error("Mã người dùng không hợp lệ.");
  if (userId === admin.id) throw new Error("Không tự khoá tài khoản của chính mình.");
  if (!active && (await isLastActiveAdmin(userId))) throw new Error("Không thể khoá quản trị viên cuối cùng.");

  await prisma.user.update({ where: { id: userId }, data: { isActive: active, ...(active ? { failedLoginCount: 0, lockedUntil: null } : {}) } });
  if (!active) await destroyUserSessions(userId);
  await writeAudit({ actorId: admin.id, action: active ? "user.activate" : "user.deactivate", entityType: "User", entityId: userId });
  revalidatePath("/nguoi-dung");
}

export async function changeUserRole(userId: string, formData: FormData): Promise<void> {
  const admin = await requirePermission("users.manage");
  const role = parseRole(formData.get("role"));
  if (!UUID_RE.test(userId) || !role) throw new Error("Dữ liệu không hợp lệ.");
  if (userId === admin.id) throw new Error("Không tự đổi vai trò của chính mình.");
  if (role !== "quan_tri" && (await isLastActiveAdmin(userId))) throw new Error("Không thể đổi vai trò của quản trị viên cuối cùng.");

  const before = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true } });
  await prisma.user.update({ where: { id: userId }, data: { role: toDbRole(role) } });
  await writeAudit({
    actorId: admin.id,
    action: "user.role.change",
    entityType: "User",
    entityId: userId,
    details: { from: before.role, to: toDbRole(role) },
  });
  revalidatePath("/nguoi-dung");
}

export async function renameUser(userId: string, _prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const admin = await requirePermission("users.manage");
  if (!UUID_RE.test(userId)) return { error: "Mã người dùng không hợp lệ." };
  const fullName = String(formData.get("fullName") ?? "").trim().replace(/\s+/g, " ");
  if (fullName.length < 2 || fullName.length > 100) return { error: "Họ tên phải từ 2 đến 100 ký tự." };
  await prisma.user.update({ where: { id: userId }, data: { fullName } });
  await writeAudit({ actorId: admin.id, action: "user.rename", entityType: "User", entityId: userId });
  revalidatePath("/nguoi-dung");
  return {};
}
