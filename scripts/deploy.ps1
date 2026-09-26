# Cài đặt / cập nhật phiên bản mới trên máy chủ phòng khám.
# Chạy trong PowerShell tại thư mục dự án:  powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1
# Các bước: cài thư viện đúng phiên bản -> áp dụng thay đổi database -> build bản chạy thật.

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path ".env")) { throw "Thiếu file .env (xem .env.example và docs/TRIEN-KHAI.md)." }

Write-Host "1/4 Sao lưu database trước khi cập nhật..."
& "$PSScriptRoot\backup-db.ps1"

Write-Host "2/4 Cài thư viện (npm ci)..."
npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci thất bại." }

Write-Host "3/4 Áp dụng thay đổi database (prisma migrate deploy)..."
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw "Áp dụng migration thất bại – database chưa bị thay đổi phần lỗi, xem thông báo ở trên." }

Write-Host "4/4 Build bản chạy thật..."
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build thất bại." }

Write-Host "Xong. Khởi động lại dịch vụ: Restart-ScheduledTask -TaskName 'PhongKham-Web'  (hoặc khởi động lại máy)."
