@echo off
setlocal EnableExtensions
set "DEST=C:\Users\Valeria\OneDrive\Desktop\FB_Odontologia\FB_Odontologia_Fabrica_Contenido_v1"

echo.
echo ================================================
echo F.B. Odontologia - Parche Cloudinary
echo ================================================
echo.

if not exist "%DEST%\package.json" (
  echo No encontre el proyecto en:
  echo %DEST%
  echo.
  echo Copia manualmente los archivos de este parche dentro de la carpeta raiz del proyecto.
  pause
  exit /b 1
)

copy /Y "%~dp0package.json" "%DEST%\package.json" >nul
if not exist "%DEST%\scripts" mkdir "%DEST%\scripts"
copy /Y "%~dp0scripts\stage.mjs" "%DEST%\scripts\stage.mjs" >nul
copy /Y "%~dp0scripts\check-cloudinary.mjs" "%DEST%\scripts\check-cloudinary.mjs" >nul
copy /Y "%~dp0CONFIGURAR_CLOUDINARY_WINDOWS.ps1" "%DEST%\CONFIGURAR_CLOUDINARY_WINDOWS.ps1" >nul
copy /Y "%~dp0CONFIGURAR_CLOUDINARY_WINDOWS.bat" "%DEST%\CONFIGURAR_CLOUDINARY_WINDOWS.bat" >nul
copy /Y "%~dp0ENCOLAR_Y_SIMULAR_WINDOWS.bat" "%DEST%\ENCOLAR_Y_SIMULAR_WINDOWS.bat" >nul

echo ^✓ Parche aplicado.
echo.
echo Se abrira la carpeta del proyecto.
start "" "%DEST%"
pause
