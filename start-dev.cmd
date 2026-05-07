@echo off
setlocal
cd /d "%~dp0"

start "BeatDrop Dev Server" cmd /k "cd /d \"%~dp0\" && npm.cmd run dev || pause"
timeout /t 5 >nul
start "" http://127.0.0.1:4173/
