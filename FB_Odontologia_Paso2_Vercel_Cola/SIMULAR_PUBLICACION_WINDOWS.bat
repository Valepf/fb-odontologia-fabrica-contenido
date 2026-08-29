@echo off
setlocal
cd /d "%~dp0"
title F.B. Odontologia - Simulacro Instagram

echo ============================================================
echo   F.B. ODONTOLOGIA - SIMULACRO DE PUBLICACION
echo ============================================================
echo.
echo Este comando NO publica nada. Solo muestra que carrusel tomaria

echo el sistema, cuantas imagenes tiene y que bloque horario usaria.
echo.
call npm run publicar:simulacro

echo.
pause
