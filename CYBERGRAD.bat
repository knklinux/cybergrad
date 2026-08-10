@echo off
title CYBERGRAD - Simulador de Carrera SOC
cd /d "%~dp0"
if not exist serve.js (
  echo  [ERROR] No encuentro serve.js.
  echo  Este .bat debe estar dentro de la carpeta del proyecto CYBERGRAD.
  pause
  exit /b 1
)
echo.
echo  [CYBERGRAD] Arrancando el SOC de ACME Corp...
echo  Abriendo http://127.0.0.1:8000
echo  (Manten esta ventana abierta mientras juegas; cierrala para salir)
echo.
start /b "" node serve.js 8000
ping -n 3 127.0.0.1 >nul
start "" "http://127.0.0.1:8000"
