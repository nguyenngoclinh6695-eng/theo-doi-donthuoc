# Chạy website ở chế độ thật. Được Task Scheduler gọi khi máy khởi động (xem scripts\register-tasks.ps1).
# Chỉ lắng nghe trên 127.0.0.1: không máy nào vào thẳng được cổng 3000,
# mọi truy cập phải đi qua Tailscale (có HTTPS và chỉ thiết bị trong mạng VPN của phòng khám).

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:NODE_ENV = "production"

$logDir = Join-Path (Get-Location) "logs"
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir ("web-" + (Get-Date -Format "yyyyMMdd") + ".log")

npx next start -H 127.0.0.1 -p 3000 *>> $log
