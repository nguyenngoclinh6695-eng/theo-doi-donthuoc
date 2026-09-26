# Đăng ký 2 tác vụ tự động trong Task Scheduler của Windows (chạy MỘT lần, bằng PowerShell "Run as administrator"):
#   - PhongKham-Web    : chạy website mỗi khi máy khởi động (kể cả khi chưa ai đăng nhập Windows)
#   - PhongKham-Backup : sao lưu database lúc 22:00 hằng ngày
# Gỡ:  Unregister-ScheduledTask -TaskName PhongKham-Web,PhongKham-Backup -Confirm:$false

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw "Hãy mở PowerShell bằng 'Run as administrator' rồi chạy lại." }

$ps = "powershell.exe"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 0)
# Chạy bằng tài khoản SYSTEM để website hoạt động cả khi không ai đăng nhập vào máy.
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

$web = New-ScheduledTaskAction -Execute $ps -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$root\scripts\start-production.ps1`"" -WorkingDirectory $root
Register-ScheduledTask -TaskName "PhongKham-Web" -Action $web -Trigger (New-ScheduledTaskTrigger -AtStartup) -Settings $settings -Principal $principal -Force | Out-Null

$backup = New-ScheduledTaskAction -Execute $ps -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$root\scripts\backup-db.ps1`"" -WorkingDirectory $root
Register-ScheduledTask -TaskName "PhongKham-Backup" -Action $backup -Trigger (New-ScheduledTaskTrigger -Daily -At "22:00") -Settings $settings -Principal $principal -Force | Out-Null

Write-Host "Đã đăng ký PhongKham-Web và PhongKham-Backup. Chạy ngay website:  Start-ScheduledTask -TaskName PhongKham-Web"
