// Kiểm thử kiểm tra đơn thuốc trước khi chốt (chỉ tính đầy đủ hành chính). Dữ liệu dưới đây là giả.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkPrescription, printedQuantity, usageText, type PrescriptionCheckInput, type PrescriptionLine } from "./prescription";

const line = (over: Partial<PrescriptionLine> = {}): PrescriptionLine => ({
  drugId: "d1",
  drugName: "Thuốc giả A",
  drugActive: true,
  drugControl: "thuong",
  quantity: 10,
  route: "Uống",
  dosePerTime: "1 viên",
  timesPerDay: 2,
  timing: "sau ăn",
  durationDays: 5,
  ...over,
});

const base = (over: Partial<PrescriptionCheckInput> = {}): PrescriptionCheckInput => ({
  patient: {
    fullName: "Bệnh nhân giả",
    dateOfBirth: "1980-01-01",
    sex: "nam",
    address: "Địa chỉ giả",
    idNumber: "000000000000",
    insuranceNo: null,
    guardianName: null,
  },
  diagnosisText: "Chẩn đoán do bác sĩ ghi",
  lines: [line()],
  weightKg: null,
  todayKey: "2026-09-26",
  followUpDate: null,
  ...over,
});

describe("checkPrescription", () => {
  it("đơn đủ thông tin thì không có lỗi", () => {
    assert.deepEqual(checkPrescription(base()).errors, []);
  });

  it("thiếu chẩn đoán, thiếu thuốc → chặn", () => {
    const r = checkPrescription(base({ diagnosisText: " ", lines: [] }));
    assert.ok(r.errors.some((e) => e.includes("chẩn đoán")));
    assert.ok(r.errors.some((e) => e.includes("chưa có thuốc")));
  });

  it("thiếu ngày sinh / giới / địa chỉ → chặn", () => {
    const r = checkPrescription(base({ patient: { ...base().patient, dateOfBirth: null, sex: null, address: null } }));
    assert.equal(r.errors.length, 3);
  });

  it("trẻ dưới 72 tháng: cần người đưa trẻ và cân nặng; đủ thì qua", () => {
    const child = { ...base().patient, dateOfBirth: "2024-01-01" };
    const r = checkPrescription(base({ patient: child }));
    assert.ok(r.errors.some((e) => e.includes("người đưa trẻ")));
    assert.ok(r.errors.some((e) => e.includes("Cân nặng")));
    assert.deepEqual(checkPrescription(base({ patient: { ...child, guardianName: "Người giám hộ giả" }, weightKg: 12.5 })).errors, []);
  });

  it("thiếu phần nào của cách dùng thì nêu đúng phần đó", () => {
    const r = checkPrescription(base({ lines: [line({ route: "", timesPerDay: null, durationDays: null })] }));
    assert.ok(r.errors.some((e) => e.includes("đường dùng") && e.includes("số lần/ngày") && e.includes("số ngày dùng")));
  });

  it("thuốc kiểm soát đặc biệt → chặn (fail-closed)", () => {
    const r = checkPrescription(base({ lines: [line({ drugControl: "huong_than" })] }));
    assert.ok(r.errors.some((e) => e.includes("kiểm soát đặc biệt")));
  });

  it("thuốc ngừng dùng, trùng thuốc, số lượng sai, thiếu cách dùng → chặn", () => {
    const r = checkPrescription(
      base({ lines: [line({ drugActive: false }), line({ quantity: 0, timing: "" }), line({ drugId: "d2", quantity: 1.5 })] }),
    );
    assert.ok(r.errors.some((e) => e.includes("ngừng dùng")));
    assert.ok(r.errors.some((e) => e.includes("trùng")));
    assert.ok(r.errors.some((e) => e.includes("Dòng 2") && e.includes("số lượng")));
    assert.ok(r.errors.some((e) => e.includes("thời điểm dùng")));
    assert.ok(r.errors.some((e) => e.includes("Dòng 3") && e.includes("số lượng")));
  });

  it("ngày hẹn tái khám không được ở quá khứ hay hôm nay", () => {
    assert.ok(checkPrescription(base({ followUpDate: "2026-09-26" })).errors.length > 0);
    assert.deepEqual(checkPrescription(base({ followUpDate: "2026-10-10" })).errors, []);
  });

  it("thiếu CCCD chỉ là lưu ý, không chặn", () => {
    const r = checkPrescription(base({ patient: { ...base().patient, idNumber: null } }));
    assert.deepEqual(r.errors, []);
    assert.equal(r.warnings.length, 1);
  });
});

describe("usageText / printedQuantity", () => {
  it("ghép cách dùng đủ 5 phần, thêm ghi chú nếu có", () => {
    const u = { route: "Uống", dosePerTime: "1 viên", timesPerDay: 2, timing: "sau ăn", durationDays: 5 };
    assert.equal(usageText(u), "Uống: mỗi lần 1 viên, ngày 2 lần, sau ăn. Dùng 5 ngày.");
    assert.equal(usageText({ ...u, note: "Uống nhiều nước." }), "Uống: mỗi lần 1 viên, ngày 2 lần, sau ăn. Dùng 5 ngày. Uống nhiều nước.");
  });
  it("số lượng dưới 10 có số 0 phía trước", () => {
    assert.equal(printedQuantity(5), "05");
    assert.equal(printedQuantity(10), "10");
  });
});
