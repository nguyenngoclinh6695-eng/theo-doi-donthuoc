// Tính mốc thời gian theo giờ phòng khám (không theo múi giờ của máy chủ),
// vì "hôm nay", "tuần này", "tháng này" phải khớp với lịch làm việc thực tế ở Việt Nam.

import { clinicConfig } from "@/lib/clinic-config";

const tz = clinicConfig.timeZone;

/** Ngày theo lịch của phòng khám, dạng "YYYY-MM-DD". */
export function clinicDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Độ lệch múi giờ tại thời điểm cho trước, dạng "+07:00". */
function offsetAt(date: Date): string {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;
  const offset = name?.replace("GMT", "");
  return offset ? offset : "+00:00";
}

/** Thời điểm 00:00 của ngày "YYYY-MM-DD" theo giờ phòng khám. */
export function startOfClinicDay(dateKey: string): Date {
  const noon = new Date(`${dateKey}T12:00:00Z`);
  return new Date(`${dateKey}T00:00:00${offsetAt(noon)}`);
}

export function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Số ngày lịch giữa hai ngày "YYYY-MM-DD" (to - from). */
export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86_400_000);
}

export interface ClinicPeriods {
  todayKey: string;
  todayStart: Date;
  tomorrowStart: Date;
  weekStart: Date;
  monthKey: string;
  monthStart: Date;
}

export function clinicPeriods(now: Date = new Date()): ClinicPeriods {
  const todayKey = clinicDateKey(now);
  // getUTCDay trên mốc 12:00Z của ngày đó cho đúng thứ trong tuần; tuần bắt đầu từ thứ Hai.
  const weekday = new Date(`${todayKey}T12:00:00Z`).getUTCDay();
  const mondayKey = addDays(todayKey, -((weekday + 6) % 7));
  const monthKey = todayKey.slice(0, 7);
  return {
    todayKey,
    todayStart: startOfClinicDay(todayKey),
    tomorrowStart: startOfClinicDay(addDays(todayKey, 1)),
    weekStart: startOfClinicDay(mondayKey),
    monthKey,
    monthStart: startOfClinicDay(`${monthKey}-01`),
  };
}

/** Giờ:phút theo giờ phòng khám. */
export function clinicTime(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}
