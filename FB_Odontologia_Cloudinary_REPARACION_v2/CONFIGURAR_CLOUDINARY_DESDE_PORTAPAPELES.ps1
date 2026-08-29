$ErrorActionPreference = "Stop"
$project = "C:\Users\Valeria\OneDrive\Desktop\FB_Odontologia\FB_Odontologia_Fabrica_Contenido_v1"
Set-Location $project

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " F.B. Odontologia - Configurar Cloudinary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. En Cloudinary copia la API Environment Variable." -ForegroundColor Yellow
Write-Host "2. Debe contener cloudinary://" -ForegroundColor Yellow
Write-Host "3. Vuelve a esta ventana y presiona Enter." -ForegroundColor Yellow
Write-Host ""
Read-Host "Cuando ya la hayas COPIADO, presiona Enter"

$raw = Get-Clipboard -Raw
if ([string]::IsNullOrWhiteSpace($raw)) {
  Write-Host "ERROR: el portapapeles esta vacio." -ForegroundColor Red
  Read-Host "Presiona Enter para cerrar"
  exit 1
}

$url = $raw.Trim()
if ($url -match '^CLOUDINARY_URL\s*=\s*(.+)$') {
  $url = $Matches[1].Trim()
}
$url = $url.Trim('"').Trim("'")

if (-not $url.StartsWith("cloudinary://")) {
  Write-Host "ERROR: lo copiado no parece ser CLOUDINARY_URL." -ForegroundColor Red
  Write-Host "Vuelve a Cloudinary y copia la variable que empieza con cloudinary://" -ForegroundColor Yellow
  Read-Host "Presiona Enter para cerrar"
  exit 1
}

$envPath = Join-Path $project ".env.local"
$lines = @()
if (Test-Path $envPath) {
  $lines = Get-Content $envPath | Where-Object { $_ -notmatch '^CLOUDINARY_URL=' -and $_ -notmatch '^BLOB_READ_WRITE_TOKEN=' }
}
$lines += "CLOUDINARY_URL=$url"
[System.IO.File]::WriteAllLines($envPath, $lines, (New-Object System.Text.UTF8Encoding($false)))

# Remove secret from clipboard immediately after saving it.
Set-Clipboard -Value ""

Write-Host ""
Write-Host "Credencial guardada correctamente en .env.local" -ForegroundColor Green
Write-Host "Instalando/verificando dependencias..." -ForegroundColor Cyan

npm install
if ($LASTEXITCODE -ne 0) { throw "npm install fallo" }

Write-Host ""
Write-Host "Probando conexion con Cloudinary..." -ForegroundColor Cyan
npm run cloudinary:check
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "La prueba de conexion fallo." -ForegroundColor Red
  Write-Host "Mandame solo el mensaje de error, nunca la CLOUDINARY_URL." -ForegroundColor Yellow
  Read-Host "Presiona Enter para cerrar"
  exit 1
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host " LISTO: Cloudinary quedo conectado." -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Read-Host "Presiona Enter para cerrar"
