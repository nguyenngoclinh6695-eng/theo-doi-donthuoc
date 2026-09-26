# Website nội bộ phòng khám

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4. Quy tắc dự án xem trong `CLAUDE.md`.

## Chạy thử

```bash
npm install
npm run dev
```

Mở http://localhost:3000.

## Sửa nhanh

| Muốn đổi | Sửa file |
|---|---|
| Tên phòng khám, múi giờ | `src/lib/clinic-config.ts` |
| Màu sắc, font | `src/app/globals.css` (khối `@theme`) |
| Mục menu | `src/lib/navigation.ts` |
| Dữ liệu mẫu | `src/mocks/dashboard.ts` |

Toàn bộ dữ liệu hiện tại là **dữ liệu mẫu**, không phải thông tin người thật.
