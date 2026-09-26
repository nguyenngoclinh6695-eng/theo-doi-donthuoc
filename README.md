# Website nội bộ phòng khám

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Prisma 7 + PostgreSQL 17. Quy tắc dự án xem trong `CLAUDE.md`.

## Chạy thử

Yêu cầu: Node.js LTS và PostgreSQL đang chạy (máy phát triển đã có dịch vụ `postgresql-x64-17`).

```bash
npm install
npm run dev
```

Mở http://localhost:3000.

## Triển khai cho phòng khám

Máy chủ đặt tại phòng khám, nhân viên truy cập bằng đường link qua VPN Tailscale: xem **[docs/TRIEN-KHAI.md](docs/TRIEN-KHAI.md)**.

| Lệnh | Việc |
|---|---|
| `npm run accounts:create` | Tạo/cập nhật tài khoản thật từ file tạm `accounts.local.json` (xoá file sau khi chạy) |
| `npm run db:clear-sample -- --xac-nhan` | Xoá toàn bộ dữ liệu mẫu trước khi dùng thật |
| `scripts\deploy.ps1` | Sao lưu + cài đặt/cập nhật + build trên máy chủ |
| `scripts\backup-db.ps1` | Sao lưu database ra `backups\` |

## Database

Thông tin kết nối nằm trong file `.env` (không commit). Máy mới thì sao chép `.env.example` thành `.env` và điền mật khẩu.

| Lệnh | Việc |
|---|---|
| `npm run db:migrate` | Áp dụng thay đổi trong `prisma/schema.prisma` và tạo migration mới |
| `npm run db:seed` | Xoá dữ liệu mẫu cũ và nạp lại (từ chối chạy nếu DB có bệnh nhân thật; không đụng tài khoản thật). Chỉ dùng trên máy phát triển |
| `npm run db:studio` | Mở giao diện xem/sửa dữ liệu trên trình duyệt |
| `npm run db:deploy` | Áp dụng migration trên máy chủ thật (không tạo migration mới) |

Ứng dụng kết nối bằng tài khoản `phongkham_app` (chủ database `phongkham`), không dùng tài khoản quản trị `postgres`.

## Đăng nhập và phân quyền

- Vai trò: Bác sĩ, Điều dưỡng, Tiếp đón, Dược sĩ, Kỹ thuật viên, Quản trị (toàn quyền).
- Tài khoản mẫu (sau `npm run db:seed`): `bs.mau1`, `bs.mau2` (bác sĩ), `dieuduong.mau`, `tiepdon.mau`, `quantri.mau`.
  Mật khẩu chung là giá trị `SEED_USER_PASSWORD` trong file `.env`.
- Quyền của từng vai trò nằm trong một file duy nhất: `src/domain/permissions.ts`.
- Quản trị tạo tài khoản ở trang **Người dùng**; hệ thống sinh mật khẩu tạm và bắt đổi ở lần đăng nhập đầu.
- Tự đăng xuất sau 60 phút không thao tác, tối đa 12 giờ/phiên; nhập sai 5 lần thì khoá 15 phút
  (chỉnh trong `src/lib/auth/session.ts` và `src/app/actions/auth.ts`).
- Chạy production cần HTTPS (cookie đăng nhập có cờ Secure).

## Thư viện chuẩn, khám bệnh, kê đơn

- **Không có ngưỡng lâm sàng nào trong code hay dữ liệu mẫu.** Ngưỡng nhập ở Thư viện chuẩn, kèm văn bản nguồn + phiên bản,
  và chỉ có hiệu lực khi một bác sĩ **khác người soạn** duyệt. Thiếu căn cứ → “Chưa có căn cứ trong phác đồ để phân loại”.
- Chỉ số ghi trong lượt khám lưu kèm bộ ngưỡng đã dùng lúc ghi (ngưỡng đổi sau này không làm đổi kết quả cũ).
- Chốt đơn chỉ kiểm tra đủ thông tin hành chính (`src/domain/prescription.ts` – cần đối chiếu với Phụ lục I TT 26/2025/TT-BYT);
  không kiểm tra lâm sàng, không gợi ý thuốc. Thuốc kiểm soát đặc biệt bị chặn (chưa hỗ trợ mẫu đơn riêng).
- **In đơn thuốc**: nút “In đơn (A5)” / “Khổ A4” ở đơn đã chốt → PDF sinh từ `templates/don-thuoc-tt26.html` (Phụ lục I TT 26/2025, đơn “C”)
  bằng Microsoft Edge có sẵn (thư viện `playwright-core`). Dữ liệu in lấy từ ảnh chụp lúc chốt đơn. Cần khai báo `CLINIC_NAME/ADDRESS/PHONE` trong `.env`.
- **Bản scan đơn đã ký**: tải lên ở Tổng quan / màn hình khám (PDF, JPG, PNG ≤ 10 MB, kiểm tra theo nội dung file). Lưu ở `storage/`
  (không lên Git, sao lưu cùng database bằng `scripts\backup-db.ps1`); chỉ xem được qua đường dẫn có kiểm tra quyền.
- **Tiếp đón & lịch hẹn**: xem lịch theo ngày, đặt/đổi giờ/huỷ, đánh dấu đã đến/vắng; mục “Cần đặt lịch tái khám theo đơn”
  lấy từ ngày hẹn trên đơn đã chốt (hệ thống không tự đoán giờ hẹn).
- Kiểm thử logic nghiệp vụ: `npm test`.

## Sửa nhanh

| Muốn đổi | Sửa file |
|---|---|
| Tên phòng khám, múi giờ | `src/lib/clinic-config.ts` |
| Màu sắc, font | `src/app/globals.css` (khối `@theme`) |
| Mục menu | `src/lib/navigation.ts` |
| Bảng dữ liệu | `prisma/schema.prisma`, rồi chạy `npm run db:migrate` |
| Dữ liệu mẫu | `prisma/seed.ts`, rồi chạy `npm run db:seed` |
| Quyền theo vai trò | `src/domain/permissions.ts` |
| Trường bắt buộc khi chốt đơn | `src/domain/prescription.ts` |

Toàn bộ dữ liệu hiện tại là **dữ liệu mẫu** (cột `isSample = true`), không phải thông tin người thật.
