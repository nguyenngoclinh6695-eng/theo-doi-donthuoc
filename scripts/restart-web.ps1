# Khởi động lại website (sau khi sửa file .env hoặc cập nhật phiên bản). KHÔNG cần quyền Admin.
# Chạy:  powershell -ExecutionPolicy Bypass -File scripts\restart-web.ps1
# Website chạy dưới tài khoản Windows đang đăng nhập (xem register-tasks.ps1), nên chính tài khoản đó tắt/bật lại được.

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

# Tắt tiến trình website đang giữ cổng 3000.
$old = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
foreach ($c in $old) { Stop-Process -Id $c.OwningProcess -Force }
Start-Sleep -Seconds 2

# Chạy lại ở chế độ ẩn, tách khỏi cửa sổ hiện tại (đóng cửa sổ này website vẫn chạy).
Start-Process powershell.exe -WindowStyle Hidden -WorkingDirectory $root `
  -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$root\scripts\start-production.ps1`""

# Chờ website sẵn sàng (tối đa khoảng 60 giây).
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:3000/dang-nhap" -UseBasicParsing -TimeoutSec 5
    if ($r.StatusCode -eq 200) { Write-Host "Đã khởi động lại website."; exit 0 }
  } catch {}
}
Write-Host "Website chưa lên sau 60 giây – xem file log trong thư mục logs\."
exit 1
