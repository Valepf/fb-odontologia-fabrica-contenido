@echo off
setlocal EnableExtensions
set "DEST=C:\Users\Valeria\OneDrive\Desktop\FB_Odontologia\FB_Odontologia_Fabrica_Contenido_v1"

echo.
echo ================================================
echo F.B. Odontologia - Reparacion Cloudinary
echo ================================================
echo.

if not exist "%DEST%\package.json" (
  echo ERROR: No encontre el proyecto en:
  echo %DEST%
  echo.
  pause
  exit /b 1
)

copy /Y "%~dp0CONFIGURAR_CLOUDINARY_WINDOWS.ps1" "%DEST%\CONFIGURAR_CLOUDINARY_WINDOWS.ps1" >nul

echo Archivo reparado correctamente.
echo Ahora se abrira la configuracion de Cloudinary.
echo.
cd /d "%DEST%"
powershell -NoProfile -ExecutionPolicy Bypass -File "%DEST%\CONFIGURAR_CLOUDINARY_WINDOWS.ps1"

echo.
pause
