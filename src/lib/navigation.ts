import type { IconName } from "@/components/icons";
import type { Permission } from "@/domain/permissions";

export interface NavItem {
  /** Đường dẫn con; chuỗi rỗng là trang Tổng quan. */
  slug: string;
  label: string;
  icon: IconName;
  /** Quyền cần có để thấy mục trên menu và mở trang. */
  permission: Permission;
}

/** Phần dữ liệu menu gửi xuống trình duyệt (không kèm quyền). */
export type NavLink = Pick<NavItem, "slug" | "label" | "icon">;

export const navItems: NavItem[] = [
  { slug: "", label: "Tổng quan", icon: "home", permission: "dashboard.view" },
  { slug: "tiep-don", label: "Tiếp đón & lịch hẹn", icon: "calendar", permission: "appointments.view" },
  { slug: "benh-nhan", label: "Bệnh nhân", icon: "users", permission: "patients.view" },
  { slug: "kham-benh", label: "Khám bệnh", icon: "stethoscope", permission: "visits.view" },
  { slug: "don-thuoc", label: "Đơn thuốc", icon: "prescription", permission: "prescriptions.view" },
  { slug: "thu-vien-chuan", label: "Thư viện chuẩn", icon: "book", permission: "standards.view" },
  { slug: "danh-muc-thuoc", label: "Danh mục thuốc", icon: "pill", permission: "drugs.view" },
  { slug: "nguoi-dung", label: "Người dùng", icon: "shield", permission: "users.manage" },
  { slug: "nhat-ky", label: "Nhật ký", icon: "log", permission: "audit.view" },
];

export function hrefOf(item: Pick<NavItem, "slug">): string {
  return item.slug ? `/${item.slug}` : "/";
}
