# Đăng ký 2 tác vụ tự động trong Task Scheduler của Windows (chạy MỘT lần, bằng PowerShell "Run as administrator"):
#   - PhongKham-Web    : chạy website khi tài khoản Windows đang chạy script này đăng nhập, VÀ tự kiểm tra lại
#                        mỗi 5 phút để bật lại nếu website bị tắt giữa chừng (vd. ai đó lỡ tắt tiến trình, máy
#                        treo tạm thời...). Nếu website đang chạy thì lần kiểm tra đó chỉ bỏ qua, không chạy trùng.
#                        (Không chạy dưới SYSTEM được: Microsoft Edge – dùng để in đơn PDF – tự thoát khi chạy dưới SYSTEM.
#                         Nên đặt Windows tự đăng nhập tài khoản này khi bật máy.)
#   - PhongKham-Backup : sao lưu database lúc 22:00 hằng ngày
# Gỡ:  Unregister-ScheduledTask -TaskName PhongKham-Web,PhongKham-Backup -Confirm:$false

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw "Hãy mở PowerShell bằng 'Run as administrator' rồi chạy lại." }

$ps = "powershell.exe"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 0)
# Sao lưu chạy bằng tài khoản SYSTEM để vẫn chạy khi không ai đăng nhập vào máy.
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Website chạy dưới tài khoản hiện tại, quyền thường (không nâng quyền), cửa sổ ẩn.
$me = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$userPrincipal = New-ScheduledTaskPrincipal -UserId $me -LogonType Interactive -RunLevel Limited
$web = New-ScheduledTaskAction -Execute $ps -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$root\scripts\start-production.ps1`"" -WorkingDirectory $root

# Hai trình kích hoạt: (1) chạy ngay lúc đăng nhập, (2) sau đó cứ mỗi 5 phút kiểm tra lại một lần, vô thời hạn.
# MultipleInstances mặc định là "bỏ qua nếu đang chạy", nên lần kiểm tra không làm chạy trùng tiến trình.
$atLogOn = New-ScheduledTaskTrigger -AtLogOn -User $me
$watchdog = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
Register-ScheduledTask -TaskName "PhongKham-Web" -Action $web -Trigger @($atLogOn, $watchdog) -Settings $settings -Principal $userPrincipal -Force | Out-Null

$backup = New-ScheduledTaskAction -Execute $ps -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$root\scripts\backup-db.ps1`"" -WorkingDirectory $root
Register-ScheduledTask -TaskName "PhongKham-Backup" -Action $backup -Trigger (New-ScheduledTaskTrigger -Daily -At "22:00") -Settings $settings -Principal $principal -Force | Out-Null

Write-Host "Đã đăng ký PhongKham-Web và PhongKham-Backup. Chạy ngay website:  Start-ScheduledTask -TaskName PhongKham-Web"
