// Tạo hoặc cập nhật tài khoản THẬT từ một file JSON cục bộ (không đưa lên Git), rồi nên xoá file đó ngay.
//
// Cách dùng:
//   1. Tạo file accounts.local.json ở thư mục gốc dự án, dạng:
//      [{ "username": "bsloi", "fullName": "Họ tên", "role": "bac_si", "password": "..." }, ...]
//      role: bac_si | dieu_duong | tiep_don | quan_tri | duoc_si | ky_thuat_vien
//   2. npm run accounts:create
//   3. Xoá file accounts.local.json
//
// Tài khoản đã có (cùng username) sẽ được cập nhật vai trò/mật khẩu; họ tên chỉ đổi khi file có ghi.

import { existsSync, readFileSync } from "node:fs";
import type { UserRole } from "../src/domain/types";
import { hashPassword, PASSWORD_MIN_LENGTH } from "../src/lib/auth/password";
import { createPrismaClient } from "../src/lib/prisma-client";
import { ALL_ROLES, toDbRole } from "../src/lib/roles";

try {
  process.loadEnvFile();
} catch {}

const FILE = "accounts.local.json";
const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

interface AccountInput {
  username: string;
  fullName?: string;
  role: UserRole;
  password: string;
}

async function main() {
  if (!existsSync(FILE)) throw new Error(`Không thấy file ${FILE}. Xem hướng dẫn ở đầu file scripts/create-accounts.ts.`);
  const accounts = JSON.parse(readFileSync(FILE, "utf8")) as AccountInput[];
  if (!Array.isArray(accounts) || accounts.length === 0) throw new Error(`${FILE} phải là một mảng tài khoản.`);

  // Kiểm tra hết trước, lỗi thì không tạo tài khoản nào.
  const problems: string[] = [];
  for (const a of accounts) {
    const username = String(a.username ?? "").trim().toLowerCase();
    if (!USERNAME_RE.test(username)) problems.push(`"${a.username}": tên đăng nhập 3–32 ký tự, chữ thường không dấu, số, . _ -`);
    if (!ALL_ROLES.includes(a.role)) problems.push(`"${username}": vai trò "${a.role}" không hợp lệ.`);
    // Mật khẩu do phòng khám cấp: chỉ kiểm tra độ dài tối thiểu (phòng khám chọn dùng đúng mật khẩu đã định).
    // Quy tắc đầy đủ (không chứa tên đăng nhập...) vẫn áp dụng khi nhân viên tự đổi mật khẩu trên web.
    const len = String(a.password ?? "").length;
    if (len < PASSWORD_MIN_LENGTH || len > 200) problems.push(`"${username}": mật khẩu phải từ ${PASSWORD_MIN_LENGTH} đến 200 ký tự.`);
  }
  if (problems.length) throw new Error(`Chưa tạo tài khoản nào:\n- ${problems.join("\n- ")}`);

  const prisma = createPrismaClient();
  try {
    for (const a of accounts) {
      const username = a.username.trim().toLowerCase();
      const passwordHash = await hashPassword(a.password);
      const role = toDbRole(a.role);
      const existing = await prisma.user.findUnique({ where: { username } });
      const user = existing
        ? await prisma.user.update({
            where: { username },
            data: { role, passwordHash, isActive: true, mustChangePassword: false, failedLoginCount: 0, lockedUntil: null, ...(a.fullName ? { fullName: a.fullName } : {}) },
          })
        : await prisma.user.create({
            data: { username, fullName: a.fullName?.trim() || username, role, passwordHash, mustChangePassword: false, isSample: false },
          });
      await prisma.auditLog.create({
        data: { actorId: null, action: existing ? "user.password.reset" : "user.create", entityType: "User", entityId: user.id, details: { username, role, via: "script" } },
      });
      console.log(`${existing ? "Cập nhật" : "Tạo mới"}: ${username} (${a.role})`);
    }
  } finally {
    await prisma.$disconnect();
  }
  console.log(`\nXong. Hãy XOÁ file ${FILE} ngay để mật khẩu không nằm lại trên máy.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
