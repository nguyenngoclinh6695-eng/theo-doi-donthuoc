// Kiểm thử bộ phân loại. Các con số dưới đây là GIÁ TRỊ GIẢ chỉ để thử logic, không phải ngưỡng lâm sàng.
// Chạy: npm test

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bandsOverlap, classify, NO_BASIS_MESSAGE, scopesIntersect, validateBands, type Band, type StandardSetInput } from "./standards";

const band = (label: string, lower: number | null, upper: number | null, tone: Band["tone"] = "normal"): Band => ({
  label,
  lower,
  lowerInclusive: true,
  upper,
  upperInclusive: false,
  tone,
});

const set = (over: Partial<StandardSetInput> = {}): StandardSetInput => ({
  id: "s1",
  version: "v-thu",
  sourceTitle: "Văn bản giả để kiểm thử",
  sourceSection: null,
  effectiveFrom: "2020-01-01",
  sexScope: null,
  ageMinYears: null,
  ageMaxYears: null,
  bands: [band("Khoảng A", null, 10), band("Khoảng B", 10, 20, "attention"), band("Khoảng C", 20, null, "alert")],
  ...over,
});

const ctx = { dateKey: "2026-09-26", ageYears: 40, sex: "nam" as const };

describe("classify", () => {
  it("không có bộ ngưỡng → fail-closed với đúng câu thông báo", () => {
    const r = classify(5, [], ctx);
    assert.equal(r.kind, "unclassified");
    assert.ok(r.kind === "unclassified" && r.message.startsWith(NO_BASIS_MESSAGE));
  });

  it("phân loại đúng khoảng, cận dưới gồm – cận trên không gồm", () => {
    const r1 = classify(10, [set()], ctx);
    assert.ok(r1.kind === "classified" && r1.label === "Khoảng B" && r1.tone === "attention");
    const r2 = classify(9.999, [set()], ctx);
    assert.ok(r2.kind === "classified" && r2.label === "Khoảng A");
    const r3 = classify(20, [set()], ctx);
    assert.ok(r3.kind === "classified" && r3.label === "Khoảng C");
  });

  it("trả kèm nguồn và phiên bản đã dùng", () => {
    const r = classify(5, [set({ sourceSection: "Bảng 1" })], ctx);
    assert.ok(r.kind === "classified" && r.sourceTitle === "Văn bản giả để kiểm thử" && r.version === "v-thu" && r.sourceSection === "Bảng 1");
  });

  it("giá trị ngoài mọi khoảng → không phân loại", () => {
    const s = set({ bands: [band("Chỉ một khoảng", 0, 10)] });
    assert.equal(classify(15, [s], ctx).kind, "unclassified");
    assert.equal(classify(-1, [s], ctx).kind, "unclassified");
  });

  it("khoảng chồng nhau (dữ liệu lỗi) → không phân loại", () => {
    const s = set({ bands: [band("X", 0, 10), band("Y", 5, 15)] });
    const r = classify(7, [s], ctx);
    assert.ok(r.kind === "unclassified" && r.reason === "overlapping_bands");
  });

  it("hai bộ cùng áp dụng → không phân loại", () => {
    const r = classify(5, [set({ id: "a" }), set({ id: "b" })], ctx);
    assert.ok(r.kind === "unclassified" && r.reason === "multiple_sets");
  });

  it("bộ chưa đến ngày hiệu lực thì không dùng", () => {
    const r = classify(5, [set({ effectiveFrom: "2027-01-01" })], ctx);
    assert.ok(r.kind === "unclassified" && r.reason === "no_matching_set");
  });

  it("chọn đúng bộ theo tuổi; tuổi = ageMax thì thuộc bộ sau", () => {
    const young = set({ id: "tre", ageMinYears: 0, ageMaxYears: 18, bands: [band("Trẻ", 0, null)] });
    const adult = set({ id: "lon", ageMinYears: 18, ageMaxYears: null, bands: [band("Lớn", 0, null)] });
    const r1 = classify(5, [young, adult], { ...ctx, ageYears: 17 });
    assert.ok(r1.kind === "classified" && r1.setId === "tre");
    const r2 = classify(5, [young, adult], { ...ctx, ageYears: 18 });
    assert.ok(r2.kind === "classified" && r2.setId === "lon");
  });

  it("bộ có điều kiện tuổi mà hồ sơ thiếu ngày sinh → không đoán", () => {
    const r = classify(5, [set({ ageMinYears: 18 })], { ...ctx, ageYears: null });
    assert.ok(r.kind === "unclassified" && r.reason === "patient_info_missing");
  });

  it("bộ theo giới: đúng giới thì dùng, khác giới thì không", () => {
    const s = set({ sexScope: "nu" });
    assert.equal(classify(5, [s], { ...ctx, sex: "nu" }).kind, "classified");
    const r = classify(5, [s], { ...ctx, sex: "nam" });
    assert.ok(r.kind === "unclassified" && r.reason === "no_matching_set");
  });

  it("giá trị không phải số → không phân loại", () => {
    assert.equal(classify(Number.NaN, [set()], ctx).kind, "unclassified");
  });
});

describe("validateBands", () => {
  it("chấp nhận các khoảng nối tiếp nhau", () => {
    assert.deepEqual(validateBands(set().bands), []);
  });

  it("báo lỗi khi chồng nhau, thiếu nhãn, cận ngược", () => {
    assert.ok(validateBands([band("X", 0, 10), band("Y", 9, 20)]).some((e) => e.includes("chồng")));
    assert.ok(validateBands([band("", 0, 10)]).some((e) => e.includes("nhãn")));
    assert.ok(validateBands([band("X", 10, 5)]).length > 0);
    assert.ok(validateBands([]).length > 0);
  });

  it("hai khoảng chạm nhau tại một điểm: chỉ chồng khi cả hai cùng gồm điểm đó", () => {
    const a: Band = { ...band("A", 0, 10), upperInclusive: true };
    const b: Band = { ...band("B", 10, 20), lowerInclusive: true };
    assert.equal(bandsOverlap(a, b), true);
    assert.equal(bandsOverlap({ ...a, upperInclusive: false }, b), false);
  });
});

describe("scopesIntersect", () => {
  const all = { sexScope: null, ageMinYears: null, ageMaxYears: null };
  it("không giới hạn thì trùng với mọi phạm vi", () => {
    assert.equal(scopesIntersect(all, { sexScope: "nu", ageMinYears: 18, ageMaxYears: null }), true);
  });
  it("hai nhóm tuổi nối tiếp không trùng; khác giới không trùng", () => {
    assert.equal(scopesIntersect({ ...all, ageMaxYears: 18 }, { ...all, ageMinYears: 18 }), false);
    assert.equal(scopesIntersect({ ...all, sexScope: "nam" }, { ...all, sexScope: "nu" }), false);
    assert.equal(scopesIntersect({ ...all, ageMaxYears: 19 }, { ...all, ageMinYears: 18 }), true);
  });
});
