# Sao lưu database PostgreSQL ra thư mục backups\ (định dạng nén của pg_dump), giữ 30 bản gần nhất.
# Chạy tay:  powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1
# Khôi phục (cẩn thận – ghi đè dữ liệu):  pg_restore --clean --if-exists -d "<DATABASE_URL không có ?schema=...>" backups\<file>.dump
# NÊN chép thư mục backups\ sang ổ cứng/máy khác định kỳ – sao lưu nằm cùng máy thì hỏng máy là mất cả hai.

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$line = Get-Content ".env" | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (-not $line) { throw "Không thấy DATABASE_URL trong .env" }
# pg_dump không hiểu tham số ?schema=public của Prisma nên bỏ phần query đi.
$url = ($line -replace '^DATABASE_URL=', '').Trim('"') -replace '\?.*$', ''

$pgDump = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe" -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
if (-not $pgDump) { throw "Không tìm thấy pg_dump.exe trong C:\Program Files\PostgreSQL" }

$dir = Join-Path $root "backups"
New-Item -ItemType Directory -Force $dir | Out-Null
$name = "phongkham-" + (Get-Date -Format "yyyyMMdd-HHmm") + ".dump"

# Chạy pg_dump ngay trong thư mục backups và chỉ truyền TÊN file (không dấu): PowerShell 5.1 truyền đối số
# sang chương trình ngoài theo bảng mã ANSI, đường dẫn có chữ tiếng Việt (vd. "học") sẽ bị hỏng.
Push-Location $dir
try {
  & $pgDump.FullName --format=custom --file=$name $url
  if ($LASTEXITCODE -ne 0) { throw "pg_dump thất bại." }
} finally {
  Pop-Location
}
Write-Host "Đã sao lưu: $(Join-Path $dir $name)"

# Chép kèm thư mục bản scan đơn thuốc (storage\scans). File scan không bao giờ bị ghi đè nên chỉ cần chép thêm file mới.
$storage = Join-Path $root "storage"
if (Test-Path $storage) {
  $dest = Join-Path $dir "storage"
  New-Item -ItemType Directory -Force $dest | Out-Null
  # Chép NỘI DUNG thư mục (dấu *), tránh tạo thư mục lồng storagestorage từ lần chạy thứ hai.
  Copy-Item (Join-Path $storage "*") $dest -Recurse -Force
  Write-Host "Đã chép thư mục bản scan vào backups\storage"
}

Get-ChildItem $dir -Filter "phongkham-*.dump" | Sort-Object Name -Descending | Select-Object -Skip 30 | Remove-Item -Force
