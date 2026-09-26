// Bộ phân loại chỉ số theo Thư viện chuẩn – logic thuần, không truy cập DB, không chứa bất kỳ ngưỡng nào.
// Mọi ngưỡng đến từ tham số `sets` (đọc từ DB, đã được duyệt, có nguồn văn bản).
//
// Nguyên tắc FAIL-CLOSED: chỉ trả về phân loại khi có đúng MỘT bộ ngưỡng áp dụng và giá trị rơi vào đúng MỘT khoảng.
// Mọi trường hợp khác (thiếu ngưỡng, chồng chéo, ngoài khoảng, thiếu thông tin bệnh nhân) đều trả về "chưa phân loại".

export const NO_BASIS_MESSAGE = "Chưa có căn cứ trong phác đồ để phân loại";

export type Tone = "normal" | "attention" | "alert";
export type SexScope = "nam" | "nu" | "khac";

export interface Band {
  label: string;
  lower: number | null;
  lowerInclusive: boolean;
  upper: number | null;
  upperInclusive: boolean;
  tone: Tone;
}

export interface StandardSetInput {
  id: string;
  version: string;
  sourceTitle: string;
  sourceSection: string | null;
  /** "YYYY-MM-DD" */
  effectiveFrom: string;
  sexScope: SexScope | null;
  ageMinYears: number | null;
  ageMaxYears: number | null;
  bands: Band[];
}

export interface ClassifyContext {
  /** Ngày đo, "YYYY-MM-DD". */
  dateKey: string;
  /** Tuổi (năm) của bệnh nhân lúc đo; null nếu chưa có ngày sinh. */
  ageYears: number | null;
  sex: SexScope | null;
}

export type Classification =
  | { kind: "classified"; label: string; tone: Tone; setId: string; version: string; sourceTitle: string; sourceSection: string | null }
  | { kind: "unclassified"; reason: UnclassifiedReason; message: string };

export type UnclassifiedReason =
  | "no_active_set" // Chưa có bộ ngưỡng nào đang áp dụng cho chỉ số này
  | "patient_info_missing" // Bộ ngưỡng có giới hạn tuổi/giới nhưng hồ sơ thiếu thông tin đó
  | "no_matching_set" // Có bộ ngưỡng nhưng không bộ nào áp dụng cho nhóm bệnh nhân này
  | "multiple_sets" // Nhiều bộ ngưỡng cùng áp dụng – cần rà soát Thư viện chuẩn
  | "out_of_bands" // Giá trị không thuộc khoảng nào đã khai báo
  | "overlapping_bands" // Giá trị thuộc nhiều khoảng (bộ ngưỡng khai báo chồng chéo)
  | "invalid_value";

const detail: Record<UnclassifiedReason, string> = {
  no_active_set: "",
  patient_info_missing: " (hồ sơ thiếu ngày sinh hoặc giới tính để xác định bộ ngưỡng áp dụng)",
  no_matching_set: " (không có bộ ngưỡng áp dụng cho nhóm tuổi/giới của bệnh nhân)",
  multiple_sets: " (có nhiều bộ ngưỡng cùng áp dụng – cần rà soát Thư viện chuẩn)",
  out_of_bands: " (giá trị nằm ngoài các khoảng đã khai báo)",
  overlapping_bands: " (các khoảng trong bộ ngưỡng bị chồng nhau – cần rà soát Thư viện chuẩn)",
  invalid_value: " (giá trị không hợp lệ)",
};

const unclassified = (reason: UnclassifiedReason): Classification => ({
  kind: "unclassified",
  reason,
  message: NO_BASIS_MESSAGE + detail[reason],
});

export function bandContains(band: Band, value: number): boolean {
  if (band.lower !== null && (band.lowerInclusive ? value < band.lower : value <= band.lower)) return false;
  if (band.upper !== null && (band.upperInclusive ? value > band.upper : value >= band.upper)) return false;
  return true;
}

/** Bộ ngưỡng có áp dụng cho bệnh nhân không. "unknown" khi bộ có điều kiện mà hồ sơ thiếu dữ liệu tương ứng. */
function applies(set: StandardSetInput, ctx: ClassifyContext): boolean | "unknown" {
  if (set.effectiveFrom > ctx.dateKey) return false;
  if (set.sexScope !== null) {
    if (ctx.sex === null) return "unknown";
    if (set.sexScope !== ctx.sex) return false;
  }
  if (set.ageMinYears !== null || set.ageMaxYears !== null) {
    if (ctx.ageYears === null) return "unknown";
    if (set.ageMinYears !== null && ctx.ageYears < set.ageMinYears) return false;
    if (set.ageMaxYears !== null && ctx.ageYears >= set.ageMaxYears) return false;
  }
  return true;
}

