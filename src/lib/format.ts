import { clinicConfig } from "@/lib/clinic-config";
import type { UserRole } from "@/domain/types";

/** Che phần giữa số điện thoại, chỉ giữ 4 số đầu và 3 số cuối – đủ để nhận ra khi gọi, hạn chế lộ thông tin trên màn hình. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return "•••";
  return `${digits.slice(0, 4)} ••• ${digits.slice(-3)}`;
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: clinicConfig.timeZone,
  }).format(date);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: clinicConfig.timeZone,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    timeZone: clinicConfig.timeZone,
  }).format(new Date(iso));
}

export const roleLabels: Record<UserRole, string> = {
  bac_si: "Bác sĩ",
  dieu_duong: "Điều dưỡng",
  tiep_don: "Tiếp đón",
  quan_tri: "Quản trị",
};

/** Ngày giờ đầy đủ có năm ("26/09/2026 08:30") – dùng cho lịch sử có thể trải qua nhiều năm. */
export function formatDateTimeFull(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: clinicConfig.timeZone }).format(d);
  const time = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: clinicConfig.timeZone }).format(d);
  return `${date} ${time}`;
}
