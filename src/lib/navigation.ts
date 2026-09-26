import type { IconName } from "@/components/icons";

export interface NavItem {
  /** Đường dẫn con; chuỗi rỗng là trang Tổng quan. */
  slug: string;
  label: string;
  icon: IconName;
  /** Mô tả ngắn hiển thị ở trang "Đang xây dựng". */
  description: string;
}

export const navItems: NavItem[] = [
  { slug: "", label: "Tổng quan", icon: "home", description: "Việc cần làm trong ngày." },
  { slug: "tiep-don", label: "Tiếp đón & lịch hẹn", icon: "calendar", description: "Tiếp nhận bệnh nhân, đặt và quản lý lịch hẹn tái khám." },
  { slug: "benh-nhan", label: "Bệnh nhân", icon: "users", description: "Hồ sơ bệnh nhân, lịch sử khám và theo dõi chỉ số." },
  { slug: "kham-benh", label: "Khám bệnh", icon: "stethoscope", description: "Ghi nhận lượt khám và chỉ số đo được." },
  { slug: "don-thuoc", label: "Đơn thuốc", icon: "prescription", description: "Kê đơn theo mẫu Phụ lục I Thông tư 26/2025/TT-BYT, chốt đơn, in và lưu bản scan có chữ ký." },
  { slug: "thu-vien-chuan", label: "Thư viện chuẩn", icon: "book", description: "Ngưỡng và quy tắc lấy từ văn bản chuyên môn, có nguồn và phiên bản." },
  { slug: "danh-muc-thuoc", label: "Danh mục thuốc", icon: "pill", description: "Danh mục thuốc dùng tại phòng khám." },
  { slug: "nhat-ky", label: "Nhật ký", icon: "log", description: "Nhật ký thao tác (audit) của người dùng." },
];

export function hrefOf(item: NavItem): string {
  return item.slug ? `/${item.slug}` : "/";
}
