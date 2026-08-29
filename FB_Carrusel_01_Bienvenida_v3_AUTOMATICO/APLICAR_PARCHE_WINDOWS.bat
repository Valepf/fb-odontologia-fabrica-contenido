@echo off
setlocal
chcp 65001 >nul
set "TARGET=C:\Users\Valeria\OneDrive\Desktop\FB_Odontologia\FB_Odontologia_Fabrica_Contenido_v1"

echo.
echo =====================================================
echo F.B. Odontologia - Aplicar Carrusel Bienvenida v3
echo =====================================================
echo.

if not exist "%TARGET%\package.json" (
  echo ERROR: No encuentro el proyecto en:
  echo %TARGET%
  echo.
  echo No se modifico ningun archivo.
  pause
  exit /b 1
)

copy /Y "%~dp0files\01-bienvenida-fb.json" "%TARGET%\content-studio\content\01-bienvenida-fb.json" >nul
if errorlevel 1 goto :error
copy /Y "%~dp0files\slides.mjs" "%TARGET%\content-studio\template\slides.mjs" >nul
if errorlevel 1 goto :error
copy /Y "%~dp0files\marca.json" "%TARGET%\marca.json" >nul
if errorlevel 1 goto :error

echo Archivos actualizados correctamente.
echo.
echo Renderizando carrusel...
cd /d "%TARGET%"
call npm run render -- 01-bienvenida-fb
if errorlevel 1 goto :render_error

echo.
echo LISTO. Abriendo las imagenes nuevas...
start "" "%TARGET%\content-studio\output\01-bienvenida-fb"
pause
exit /b 0

:error
echo.
echo ERROR al copiar los archivos del parche.
pause
exit /b 1

:render_error
echo.
echo El parche se aplico, pero el render fallo.
echo Copiame el error que aparece arriba.
pause
exit /b 1
