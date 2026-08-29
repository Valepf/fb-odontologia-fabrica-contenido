@echo off
setlocal
cd /d "%~dp0"
echo.
echo ================================================
echo F.B. Odontologia - Cloudinary + cola + simulacro
echo ================================================
echo.
call npm run stage -- 01-bienvenida-fb
if errorlevel 1 (
  echo.
  echo Fallo la subida/encolado. Copiame SOLO el error, nunca las credenciales.
  pause
  exit /b 1
)
echo.
echo -----------------------------------------------
echo Simulacro de publicacion (NO publica en Instagram)
echo -----------------------------------------------
call npm run publicar:simulacro
pause
