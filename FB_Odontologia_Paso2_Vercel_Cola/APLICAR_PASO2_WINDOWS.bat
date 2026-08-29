@echo off
setlocal
set "DEST=%USERPROFILE%\OneDrive\Desktop\FB_Odontologia\FB_Odontologia_Fabrica_Contenido_v1"

echo ============================================================
echo   F.B. ODONTOLOGIA - APLICAR PASO 2
echo ============================================================
echo.
if not exist "%DEST%\package.json" (
  echo No encontre el proyecto en:
  echo %DEST%
  echo.
  echo No se modifico nada. Mandame una captura de esta ventana.
  pause
  exit /b 1
)

copy /Y "%~dp0scripts\stage.mjs" "%DEST%\scripts\stage.mjs" >nul
copy /Y "%~dp0CONFIGURAR_VERCEL_WINDOWS.bat" "%DEST%\CONFIGURAR_VERCEL_WINDOWS.bat" >nul
copy /Y "%~dp0ENCOLAR_CARRUSEL_WINDOWS.bat" "%DEST%\ENCOLAR_CARRUSEL_WINDOWS.bat" >nul
copy /Y "%~dp0SIMULAR_PUBLICACION_WINDOWS.bat" "%DEST%\SIMULAR_PUBLICACION_WINDOWS.bat" >nul

echo Paso 2 instalado correctamente.
echo.
echo Ahora, dentro del proyecto, ejecuta primero:
echo   CONFIGURAR_VERCEL_WINDOWS.bat
echo.
explorer "%DEST%"
pause
