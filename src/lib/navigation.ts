import type { IconName } from "@/components/icons";
import type { Permission } from "@/domain/permissions";

export interface NavItem {
  /** Đường dẫn con; chuỗi rỗng là trang Tổng quan. */
  slug: string;
  label: string;
  icon: IconName;
  /** Quyền cần có để thấy mục trên menu và mở trang. */
  permission: Permission;
  /** true = chưa làm, dùng trang "Đang xây dựng" chung. */
  placeholder: boolean;
  /** Mô tả ngắn hiển thị ở trang "Đang xây dựng". */
  description: string;
}

/** Phần dữ liệu menu gửi xuống trình duyệt (không kèm quyền). */
export type NavLink = Pick<NavItem, "slug" | "label" | "icon">;

export const navItems: NavItem[] = [
  { slug: "", label: "Tổng quan", icon: "home", permission: "dashboard.view", placeholder: false, description: "Việc cần làm trong ngày." },
  { slug: "tiep-don", label: "Tiếp đón & lịch hẹn", icon: "calendar", permission: "appointments.view", placeholder: true, description: "Tiếp nhận bệnh nhân, đặt và quản lý lịch hẹn tái khám." },
  { slug: "benh-nhan", label: "Bệnh nhân", icon: "users", permission: "patients.view", placeholder: false, description: "Hồ sơ bệnh nhân, lịch sử khám và theo dõi chỉ số." },
  { slug: "kham-benh", label: "Khám bệnh", icon: "stethoscope", permission: "visits.view", placeholder: true, description: "Ghi nhận lượt khám và chỉ số đo được." },
  { slug: "don-thuoc", label: "Đơn thuốc", icon: "prescription", permission: "prescriptions.view", placeholder: true, description: "Kê đơn theo mẫu Phụ lục I Thông tư 26/2025/TT-BYT, chốt đơn, in và lưu bản scan có chữ ký." },
  { slug: "thu-vien-chuan", label: "Thư viện chuẩn", icon: "book", permission: "standards.view", placeholder: false, description: "Ngưỡng và quy tắc lấy từ văn bản chuyên môn, có nguồn và phiên bản." },
  { slug: "danh-muc-thuoc", label: "Danh mục thuốc", icon: "pill", permission: "drugs.view", placeholder: false, description: "Danh mục thuốc dùng tại phòng khám." },
  { slug: "nguoi-dung", label: "Người dùng", icon: "shield", permission: "users.manage", placeholder: false, description: "Tài khoản nhân viên và vai trò." },
  { slug: "nhat-ky", label: "Nhật ký", icon: "log", permission: "audit.view", placeholder: false, description: "Nhật ký thao tác (audit) của người dùng." },
];

export function hrefOf(item: Pick<NavItem, "slug">): string {
  return item.slug ? `/${item.slug}` : "/";
}
