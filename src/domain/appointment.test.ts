import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canReschedule, canTransition, parseAppointmentForm } from "./appointment";

const form = (v: Record<string, string>) => (n: string) => v[n] ?? null;
const PID = "11111111-1111-4111-8111-111111111111";

describe("parseAppointmentForm", () => {
  it("dữ liệu hợp lệ thì không lỗi", () => {
    const r = parseAppointmentForm(form({ patientId: PID, date: "2026-10-01", time: "08:30", reason: "Tái khám" }), "2026-09-26");
    assert.deepEqual(r.errors, []);
  });
  it("ngày quá khứ, giờ sai, thiếu bệnh nhân/lý do → báo lỗi", () => {
    const r = parseAppointmentForm(form({ patientId: "x", date: "2026-09-01", time: "25:00", reason: "" }), "2026-09-26");
    assert.equal(r.errors.length, 4);
  });
  it("hẹn trong hôm nay được phép", () => {
    assert.deepEqual(parseAppointmentForm(form({ patientId: PID, date: "2026-09-26", time: "16:00", reason: "Khám" }), "2026-09-26").errors, []);
  });
});

describe("canTransition / canReschedule", () => {
  it("lịch đang hẹn → đến / vắng / huỷ", () => {
    assert.ok(canTransition("SCHEDULED", "ARRIVED", false));
    assert.ok(canTransition("SCHEDULED", "CANCELLED", false));
  });
  it("đã huỷ thì không đổi nữa; đã khám thì không hoàn tác 'đã đến'", () => {
    assert.equal(canTransition("CANCELLED", "SCHEDULED", false), false);
    assert.equal(canTransition("ARRIVED", "SCHEDULED", true), false);
    assert.equal(canTransition("ARRIVED", "SCHEDULED", false), true);
  });
  it("chỉ đổi giờ khi còn hiệu lực và chưa khám", () => {
    assert.ok(canReschedule("SCHEDULED", false));
    assert.equal(canReschedule("ARRIVED", false), false);
    assert.equal(canReschedule("SCHEDULED", true), false);
  });
});
