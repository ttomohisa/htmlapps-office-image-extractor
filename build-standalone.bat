@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-standalone.ps1" %*
set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" echo Build failed with exit code %EXITCODE%.
exit /b %EXITCODE%
