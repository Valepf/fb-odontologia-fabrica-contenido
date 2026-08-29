@echo off
setlocal
cd /d "%~dp0"
echo.
echo ================================================
echo F.B. Odontologia - Instalacion inicial
echo ================================================
echo.
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js no esta instalado o no esta en PATH.
  echo Instala Node.js 22 LTS y volve a ejecutar este archivo.
  pause
  exit /b 1
)
node --version
npm --version
if not exist .env.local copy /Y env.example .env.local >nul
echo.
echo Instalando dependencias...
call npm install
if errorlevel 1 goto :error
echo.
echo Descargando tipografias de la marca...
call npm run fuentes
if errorlevel 1 goto :error
echo.
echo LISTO. Ahora ejecuta RENDER_PRUEBA_WINDOWS.bat
pause
exit /b 0
:error
echo.
echo Hubo un error. Copia el texto de esta ventana y pasamelo.
pause
exit /b 1
