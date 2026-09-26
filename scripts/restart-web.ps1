# Khởi động lại website (sau khi sửa file .env hoặc cập nhật phiên bản). Tự xin quyền Admin nếu cần.
# Chạy:  powershell -ExecutionPolicy Bypass -File scripts\restart-web.ps1

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`""
  exit
}

Stop-ScheduledTask -TaskName "PhongKham-Web" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
# Dừng hẳn tiến trình website còn giữ cổng 3000 (tác vụ dừng không tự tắt tiến trình con).
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
Start-Sleep -Seconds 1
Start-ScheduledTask -TaskName "PhongKham-Web"
Write-Host "Đã khởi động lại website."
