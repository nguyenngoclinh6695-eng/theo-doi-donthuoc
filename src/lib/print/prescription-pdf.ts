// Sinh PDF đơn thuốc từ template templates/don-thuoc-tt26.html (Phụ lục I TT 26/2025/TT-BYT, đơn thông thường "C").
// Dùng Microsoft Edge có sẵn trên Windows (qua playwright-core) để in HTML ra PDF – không tải thêm trình duyệt.
// Dữ liệu in lấy từ ẢNH CHỤP lúc chốt đơn, nên bản in luôn khớp với đơn đã chốt dù hồ sơ/danh mục sửa sau.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser } from "playwright-core";
import type { PatientSnapshot } from "@/domain/prescription";
import { ageOn } from "@/domain/patient";
import { GUARDIAN_REQUIRED_UNDER_MONTHS } from "@/domain/prescription";
import { prisma } from "@/lib/db";
import { clinicDateKey } from "@/lib/time";

const TEMPLATE = path.join(process.cwd(), "templates", "don-thuoc-tt26.html");

/** Thông tin cơ sở in ở đầu đơn – khai báo trong .env. Thiếu thì không in (tránh in thông tin giả lên giấy tờ). */
export function clinicPrintInfo(): { ten: string; dia_chi: string; dien_thoai: string } | { missing: string[] } {
  const ten = process.env.CLINIC_NAME?.trim() ?? "";
  const dia_chi = process.env.CLINIC_ADDRESS?.trim() ?? "";
  const dien_thoai = process.env.CLINIC_PHONE?.trim() ?? "";
  const missing = [!ten && "CLINIC_NAME", !dia_chi && "CLINIC_ADDRESS", !dien_thoai && "CLINIC_PHONE"].filter(Boolean) as string[];
  return missing.length ? { missing } : { ten, dia_chi, dien_thoai };
}

export class PrintError extends Error {}

const ddmmyyyy = (key: string) => key.split("-").reverse().join("/");

/** Dựng đúng cấu trúc dữ liệu mà template (hàm renderDonThuoc) mong đợi. */
export async function buildPrintData(prescriptionId: string) {
  const rx = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!rx) throw new PrintError("Không tìm thấy đơn thuốc.");
  if (rx.status !== "FINALIZED") throw new PrintError(rx.status === "DRAFT" ? "Đơn chưa chốt – chỉ in được đơn đã chốt." : "Đơn đã huỷ – không in.");
  const snap = rx.patientSnapshot as PatientSnapshot | null;
  if (!snap || !rx.finalizedAt) throw new PrintError("Đơn thiếu dữ liệu chốt – không in được.");

  const clinic = clinicPrintInfo();
  if ("missing" in clinic) {
    throw new PrintError(`Chưa khai báo thông tin phòng khám để in trên đơn: ${clinic.missing.join(", ")} (trong file .env).`);
  }

  const ngayKe = clinicDateKey(rx.finalizedAt);
  const isYoungChild = snap.dateOfBirth ? ageOn(snap.dateOfBirth, ngayKe).months < GUARDIAN_REQUIRED_UNDER_MONTHS : false;
  const loiDan = (rx.advice ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (rx.followUpDate) loiDan.push(`Tái khám ngày ${ddmmyyyy(rx.followUpDate.toISOString().slice(0, 10))}, mang theo đơn này.`);

  return {
    ma_don: rx.code,
    co_so: clinic,
    benh_nhan: {
      ho_ten: snap.fullName,
      so_dinh_danh: snap.idNumber ?? "",
      ngay_sinh: snap.dateOfBirth ?? "",
      // Chuỗi đã định dạng kiểu Việt Nam (dấu phẩy thập phân), vd. "14,5".
      can_nang_kg: rx.weightKgSnapshot ? Number(rx.weightKgSnapshot.toString()).toLocaleString("vi-VN", { maximumFractionDigits: 2 }) : "",
      gioi_tinh: snap.sex === "nam" || snap.sex === "nu" ? snap.sex : "",
      ma_bhyt: snap.insuranceNo ?? "",
      noi_o: snap.address ?? "",
      so_dien_thoai: snap.phone ?? "",
      // Dòng "người đưa trẻ" chỉ ghi với trẻ dưới 72 tháng tuổi.
      nguoi_dua_tre: isYoungChild ? (snap.guardianName ?? "") : "",
    },
    chan_doan: rx.diagnosisText ? [{ ten: rx.diagnosisText, ma: "" }] : [],
    thuoc: rx.items.map((i) => ({
      hoat_chat: i.drugIngredient,
      ten_thuong_mai: i.drugBrand ?? "",
      nhieu_hoat_chat: i.drugIsCombination,
      ham_luong: i.drugStrength,
      so_luong: i.quantity,
      don_vi: i.unit,
      duong_dung: i.route ?? "",
      lieu_moi_lan: i.dosePerTime ?? "",
      so_lan_ngay: i.timesPerDay ?? "",
      thoi_diem: i.timing ?? "",
      so_ngay: i.durationDays ?? "",
      // Danh mục chưa phân loại "thuốc độc" nên giữ nguyên thứ tự bác sĩ nhập.
      thuoc_doc: false,
      ghi_chu: i.dosageInstruction,
    })),
    loi_dan: loiDan,
    ngay_ke: ngayKe,
    bac_si: { chuc_danh: "Bác sỹ", ho_ten: rx.doctorNameSnapshot ?? "" },
  };
}

