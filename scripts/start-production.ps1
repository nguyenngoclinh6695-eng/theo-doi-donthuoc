# Chạy website ở chế độ thật. Được Task Scheduler gọi khi máy khởi động (xem scripts\register-tasks.ps1).
# Chỉ lắng nghe trên 127.0.0.1: không máy nào vào thẳng được cổng 3000,
# mọi truy cập phải đi qua Tailscale (có HTTPS và chỉ thiết bị trong mạng VPN của phòng khám).

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:NODE_ENV = "production"

New-Item -ItemType Directory -Force "logs" | Out-Null
# Đường dẫn log TƯƠNG ĐỐI và không dấu: cmd.exe nhận đối số theo bảng mã ANSI, đường dẫn có chữ tiếng Việt sẽ hỏng.
$log = "logs/web-" + (Get-Date -Format "yyyyMMdd") + ".log"

# Chạy qua cmd.exe để ghi cả luồng thông báo lẫn luồng lỗi (2>&1) vào cùng file log.
cmd.exe /c "npx next start -H 127.0.0.1 -p 3000 >> $log 2>&1"
