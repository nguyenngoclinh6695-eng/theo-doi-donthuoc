// Kiểm thử kiểm tra đơn thuốc trước khi chốt (chỉ tính đầy đủ hành chính). Dữ liệu dưới đây là giả.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkPrescription, type PrescriptionCheckInput, type PrescriptionLine } from "./prescription";

const line = (over: Partial<PrescriptionLine> = {}): PrescriptionLine => ({
  drugId: "d1",
  drugName: "Thuốc giả A",
  drugActive: true,
  drugControl: "thuong",
  quantity: 10,
  dosageInstruction: "Theo chỉ dẫn của bác sĩ",
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

  it("trẻ dưới 72 tháng mà chưa có người giám hộ → chặn; có rồi thì qua", () => {
    const child = { ...base().patient, dateOfBirth: "2024-01-01" };
    assert.ok(checkPrescription(base({ patient: child })).errors.some((e) => e.includes("giám hộ")));
    assert.deepEqual(checkPrescription(base({ patient: { ...child, guardianName: "Người giám hộ giả" } })).errors, []);
  });

  it("thuốc kiểm soát đặc biệt → chặn (fail-closed)", () => {
    const r = checkPrescription(base({ lines: [line({ drugControl: "huong_than" })] }));
    assert.ok(r.errors.some((e) => e.includes("kiểm soát đặc biệt")));
  });

  it("thuốc ngừng dùng, trùng thuốc, số lượng sai, thiếu cách dùng → chặn", () => {
    const r = checkPrescription(
      base({ lines: [line({ drugActive: false }), line({ quantity: 0, dosageInstruction: "" }), line({ drugId: "d2", quantity: 1.5 })] }),
    );
    assert.ok(r.errors.some((e) => e.includes("ngừng dùng")));
    assert.ok(r.errors.some((e) => e.includes("trùng")));
    assert.ok(r.errors.some((e) => e.includes("Dòng 2") && e.includes("số lượng")));
    assert.ok(r.errors.some((e) => e.includes("cách dùng")));
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