export type PrintData = Awaited<ReturnType<typeof buildPrintData>>;

async function launch(): Promise<Browser> {
  // Mặc định dùng Edge có sẵn; có thể chỉ định trình duyệt khác bằng PDF_BROWSER_PATH (vd. máy chủ không có Edge).
  const executablePath = process.env.PDF_BROWSER_PATH?.trim();
  return executablePath ? chromium.launch({ executablePath, headless: true }) : chromium.launch({ channel: "msedge", headless: true });
}

export async function renderPrescriptionPdf(data: PrintData, paper: "A5" | "A4" = "A5"): Promise<Buffer> {
  const html = await readFile(TEMPLATE, "utf8");
  const browser = await launch();
  try {
    const context = await browser.newContext({ javaScriptEnabled: true });
    const page = await context.newPage();
    // Chặn mọi truy cập mạng: template không cần tài nguyên ngoài, và dữ liệu bệnh nhân không được gửi đi đâu.
    await page.route("**/*", (route) => route.abort());
    await page.addInitScript(() => {
      (window as unknown as { __PHONG_KHAM_IN__: boolean }).__PHONG_KHAM_IN__ = true;
    });
    await page.setContent(html, { waitUntil: "load" });

    await page.evaluate(
      ({ d, a4 }) => {
        const w = window as unknown as { renderDonThuoc: (x: unknown) => void };
        w.renderDonThuoc(d);
        if (a4) {
          document.documentElement.classList.add("a4");
          document.getElementById("page-size")!.textContent = "@page { size: A4 portrait; margin: 14mm 16mm; }";
        }
      },
      { d: data, a4: paper === "A4" },
    );

    // Kiểm tra lại trước khi xuất: trang phải hiện đúng mã đơn và tên bệnh nhân của đơn này (không phải dữ liệu mẫu).
    const shown = await page.evaluate(() => ({
      code: document.querySelector('[data-f="ma_don"]')?.textContent ?? "",
      name: document.querySelector('[data-f="benh_nhan.ho_ten"]')?.textContent ?? "",
      rows: document.querySelectorAll("#rx-body tr").length,
    }));
    if (shown.code !== data.ma_don || shown.name !== data.benh_nhan.ho_ten || shown.rows !== data.thuoc.length) {
      throw new PrintError("Bản in không khớp dữ liệu đơn – đã dừng, không xuất PDF.");
    }

    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    await context.close();
    return pdf;
  } finally {
    await browser.close();
  }
}
