@echo off
title KPG Imoveis Publisher
echo.
echo  =======================================
echo   KPG IMOVEIS — Instagram Publisher
echo  =======================================
echo.

cd /d "%~dp0backend"

if not exist "..\venv\Scripts\activate.bat" (
    echo Criando ambiente virtual...
    python -m venv ..\venv
)

call ..\venv\Scripts\activate.bat

echo Instalando dependencias...
pip install -r requirements.txt -q

echo.
echo Iniciando servidor...
echo Acesse: http://localhost:8000
echo.
start "" http://localhost:8000
python main.py

pause
