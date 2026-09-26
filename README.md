# Website nội bộ phòng khám

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Prisma 7 + PostgreSQL 17. Quy tắc dự án xem trong `CLAUDE.md`.

## Chạy thử

Yêu cầu: Node.js LTS và PostgreSQL đang chạy (máy phát triển đã có dịch vụ `postgresql-x64-17`).

```bash
npm install
npm run dev
```

Mở http://localhost:3000.

## Database

Thông tin kết nối nằm trong file `.env` (không commit). Máy mới thì sao chép `.env.example` thành `.env` và điền mật khẩu.

| Lệnh | Việc |
|---|---|
| `npm run db:migrate` | Áp dụng thay đổi trong `prisma/schema.prisma` và tạo migration mới |
| `npm run db:seed` | Xoá dữ liệu mẫu cũ và nạp lại (từ chối chạy nếu DB có bệnh nhân thật) |
| `npm run db:studio` | Mở giao diện xem/sửa dữ liệu trên trình duyệt |
| `npm run db:deploy` | Áp dụng migration trên máy chủ thật (không tạo migration mới) |

Ứng dụng kết nối bằng tài khoản `phongkham_app` (chủ database `phongkham`), không dùng tài khoản quản trị `postgres`.

## Sửa nhanh

| Muốn đổi | Sửa file |
|---|---|
| Tên phòng khám, múi giờ | `src/lib/clinic-config.ts` |
| Màu sắc, font | `src/app/globals.css` (khối `@theme`) |
| Mục menu | `src/lib/navigation.ts` |
| Bảng dữ liệu | `prisma/schema.prisma`, rồi chạy `npm run db:migrate` |
| Dữ liệu mẫu | `prisma/seed.ts`, rồi chạy `npm run db:seed` |

Toàn bộ dữ liệu hiện tại là **dữ liệu mẫu** (cột `isSample = true`), không phải thông tin người thật.
