$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " F.B. Odontologia - Configurar Cloudinary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "En Cloudinary: Dashboard -> API Keys." -ForegroundColor Yellow
Write-Host "Copia la API Environment Variable completa." -ForegroundColor Yellow
Write-Host "Debe empezar con cloudinary://" -ForegroundColor Yellow
Write-Host "NO la compartas por chat ni la subas a GitHub." -ForegroundColor Yellow
Write-Host ""

$secure = Read-Host "Pega CLOUDINARY_URL" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $url = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}

if ([string]::IsNullOrWhiteSpace($url) -or -not $url.StartsWith("cloudinary://")) {
  Write-Host ""
  Write-Host "ERROR: el valor debe empezar con cloudinary://" -ForegroundColor Red
  Read-Host "Presiona Enter para cerrar"
  exit 1
}

$envPath = Join-Path $PSScriptRoot ".env.local"
$lines = @()
if (Test-Path $envPath) {
  $lines = Get-Content $envPath | Where-Object { $_ -notmatch '^CLOUDINARY_URL=' -and $_ -notmatch '^BLOB_READ_WRITE_TOKEN=' }
}
$lines += "CLOUDINARY_URL=$url"
[System.IO.File]::WriteAllLines($envPath, $lines, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ""
Write-Host "Credencial guardada en .env.local" -ForegroundColor Green
Write-Host "Instalando integracion de Cloudinary..." -ForegroundColor Cyan

npm install
if ($LASTEXITCODE -ne 0) {
  throw "npm install fallo"
}

Write-Host ""
Write-Host "Probando conexion..." -ForegroundColor Cyan
npm run cloudinary:check
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "La conexion fallo. Copia solo el mensaje de error, nunca CLOUDINARY_URL." -ForegroundColor Red
  Read-Host "Presiona Enter para cerrar"
  exit 1
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host " LISTO: Cloudinary quedo conectado." -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Read-Host "Presiona Enter para cerrar"
