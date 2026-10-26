@echo off
title Empresas CamiLombriz Ltda. - Servidor Local
echo ========================================================
echo   Empresas CamiLombriz Ltda. - Web 3D & Landing Page
echo   Inspirado en Threshold Mirror (Three.js WebGL2)
echo ========================================================
echo.
echo Iniciando servidor en http://localhost:5500 ...
echo Abriendo navegador...
start http://localhost:5500
python -m http.server 5500 --bind 0.0.0.0 --directory "%~dp0"
pause
