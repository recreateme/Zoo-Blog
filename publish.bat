@echo off
REM 一键发布：提交 GitHub + 更新 VPS
REM 用法：双击本文件，或 publish.bat "提交说明"
cd /d "%~dp0"
if "%~1"=="" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\publish.ps1"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\publish.ps1" -Message "%*"
)
pause
