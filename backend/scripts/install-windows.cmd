@echo off
setlocal
set SCRIPT_DIR=%~dp0
echo Running PowerShell installer...
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%install-windows.ps1"
if %ERRORLEVEL% NEQ 0 (
  echo Install failed. Try running this script as the target user.
  exit /b %ERRORLEVEL%
)
echo Done.
endlocal
