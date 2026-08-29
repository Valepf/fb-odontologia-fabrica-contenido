@echo off
setlocal
cd /d "%~dp0"
call npm run grilla
if errorlevel 1 (
  echo.
  echo La grilla no pudo generarse. Copia el error y pasamelo.
  pause
  exit /b 1
)
start "" "%~dp0content-studio\output\_grilla"
pause
