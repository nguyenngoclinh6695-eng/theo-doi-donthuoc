# Triển khai: máy chủ tại phòng khám + truy cập qua VPN (Tailscale)

Mục tiêu: nhân viên mở website bằng một đường link (vd. `https://phongkham.tail1234.ts.net`) từ máy tính/điện thoại,
ở phòng khám hay ở nhà; dữ liệu lưu trên máy chủ đặt **tại phòng khám**, không nằm trên dịch vụ thuê ngoài.

```
Điện thoại / máy nhân viên ──(Tailscale VPN, mã hoá)──► Máy chủ phòng khám
                                                          ├─ Tailscale Serve (HTTPS)  ──► Website Next.js 127.0.0.1:3000
                                                          └─ PostgreSQL (chỉ nội bộ máy)
```

Chỉ thiết bị đã đăng nhập vào mạng Tailscale của phòng khám mới mở được link. Website không mở ra internet công cộng.

---

## 1. Chuẩn bị máy chủ (làm một lần)

Một máy tính Windows chạy liên tục (không tắt/ngủ). Cài:

1. **Node.js LTS** (nodejs.org) và **Git**.
2. **PostgreSQL 17** (postgresql.org hoặc `winget install PostgreSQL.PostgreSQL.17`). Ghi nhớ mật khẩu tài khoản `postgres`.
3. Tắt chế độ ngủ: *Settings → System → Power → Sleep: Never*.
4. **Microsoft Edge** (có sẵn trên Windows 10/11) – hệ thống dùng Edge để in đơn thuốc ra PDF. Máy không có Edge thì cài Chromium và khai báo `PDF_BROWSER_PATH` trong `.env`.

Tạo database và tài khoản riêng cho ứng dụng (thay `MAT_KHAU_APP` bằng mật khẩu mạnh, chỉ dùng ở file `.env`):

```bash
psql -U postgres -h localhost -c "CREATE ROLE phongkham_app LOGIN PASSWORD 'MAT_KHAU_APP';" -c "ALTER ROLE phongkham_app SET timezone TO 'UTC';" -c "CREATE DATABASE phongkham OWNER phongkham_app ENCODING 'UTF8' TEMPLATE template0;"
```

## 2. Cài website

```bash
git clone <địa chỉ kho mã> phong-kham
cd phong-kham
copy .env.example .env
```

Sửa `.env`:

| Biến | Giá trị |
|---|---|
| `DATABASE_URL` | `postgresql://phongkham_app:MAT_KHAU_APP@localhost:5432/phongkham?schema=public` |
| `APP_HOST` | tên miền Tailscale của máy chủ, vd. `phongkham.tail1234.ts.net` (điền sau bước 4) |
| `CLINIC_NAME`, `CLINIC_ADDRESS`, `CLINIC_PHONE` | tên, địa chỉ, điện thoại phòng khám **in trên đơn thuốc** (thiếu thì hệ thống từ chối in) |
| `SEED_USER_PASSWORD` | xoá dòng này trên máy chủ thật |

Chạy cài đặt (sao lưu → cài thư viện → áp dụng database → build):

```bash
powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1
```

Tạo tài khoản nhân viên: tạo tạm file `accounts.local.json` (xem đầu file `scripts/create-accounts.ts`), chạy
`npm run accounts:create`, rồi **xoá file đó**. Sau này thêm tài khoản bằng trang **Người dùng** (đăng nhập admin).

## 3. Cho website tự chạy khi bật máy + sao lưu hằng ngày

Mở PowerShell **Run as administrator** tại thư mục dự án:

```bash
powershell -ExecutionPolicy Bypass -File scripts\register-tasks.ps1
```

- `PhongKham-Web`: chạy website **khi tài khoản Windows đã chạy lệnh trên đăng nhập** (log ở thư mục `logs\`).
  Không chạy dưới tài khoản hệ thống (SYSTEM) được vì Microsoft Edge – dùng để in đơn PDF – tự thoát khi chạy dưới SYSTEM.
  Vì vậy nên cho máy chủ **tự đăng nhập Windows khi bật máy** (để sau mất điện website tự chạy lại) và **khoá màn hình**
  khi không dùng (Windows + L – website vẫn chạy khi màn hình khoá). Đăng xuất (Sign out) thì website dừng.
- `PhongKham-Backup`: sao lưu database lúc 22:00 vào `backups\` (giữ 30 bản).
  **Chép thư mục `backups\` sang ổ cứng rời / máy khác định kỳ** – nếu máy chủ hỏng mà bản sao lưu nằm cùng máy thì mất cả hai.

## 4. Tailscale (VPN) – tạo đường link cho nhân viên

1. Người quản lý tạo tài khoản tại **tailscale.com** (gói miễn phí đủ cho phòng khám nhỏ).
2. Cài Tailscale trên **máy chủ**, đăng nhập bằng tài khoản trên. Trong trang quản trị Tailscale → *DNS*: bật **MagicDNS** và **HTTPS Certificates**.
3. Trên máy chủ, mở PowerShell (quyền admin) và chạy:
   ```bash
   tailscale serve --bg 3000
   ```
   Lệnh in ra đường link `https://<tên-máy>.<tailnet>.ts.net` → điền phần tên miền (không có `https://`) vào `APP_HOST` trong `.env`,
   rồi khởi động lại: `powershell -ExecutionPolicy Bypass -File scriptsestart-web.ps1`.
   *Không dùng `tailscale funnel`* – lệnh đó mở website ra internet công cộng.
4. Trên **mỗi máy tính / điện thoại của nhân viên**: cài ứng dụng Tailscale, đăng nhập (người quản lý mời vào mạng của phòng khám).
5. Nhân viên mở đường link ở bước 3 → trang đăng nhập → dùng tài khoản được cấp.

Khi nhân viên nghỉ việc: khoá tài khoản trong trang **Người dùng** **và** gỡ thiết bị của họ khỏi Tailscale.

## 5. Trước khi dùng thật

```bash
npm run db:clear-sample -- --xac-nhan
```

Xoá toàn bộ bệnh nhân/thuốc/tài khoản **mẫu**. Không đụng tới tài khoản thật, Thư viện chuẩn.
Sau lệnh này **không chạy `npm run db:seed` trên máy chủ thật** nữa.

## 6. Cập nhật phiên bản mới / khởi động lại

Sau khi sửa file `.env` (vd. thông tin phòng khám) cần khởi động lại website: `powershell -ExecutionPolicy Bypass -File scriptsestart-web.ps1` (Windows sẽ hỏi quyền Admin).


```bash
git pull
powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1
powershell -ExecutionPolicy Bypass -File scriptsestart-web.ps1
```

## Lưu ý bảo mật

- Mật khẩu hệ thống hiện cho phép tối thiểu 6 ký tự theo yêu cầu phòng khám. Nên đổi sang mật khẩu dài hơn (trang **Đổi mật khẩu**),
  nhất là tài khoản `admin`, và tăng `PASSWORD_MIN_LENGTH` trong `src/lib/auth/password.ts` khi có thể.
- Mật khẩu các tài khoản đã từng được gửi qua tin nhắn/trò chuyện – coi như đã lộ, nên đổi.
- Website chỉ lắng nghe ở `127.0.0.1`: máy khác trong mạng LAN không vào thẳng được cổng 3000, mọi truy cập đều qua Tailscale (HTTPS).
