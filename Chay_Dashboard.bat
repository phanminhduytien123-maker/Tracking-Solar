@echo off
chcp 65001 >nul
title ĐỒ ÁN TỐT NGHIỆP: TRACKING SOLAR DASHBOARD (Fuzzy-PID & PSO)
color 0F

echo ==============================================================================
echo   HE THONG DIEU HUONG PIN MAT TROI THONG MINH (FUZZY LOGIC & PSO)
echo   SMART DUAL-AXIS ĐỒ ÁN TỐT NGHIỆP: TRACKING SOLAR REAL-TIME DASHBOARD
echo ==============================================================================
echo.
echo [*] Dang khoi dong Web Dashboard tai http://localhost:3001 ...
echo [*] Nhan Ctrl+C de dung may chu.
echo.

cd /d "%~dp0dashboard"

:: Mo trinh duyet
start "" http://localhost:3001

:: Chay Vite Dev Server
npm run dev

pause
