// Lưu và đọc bản scan đơn thuốc đã ký trên ổ đĩa máy chủ (không nằm trong thư mục public, chỉ đọc qua route có kiểm tra quyền).
// Thư mục mặc định: <dự án>/storage/scans – đổi bằng biến STORAGE_DIR. Nhớ sao lưu thư mục này cùng database.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_SCAN_BYTES = 10 * 1024 * 1024;

// turbopackIgnore: thư mục lưu trữ nằm ngoài mã nguồn, không cần Next.js dò file khi build.
const storageRoot = () => path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR?.trim() || path.join(/* turbopackIgnore: true */ process.cwd(), "storage"));
const scanDir = () => path.join(storageRoot(), "scans");

export type ScanKind = { ext: "pdf" | "jpg" | "png"; contentType: string };

/** Nhận dạng loại file bằng "chữ ký" ở đầu nội dung – không tin đuôi file hay loại do trình duyệt báo. */
export function detectScanKind(bytes: Uint8Array): ScanKind | null {
  const starts = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return { ext: "pdf", contentType: "application/pdf" }; // %PDF-
  if (starts([0xff, 0xd8, 0xff])) return { ext: "jpg", contentType: "image/jpeg" };
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: "png", contentType: "image/png" };
  return null;
}

/** Ghi file mới (không ghi đè bản cũ) và trả về đường dẫn tương đối để lưu vào database. */
export async function saveScan(prescriptionId: string, bytes: Uint8Array, kind: ScanKind): Promise<string> {
  await mkdir(scanDir(), { recursive: true });
  const name = `${prescriptionId}-${Date.now()}.${kind.ext}`;
  await writeFile(path.join(scanDir(), name), bytes, { flag: "wx" });
  return `scans/${name}`;
}

/** Đọc file theo đường dẫn tương đối đã lưu; chặn mọi đường dẫn thoát ra ngoài thư mục lưu trữ. */
export async function readScan(relativePath: string): Promise<{ bytes: Buffer; kind: ScanKind } | null> {
  const full = path.resolve(storageRoot(), relativePath);
  if (!full.startsWith(scanDir() + path.sep)) return null;
  try {
    const bytes = await readFile(full);
    const kind = detectScanKind(bytes);
    return kind ? { bytes, kind } : null;
  } catch {
    return null;
  }
}
