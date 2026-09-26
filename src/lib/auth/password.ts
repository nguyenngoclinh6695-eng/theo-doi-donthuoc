// Băm và kiểm tra mật khẩu bằng scrypt có sẵn trong Node.js – không cần cài thư viện ngoài.
// Định dạng lưu: scrypt$N$r$p$salt$hash (base64url), để sau này tăng độ khó vẫn kiểm tra được mật khẩu cũ.

import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scrypt = (password: string, salt: Buffer, keylen: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key))),
  );

const PARAMS = { N: 16384, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;

export const PASSWORD_MIN_LENGTH = 10;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFC"), salt, KEY_LENGTH, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64url");
  const actual = await scrypt(password.normalize("NFC"), Buffer.from(saltB64, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  // So sánh thời gian cố định để không lộ thông tin qua thời gian phản hồi.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

let dummyHash: Promise<string> | undefined;
/**
 * Khi tên đăng nhập không tồn tại vẫn chạy scrypt một lần,
 * để thời gian phản hồi giống hệt trường hợp sai mật khẩu (không dò được tên tài khoản).
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword("khong-dung-mat-khau-nay");
  await verifyPassword(password, await dummyHash);
}

/** Trả về lỗi (tiếng Việt) nếu mật khẩu mới không đạt yêu cầu, null nếu hợp lệ. */
export function checkPasswordPolicy(password: string, username: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`;
  if (password.length > 200) return "Mật khẩu quá dài (tối đa 200 ký tự).";
  if (password.toLowerCase().includes(username.toLowerCase())) return "Mật khẩu không được chứa tên đăng nhập.";
  return null;
}

/** Mật khẩu tạm dễ đọc (bỏ các ký tự dễ nhầm như 0/O, 1/l) để quản trị đọc cho nhân viên. */
export function generateTemporaryPassword(length = 12): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join("");
}
