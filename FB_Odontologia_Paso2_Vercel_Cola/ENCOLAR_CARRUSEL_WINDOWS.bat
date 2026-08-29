@echo off
setlocal
cd /d "%~dp0"
title F.B. Odontologia - Encolar carrusel

echo ============================================================
echo   F.B. ODONTOLOGIA - ENCOLAR CARRUSEL 01
echo ============================================================
echo.
echo Este paso SUBE las 5 imagenes a Vercel Blob y las agrega a cola.json.
echo NO publica nada en Instagram.
echo.

if not exist ".env.local" (
  echo Falta .env.local. Primero ejecuta CONFIGURAR_VERCEL_WINDOWS.bat
  pause
  exit /b 1
)

if not exist "content-studio\output\01-bienvenida-fb\01.jpg" (
  echo No encuentro el carrusel renderizado.
  echo Ejecuta primero RENDER_PRUEBA_WINDOWS.bat
  pause
  exit /b 1
)

call npm run stage -- 01-bienvenida-fb
if errorlevel 1 goto :error

echo.
echo ============================================================
echo   LISTO: el carrusel esta en la cola.
echo ============================================================
echo.
echo El siguiente paso sera SIMULAR la publicacion.
echo.
pause
exit /b 0

:error
echo.
echo No se pudo encolar. No se publico nada en Instagram.
echo Mandame una captura del error.
echo.
pause
exit /b 1