/** Phân loại một giá trị. `activeSets` chỉ gồm các bộ ở trạng thái ĐANG ÁP DỤNG của đúng loại chỉ số. */
export function classify(value: number, activeSets: StandardSetInput[], ctx: ClassifyContext): Classification {
  if (!Number.isFinite(value)) return unclassified("invalid_value");
  if (activeSets.length === 0) return unclassified("no_active_set");

  const verdicts = activeSets.map((s) => ({ set: s, applies: applies(s, ctx) }));
  const matching = verdicts.filter((v) => v.applies === true).map((v) => v.set);
  const unknown = verdicts.some((v) => v.applies === "unknown");

  // Thiếu thông tin mà có bộ có thể áp dụng: không đoán, dừng lại.
  if (unknown) return unclassified("patient_info_missing");
  if (matching.length === 0) return unclassified("no_matching_set");
  if (matching.length > 1) return unclassified("multiple_sets");

  const set = matching[0];
  const hits = set.bands.filter((b) => bandContains(b, value));
  if (hits.length === 0) return unclassified("out_of_bands");
  if (hits.length > 1) return unclassified("overlapping_bands");

  return {
    kind: "classified",
    label: hits[0].label,
    tone: hits[0].tone,
    setId: set.id,
    version: set.version,
    sourceTitle: set.sourceTitle,
    sourceSection: set.sourceSection,
  };
}

/** Kiểm tra bộ khoảng trước khi lưu: mỗi khoảng hợp lệ và không khoảng nào chồng lên khoảng nào. Trả về danh sách lỗi. */
export function validateBands(bands: Band[]): string[] {
  const errors: string[] = [];
  if (bands.length === 0) errors.push("Cần ít nhất một khoảng giá trị.");

  bands.forEach((b, i) => {
    const n = `Khoảng ${i + 1}`;
    if (!b.label.trim()) errors.push(`${n}: thiếu nhãn (ghi đúng như văn bản nguồn).`);
    if (b.lower === null && b.upper === null) errors.push(`${n}: cần ít nhất một cận (dưới hoặc trên).`);
    if (b.lower !== null && !Number.isFinite(b.lower)) errors.push(`${n}: cận dưới không hợp lệ.`);
    if (b.upper !== null && !Number.isFinite(b.upper)) errors.push(`${n}: cận trên không hợp lệ.`);
    if (b.lower !== null && b.upper !== null) {
      const empty = b.lower > b.upper || (b.lower === b.upper && !(b.lowerInclusive && b.upperInclusive));
      if (empty) errors.push(`${n}: cận dưới phải nhỏ hơn cận trên.`);
    }
  });
  if (errors.length > 0) return errors;

  for (let i = 0; i < bands.length; i++) {
    for (let j = i + 1; j < bands.length; j++) {
      if (bandsOverlap(bands[i], bands[j])) errors.push(`Khoảng ${i + 1} và khoảng ${j + 1} chồng lên nhau.`);
    }
  }
  return errors;
}

/** Hai khoảng có điểm chung không (xét cả cận mở/đóng). */
export function bandsOverlap(a: Band, b: Band): boolean {
  // a nằm hẳn bên dưới b?
  const aBelowB =
    a.upper !== null && b.lower !== null && (a.upper < b.lower || (a.upper === b.lower && !(a.upperInclusive && b.lowerInclusive)));
  const bBelowA =
    b.upper !== null && a.lower !== null && (b.upper < a.lower || (b.upper === a.lower && !(b.upperInclusive && a.lowerInclusive)));
  return !aBelowB && !bBelowA;
}

/** Hiển thị khoảng dạng "≥ 5 và < 7". */
export function describeBand(b: Pick<Band, "lower" | "lowerInclusive" | "upper" | "upperInclusive">, unit: string): string {
  const parts: string[] = [];
  if (b.lower !== null) parts.push(`${b.lowerInclusive ? "≥" : ">"} ${b.lower}`);
  if (b.upper !== null) parts.push(`${b.upperInclusive ? "≤" : "<"} ${b.upper}`);
  return `${parts.join(" và ")} ${unit}`.trim();
}

export interface Scope {
  sexScope: SexScope | null;
  ageMinYears: number | null;
  ageMaxYears: number | null;
}

/** Hai phạm vi áp dụng có trùng nhau không (có bệnh nhân nào thuộc cả hai). null = không giới hạn. */
export function scopesIntersect(a: Scope, b: Scope): boolean {
  const sexOk = a.sexScope === null || b.sexScope === null || a.sexScope === b.sexScope;
  const aMin = a.ageMinYears ?? 0;
  const bMin = b.ageMinYears ?? 0;
  const aMax = a.ageMaxYears ?? Number.POSITIVE_INFINITY;
  const bMax = b.ageMaxYears ?? Number.POSITIVE_INFINITY;
  return sexOk && aMin < bMax && bMin < aMax;
}

