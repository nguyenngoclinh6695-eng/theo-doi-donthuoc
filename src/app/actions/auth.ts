"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, requireUser } from "@/lib/auth/dal";
import { burnPasswordCheck, checkPasswordPolicy, hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroyCurrentSession, destroyUserSessions } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";

export interface FormState {
  error?: string;
}

/** Nhập sai quá số lần này thì tạm khoá tài khoản. */
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

const GENERIC_LOGIN_ERROR = "Tên đăng nhập hoặc mật khẩu không đúng.";

/** Chỉ cho quay lại đường dẫn nội bộ, chặn kiểu "?next=https://trang-la.com" (open redirect). */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Nhập đủ tên đăng nhập và mật khẩu." };

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !user.passwordHash || !user.isActive) {
    await burnPasswordCheck(password);
    await writeAudit({ actorId: null, action: "auth.login.failed", entityType: "User", details: { username, reason: "unknown_or_inactive" } });
    return { error: GENERIC_LOGIN_ERROR };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    await writeAudit({ actorId: null, action: "auth.login.failed", entityType: "User", entityId: user.id, details: { username, reason: "locked" } });
    return { error: `Tài khoản đang tạm khoá do nhập sai nhiều lần. Thử lại sau khoảng ${minutes} phút hoặc nhờ quản trị đặt lại mật khẩu.` };
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = user.failedLoginCount + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await prisma.user.update({
      where: { id: user.id },
      data: lock
        ? { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
        : { failedLoginCount: failed },
    });
    await writeAudit({
      actorId: null,
      action: lock ? "auth.account.locked" : "auth.login.failed",
      entityType: "User",
      entityId: user.id,
      details: { username, reason: "wrong_password", failedCount: failed },
    });
    return { error: GENERIC_LOGIN_ERROR };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await createSession(user.id, (await headers()).get("user-agent"));
  await writeAudit({ actorId: user.id, action: "auth.login.success", entityType: "User", entityId: user.id });

  redirect(user.mustChangePassword ? "/doi-mat-khau" : safeNext(formData.get("next")));
}

export async function logout(): Promise<void> {
  const user = await getSessionUser();
  await destroyCurrentSession();
  if (user) await writeAudit({ actorId: user.id, action: "auth.logout", entityType: "User", entityId: user.id });
  redirect("/dang-nhap");
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser({ allowPendingPasswordChange: true });
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!record.passwordHash || !(await verifyPassword(current, record.passwordHash))) {
    return { error: "Mật khẩu hiện tại không đúng." };
  }
  if (next !== confirm) return { error: "Hai lần nhập mật khẩu mới không khớp." };
  if (next === current) return { error: "Mật khẩu mới phải khác mật khẩu hiện tại." };
  const policyError = checkPasswordPolicy(next, user.username);
  if (policyError) return { error: policyError };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });
  // Đổi mật khẩu thì đăng xuất các máy khác, chỉ giữ phiên đang dùng.
  await destroyUserSessions(user.id, true);
  await writeAudit({ actorId: user.id, action: "auth.password.change", entityType: "User", entityId: user.id });

  redirect("/");
}
