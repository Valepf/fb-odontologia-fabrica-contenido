@echo off
setlocal
cd /d "%~dp0"
title F.B. Odontologia - Configurar Vercel Blob

echo ============================================================
echo   F.B. ODONTOLOGIA - CONFIGURAR VERCEL BLOB
echo ============================================================
echo.
echo Este asistente NO publica nada en Instagram.
echo Solo conecta este proyecto con Vercel y crea almacenamiento
echo publico para las imagenes del carrusel.
echo.
pause

echo.
echo [1/4] Iniciando sesion en Vercel...
call npx --yes vercel@latest login
if errorlevel 1 goto :error

echo.
echo [2/4] Vinculando esta carpeta con un proyecto de Vercel...
echo Si Vercel pregunta si queres vincularla, elegi Y.
echo Si pregunta por un proyecto existente, podes crear uno nuevo.
call npx --yes vercel@latest link
if errorlevel 1 goto :error

echo.
echo [3/4] Creando Blob publico...
call npx --yes vercel@latest blob create-store fb-odontologia-contenido --access public
if errorlevel 1 (
  echo.
  echo No se pudo crear el store. Si ya existe, no necesariamente es un problema.
  echo Vamos a intentar descargar igualmente las variables del proyecto.
)

echo.
echo [4/4] Descargando variables locales a .env.local...
call npx --yes vercel@latest env pull .env.local
if errorlevel 1 goto :error

echo.
findstr /B /C:"BLOB_READ_WRITE_TOKEN=" .env.local >nul 2>&1
if errorlevel 1 (
  echo ATENCION: .env.local se creo, pero no encuentro BLOB_READ_WRITE_TOKEN.
  echo No cierres esta ventana. Mandame una captura de este mensaje.
  pause
  exit /b 1
)

echo ============================================================
echo   LISTO: Vercel Blob quedo conectado.
echo ============================================================
echo.
echo Importante: .env.local contiene una credencial privada.
echo No la envies por WhatsApp, mail ni captura y no la subas a GitHub.
echo.
pause
exit /b 0

:error
echo.
echo ============================================================
echo   HUBO UN ERROR. No se publico nada.
echo ============================================================
echo Mandame una captura desde la primera linea de error.
echo.
pause
exit /b 1