export const scopesEqual = (a: Scope, b: Scope) =>
  a.sexScope === b.sexScope && (a.ageMinYears ?? null) === (b.ageMinYears ?? null) && (a.ageMaxYears ?? null) === (b.ageMaxYears ?? null);

export function describeScope(s: Scope): string {
  const sex = s.sexScope === "nam" ? "Nam" : s.sexScope === "nu" ? "Nữ" : s.sexScope === "khac" ? "Giới khác" : "Mọi giới";
  let age = "mọi tuổi";
  if (s.ageMinYears !== null && s.ageMaxYears !== null) age = `từ ${s.ageMinYears} đến dưới ${s.ageMaxYears} tuổi`;
  else if (s.ageMinYears !== null) age = `từ ${s.ageMinYears} tuổi trở lên`;
  else if (s.ageMaxYears !== null) age = `dưới ${s.ageMaxYears} tuổi`;
  return `${sex}, ${age}`;
}

export const toneLabels: Record<Tone, string> = {
  normal: "Đạt",
  attention: "Cần chú ý",
  alert: "Cảnh báo",
};

// ───────────── Đọc form soạn bộ ngưỡng ─────────────

export interface BandDraft {
  label: string;
  lower: string;
  lowerInclusive: boolean;
  upper: string;
  upperInclusive: boolean;
  tone: Tone;
}

export interface SetDraftInput extends Scope {
  measurementTypeId: string;
  sourceId: string;
  version: string;
  sourceSection: string | null;
  effectiveFrom: string;
  note: string | null;
  bands: Band[];
}

/** "12,5" hoặc "12.5" -> 12.5; rỗng -> null; sai -> NaN (để validateBands báo lỗi). */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (t === "") return null;
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : Number.NaN;
}

const MAX_BANDS = 20;

export function parseSetForm(get: (name: string) => FormDataEntryValue | null): { data: SetDraftInput; errors: string[] } {
  const str = (n: string) => {
    const v = get(n);
    return typeof v === "string" ? v.trim() : "";
  };
  const errors: string[] = [];
  const intOrNull = (n: string, label: string) => {
    const t = str(n);
    if (t === "") return null;
    if (!/^\d{1,3}$/.test(t)) {
      errors.push(`${label} phải là số nguyên từ 0 đến 150.`);
      return null;
    }
    return Number(t);
  };

  const sexRaw = str("sexScope");
  let rawBands: BandDraft[] = [];
  try {
    const parsed = JSON.parse(str("bands") || "[]");
    if (Array.isArray(parsed)) rawBands = parsed.slice(0, MAX_BANDS + 1);
  } catch {
    errors.push("Dữ liệu các khoảng không đọc được – tải lại trang và nhập lại.");
  }
  if (rawBands.length > MAX_BANDS) errors.push(`Tối đa ${MAX_BANDS} khoảng.`);

  const bands: Band[] = rawBands.slice(0, MAX_BANDS).map((b) => ({
    label: String(b?.label ?? "").trim().slice(0, 200),
    lower: parseDecimal(String(b?.lower ?? "")),
    lowerInclusive: b?.lowerInclusive === true,
    upper: parseDecimal(String(b?.upper ?? "")),
    upperInclusive: b?.upperInclusive === true,
    tone: b?.tone === "attention" || b?.tone === "alert" ? b.tone : "normal",
  }));

  const data: SetDraftInput = {
    measurementTypeId: str("measurementTypeId"),
    sourceId: str("sourceId"),
    version: str("version").slice(0, 50),
    sourceSection: str("sourceSection").slice(0, 200) || null,
    effectiveFrom: str("effectiveFrom"),
    note: str("note").slice(0, 1000) || null,
    sexScope: sexRaw === "nam" || sexRaw === "nu" || sexRaw === "khac" ? sexRaw : null,
    ageMinYears: intOrNull("ageMinYears", "Tuổi từ"),
    ageMaxYears: intOrNull("ageMaxYears", "Tuổi đến"),
    bands,
  };

  if (!data.measurementTypeId) errors.push("Chọn loại chỉ số.");
  if (!data.sourceId) errors.push("Chọn văn bản nguồn – không có nguồn thì không được lưu ngưỡng.");
  if (!data.version) errors.push("Nhập phiên bản (vd. số hiệu văn bản + năm).");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.effectiveFrom)) errors.push("Nhập ngày bắt đầu áp dụng.");
  if (data.ageMinYears !== null && data.ageMaxYears !== null && data.ageMinYears >= data.ageMaxYears) {
    errors.push("Tuổi từ phải nhỏ hơn tuổi đến.");
  }
  errors.push(...validateBands(bands));
  return { data, errors };
}
