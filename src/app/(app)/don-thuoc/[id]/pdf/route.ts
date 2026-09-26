// Tải/xem PDF đơn thuốc đã chốt: GET /don-thuoc/<id>/pdf?kho=A4 (mặc định A5).

import { foldVietnamese } from "@/domain/patient";
import { can } from "@/domain/permissions";
import { getSessionUser } from "@/lib/auth/dal";
import { writeAudit } from "@/lib/audit";
import { buildPrintData, PrintError, renderPrescriptionPdf } from "@/lib/print/prescription-pdf";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const asciiName = (code: string) => `don-thuoc-${foldVietnamese(code).replace(/[^a-z0-9-]/gi, "_")}.pdf`;

const text = (status: number, message: string) =>
  new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

export async function GET(request: Request, ctx: RouteContext<"/don-thuoc/[id]/pdf">) {
  // Route handler không đi qua layout/trang, nên tự kiểm tra đăng nhập và quyền ở đây.
  const user = await getSessionUser();
  if (!user) return text(401, "Chưa đăng nhập.");
  if (user.mustChangePassword) return text(403, "Cần đổi mật khẩu trước.");
  if (!can(user.role, "prescriptions.view")) return text(403, "Không có quyền xem đơn thuốc.");

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return text(404, "Không tìm thấy đơn.");
  const paper = new URL(request.url).searchParams.get("kho") === "A4" ? "A4" : "A5";

  try {
    const data = await buildPrintData(id);
    const pdf = await renderPrescriptionPdf(data, paper);
    await writeAudit({ actorId: user.id, action: "prescription.print", entityType: "Prescription", entityId: id, details: { paper } });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        // Header HTTP chỉ nhận ký tự ASCII: tên file không dấu, kèm tên gốc mã hoá (RFC 5987) cho trình duyệt hiện đúng.
        "Content-Disposition": `inline; filename="${asciiName(data.ma_don)}"; filename*=UTF-8''${encodeURIComponent(`don-thuoc-${data.ma_don}.pdf`)}`,
        // Không lưu bản in trong bộ nhớ đệm trình duyệt/proxy (có thông tin bệnh nhân).
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof PrintError) return text(422, e.message);
    console.error("Lỗi sinh PDF đơn thuốc", e);
    return text(500, "Không sinh được PDF. Kiểm tra máy chủ đã có Microsoft Edge (hoặc cấu hình PDF_BROWSER_PATH).");
  }
}
