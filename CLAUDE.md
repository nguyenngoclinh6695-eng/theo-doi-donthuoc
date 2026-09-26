# Dự án: Website nội bộ phòng khám

## Mục đích
Website nội bộ (chỉ nhân viên truy cập qua LAN/VPN) để quản lý hồ sơ bệnh nhân, lịch sử khám,
lịch hẹn, theo dõi chỉ số sức khỏe, kê đơn theo mẫu Phụ lục I Thông tư 26/2025/TT-BYT
(in PDF, bác sĩ ký tay; không ký số, không liên thông).

## Ranh giới bắt buộc
- KHÔNG gợi ý chọn thuốc, KHÔNG chẩn đoán, KHÔNG dùng AI sinh nhận định lâm sàng.
- KHÔNG tự đưa ra bất kỳ ngưỡng lâm sàng nào (huyết áp, đường huyết...) trong code.
  Mọi ngưỡng đọc từ "Thư viện chuẩn" trong database, có nguồn văn bản và phiên bản.
  Khi thiếu ngưỡng: hiển thị "Chưa có căn cứ trong phác đồ để phân loại" (fail-closed).
- Dữ liệu mẫu phải là dữ liệu giả, ghi rõ là dữ liệu mẫu. Không dùng tên/số thật.
- Không gửi dữ liệu bệnh nhân tới bất kỳ dịch vụ bên ngoài nào.

## Công nghệ
- Next.js (App Router) + TypeScript (strict), Tailwind CSS.
- Sau này: Prisma + PostgreSQL, Auth với phân quyền theo vai trò, Playwright để sinh PDF.
- Chỉ cài thêm thư viện khi thật cần, và giải thích lý do trước khi cài.

## Kiến trúc thư mục
- src/app/           : trang và route API
- src/components/    : component giao diện dùng lại
- src/domain/        : logic nghiệp vụ thuần (engine luật, kiểm tra đơn), không import React/Next
- src/lib/           : tiện ích, truy cập dữ liệu
- src/mocks/         : dữ liệu mẫu (sẽ thay bằng database)

## Thiết kế
- Bảng màu "biển lặng":
  nền #F4F8FA, bề mặt #FFFFFF, chủ đạo #1B7FB0, chủ đạo đậm #0B4F71, nhấn phụ #E4F2F8,
  chữ chính #1E2A32, chữ phụ #5B6B75, đạt #3E8E6A, chú ý #C98A2B, cảnh báo #C0504D.
  Khai báo thành design token trong cấu hình Tailwind/CSS variables, không viết mã màu rải rác.
- Font giao diện: Be Vietnam Pro. Trang in đơn thuốc: Times New Roman, chữ đen.
- Dịu mắt: nhiều khoảng trắng, bo góc nhẹ, bóng đổ rất nhẹ hoặc không có, không gradient loè loẹt.
- Tương phản chữ đạt WCAG AA, có focus rõ khi dùng bàn phím, không truyền đạt thông tin chỉ bằng màu.
- Ưu tiên màn hình máy tính và tablet; vẫn dùng được trên điện thoại.
- Toàn bộ giao diện bằng tiếng Việt, nút ghi rõ hành động ("Chốt đơn", "In đơn").

## Quy tắc làm việc
- Luôn trình bày kế hoạch ngắn trước khi sửa nhiều file.
- Code sạch, chia component nhỏ, comment giải thích "tại sao" bằng tiếng Việt.
- Sau mỗi phần việc: chạy `npm run lint` và `npm run build`, sửa hết lỗi rồi mới báo xong.
- Commit Git sau mỗi bước hoàn chỉnh, message tiếng Việt ngắn gọn.
