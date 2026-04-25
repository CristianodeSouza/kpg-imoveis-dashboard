@echo off
title KPG Imoveis Dashboard
cd /d "%~dp0"
echo.
echo  Instalando dependencias...
python -m pip install -r requirements.txt -q
echo.
echo  Iniciando servidor KPG Imoveis...
echo.
python app.py
pause
