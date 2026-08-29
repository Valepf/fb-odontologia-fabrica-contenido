@echo off
setlocal
cd /d "%~dp0"
echo.
echo ================================================
echo F.B. Odontologia - Render de prueba
echo ================================================
echo.
call npm run render -- 01-bienvenida-fb
if errorlevel 1 (
  echo.
  echo El render fallo. Copia el error y pasamelo.
  pause
  exit /b 1
)
echo.
echo Render terminado. Abriendo la carpeta de salida...
start "" "%~dp0content-studio\output\01-bienvenida-fb"
pause
