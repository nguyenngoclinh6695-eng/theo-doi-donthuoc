// Nghiệp vụ hồ sơ bệnh nhân (thuần, không phụ thuộc React/Next/Prisma): chuẩn hoá, kiểm tra dữ liệu nhập, tính tuổi.
// Chỉ kiểm tra ĐỊNH DẠNG hành chính; không có bất kỳ suy luận lâm sàng nào.

export type Sex = "nam" | "nu" | "khac";

export interface PatientInput {
  fullName: string;
  dateOfBirth: string | null; // "YYYY-MM-DD"
  sex: Sex | null;
  phone: string | null;
  address: string | null;
  idNumber: string | null;
  insuranceNo: string | null;
  guardianName: string | null;
  allergyNote: string | null;
}

export type PatientFieldErrors = Partial<Record<keyof PatientInput, string>>;

/** Bỏ dấu tiếng Việt và viết thường, để gõ "nguyen van a" vẫn tìm ra "Nguyễn Văn A". */
export function foldVietnamese(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export const digitsOnly = (text: string) => text.replace(/\D/g, "");

/** Chuỗi lưu vào cột searchText. */
export function buildSearchText(p: { fullName: string; code: string; phone?: string | null; idNumber?: string | null }): string {
  return [foldVietnamese(p.fullName), p.code.toLowerCase(), digitsOnly(p.phone ?? ""), digitsOnly(p.idNumber ?? "")]
    .filter(Boolean)
    .join(" ");
}

/** Số kết quả tìm kiếm tối đa trả về một lần. */
export const PATIENT_SEARCH_LIMIT = 20;

/** Tách từ khoá tìm kiếm thành các từ đã bỏ dấu; bỏ từ rỗng, giới hạn số từ để truy vấn gọn. */
export function searchTokens(query: string): string[] {
  return foldVietnamese(query).split(/\s+/).filter(Boolean).slice(0, 6);
}

const clean = (v: FormDataEntryValue | null | undefined): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  return t === "" ? null : t;
};

/** Đọc và kiểm tra dữ liệu từ form. todayKey ("YYYY-MM-DD") truyền vào để hàm thuần, dễ kiểm thử. */
export function parsePatientForm(
  get: (name: keyof PatientInput) => FormDataEntryValue | null,
  todayKey: string,
): { data: PatientInput; errors: PatientFieldErrors } {
  const errors: PatientFieldErrors = {};
  const sexRaw = clean(get("sex"));
  const data: PatientInput = {
    fullName: clean(get("fullName")) ?? "",
    dateOfBirth: clean(get("dateOfBirth")),
    sex: sexRaw === "nam" || sexRaw === "nu" || sexRaw === "khac" ? sexRaw : null,
    phone: clean(get("phone")),
    address: clean(get("address")),
    idNumber: clean(get("idNumber")),
    insuranceNo: clean(get("insuranceNo"))?.toUpperCase() ?? null,
    guardianName: clean(get("guardianName")),
    allergyNote: typeof get("allergyNote") === "string" ? (get("allergyNote") as string).trim() || null : null,
  };

  if (data.fullName.length < 2) errors.fullName = "Nhập họ tên (ít nhất 2 ký tự).";
  else if (data.fullName.length > 100) errors.fullName = "Họ tên tối đa 100 ký tự.";

  if (data.dateOfBirth) {
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(data.dateOfBirth) && !Number.isNaN(Date.parse(`${data.dateOfBirth}T00:00:00Z`));
    if (!valid) errors.dateOfBirth = "Ngày sinh không hợp lệ.";
    else if (data.dateOfBirth > todayKey) errors.dateOfBirth = "Ngày sinh không được ở tương lai.";
    else if (data.dateOfBirth < "1900-01-01") errors.dateOfBirth = "Ngày sinh không hợp lệ.";
  }
  if (sexRaw && !data.sex) errors.sex = "Giới tính không hợp lệ.";

  if (data.phone) {
    const d = digitsOnly(data.phone);
    // Số Việt Nam: 10 số bắt đầu bằng 0 (vd. 0912345678), hoặc dạng +84 / 84 + 9 số.
    const normalized = d.startsWith("84") && d.length === 11 ? `0${d.slice(2)}` : d;
    if (!/^0\d{9}$/.test(normalized)) errors.phone = "Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.";
    else data.phone = normalized;
  }
  if (data.idNumber) {
    if (!/^\d{12}$/.test(data.idNumber)) errors.idNumber = "Số CCCD/định danh cá nhân gồm 12 chữ số.";
  }
  if (data.insuranceNo) {
    if (!/^[A-Z0-9]{10,15}$/.test(data.insuranceNo)) errors.insuranceNo = "Mã thẻ BHYT gồm 10–15 chữ cái/chữ số, không dấu cách.";
  }
  if (data.address && data.address.length > 300) errors.address = "Địa chỉ tối đa 300 ký tự.";
  if (data.guardianName && data.guardianName.length > 100) errors.guardianName = "Tối đa 100 ký tự.";
  if (data.allergyNote && data.allergyNote.length > 1000) errors.allergyNote = "Tối đa 1000 ký tự.";

  return { data, errors };
}

export interface Age {
  years: number;
  /** Tổng số tháng tuổi – trẻ nhỏ thường cần ghi tuổi theo tháng. */
  months: number;
}

/** Tuổi tính theo ngày lịch (không lệch múi giờ vì làm việc trên chuỗi "YYYY-MM-DD"). */
export function ageOn(dobKey: string, todayKey: string): Age {
  const [by, bm, bd] = dobKey.split("-").map(Number);
  const [ty, tm, td] = todayKey.split("-").map(Number);
  let months = (ty - by) * 12 + (tm - bm);
  if (td < bd) months -= 1;
  months = Math.max(0, months);
  return { years: Math.floor(months / 12), months };
}

/** Hiển thị tuổi: dưới 72 tháng ghi theo tháng, từ đó trở lên ghi theo năm. */
export function formatAge(age: Age): string {
  return age.months < 72 ? `${age.months} tháng tuổi` : `${age.years} tuổi`;
}
