// Nghiệp vụ lịch hẹn (thuần): kiểm tra dữ liệu đặt lịch và quy tắc chuyển trạng thái.

export type ApptStatus = "SCHEDULED" | "ARRIVED" | "NO_SHOW" | "CANCELLED";

export interface AppointmentInput {
  patientId: string;
  /** "YYYY-MM-DD" theo giờ phòng khám */
  dateKey: string;
  /** "HH:mm" */
  time: string;
  reason: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseAppointmentForm(
  get: (name: string) => FormDataEntryValue | null,
  todayKey: string,
  options: { requirePatient: boolean } = { requirePatient: true },
): { data: AppointmentInput; errors: string[] } {
  const str = (n: string) => {
    const v = get(n);
    return typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
  };
  const data: AppointmentInput = { patientId: str("patientId"), dateKey: str("date"), time: str("time"), reason: str("reason").slice(0, 300) };
  const errors: string[] = [];
  if (options.requirePatient && !UUID_RE.test(data.patientId)) errors.push("Chọn bệnh nhân.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.dateKey) || Number.isNaN(Date.parse(`${data.dateKey}T00:00:00Z`))) errors.push("Chọn ngày hẹn.");
  else if (data.dateKey < todayKey) errors.push("Ngày hẹn không được ở quá khứ.");
  const m = /^(\d{2}):(\d{2})$/.exec(data.time);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) errors.push("Chọn giờ hẹn (HH:mm).");
  if (options.requirePatient && data.reason.length < 2) errors.push("Ghi lý do hẹn (vd. Tái khám định kỳ).");
  return { data, errors };
}

/** Các chuyển trạng thái được phép. Đã đến mà đã có lượt khám thì không hoàn tác (tránh lượt khám mồ côi). */
export function canTransition(from: ApptStatus, to: ApptStatus, hasVisit: boolean): boolean {
  if (from === to) return false;
  switch (from) {
    case "SCHEDULED":
      return to === "ARRIVED" || to === "NO_SHOW" || to === "CANCELLED";
    case "NO_SHOW":
      return to === "ARRIVED" || to === "SCHEDULED";
    case "ARRIVED":
      return to === "SCHEDULED" && !hasVisit;
    case "CANCELLED":
      return false;
  }
}

/** Chỉ đổi giờ được khi lịch còn hiệu lực và chưa khám. */
export const canReschedule = (status: ApptStatus, hasVisit: boolean) => (status === "SCHEDULED" || status === "NO_SHOW") && !hasVisit;
