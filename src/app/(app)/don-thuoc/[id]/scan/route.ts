// Xem bản scan đơn đã ký: GET /don-thuoc/<id>/scan – chỉ người có quyền xem đơn thuốc.

import { can } from "@/domain/permissions";
import { getSessionUser } from "@/lib/auth/dal";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { readScan } from "@/lib/scans";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (status: number, message: string) =>
  new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

export async function GET(_request: Request, ctx: RouteContext<"/don-thuoc/[id]/scan">) {
  const user = await getSessionUser();
  if (!user) return text(401, "Chưa đăng nhập.");
  if (user.mustChangePassword) return text(403, "Cần đổi mật khẩu trước.");
  if (!can(user.role, "prescriptions.view")) return text(403, "Không có quyền xem đơn thuốc.");

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return text(404, "Không tìm thấy.");
  const rx = await prisma.prescription.findUnique({ where: { id }, select: { signedScanPath: true, code: true } });
  if (!rx?.signedScanPath) return text(404, "Đơn chưa có bản scan.");
  const file = await readScan(rx.signedScanPath);
  if (!file) return text(404, "Không đọc được file bản scan trên máy chủ (có thể đã bị xoá khỏi thư mục lưu trữ).");

  await writeAudit({ actorId: user.id, action: "prescription.scan.view", entityType: "Prescription", entityId: id });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.kind.contentType,
      "Content-Disposition": `inline; filename="ban-scan.${file.kind.ext}"`,
      "Cache-Control": "no-store",
      // Chặn trình duyệt tự đoán lại loại file.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
