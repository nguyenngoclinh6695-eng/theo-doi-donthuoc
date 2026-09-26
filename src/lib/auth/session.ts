// Quản lý phiên đăng nhập lưu trong database.
// Cookie chỉ chứa token ngẫu nhiên; DB lưu bản băm SHA-256 của token.

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";

export { SESSION_COOKIE };

/** Tự đăng xuất khi không thao tác quá thời gian này – máy trạm phòng khám thường dùng chung. */
export const IDLE_TIMEOUT_MINUTES = 60;
/** Hạn tối đa của một phiên, dù vẫn đang thao tác (khoảng một ca làm việc). */
export const ABSOLUTE_TIMEOUT_HOURS = 12;
/** Chỉ ghi lại lastSeenAt khi đã cũ hơn mức này, tránh ghi DB ở mọi lượt tải trang. */
const TOUCH_INTERVAL_MS = 5 * 60_000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function cookieSecure(): boolean {
  // Mặc định bật "Secure" khi chạy production (bắt buộc HTTPS). Nếu tạm chạy HTTP trong LAN,
  // đặt AUTH_COOKIE_SECURE=false trong .env – nhưng nên cấu hình HTTPS càng sớm càng tốt.
  if (process.env.AUTH_COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

/** Tạo phiên mới và gắn cookie. Chỉ gọi trong Server Action hoặc Route Handler. */
export async function createSession(userId: string, userAgent: string | null): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ABSOLUTE_TIMEOUT_HOURS * 3_600_000);
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt, lastSeenAt: now, userAgent: userAgent?.slice(0, 300) },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, // JavaScript trên trang không đọc được cookie
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    expires: expiresAt,
  });
}

export type ValidSession = NonNullable<Awaited<ReturnType<typeof findValidSession>>>;

async function findValidSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;

  const now = Date.now();
  const idleExpired = session.lastSeenAt.getTime() + IDLE_TIMEOUT_MINUTES * 60_000 < now;
  if (session.expiresAt.getTime() < now || idleExpired || !session.user.isActive) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } });
  }
  return session;
}

/** Đọc cookie và trả về phiên hợp lệ (kèm người dùng), hoặc null. */
export async function getValidSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return findValidSession(token);
}

/** Xoá phiên hiện tại và cookie. Chỉ gọi trong Server Action. */
export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}

/** Đăng xuất mọi nơi của một người dùng (khi đặt lại mật khẩu, khoá tài khoản, đổi vai trò). */
export async function destroyUserSessions(userId: string, exceptCurrent = false): Promise<void> {
  let keepHash: string | undefined;
  if (exceptCurrent) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    keepHash = token ? hashToken(token) : undefined;
  }
  await prisma.session.deleteMany({
    where: { userId, ...(keepHash ? { tokenHash: { not: keepHash } } : {}) },
  });
}
