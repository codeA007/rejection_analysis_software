@echo off
setlocal
cd /d "%~dp0"

title Foundry Rejection Tracker

REM Help double-click find Node when it was installed but Explorer PATH is stale
if exist "%ProgramFiles%\nodejs\" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LocalAppData%\Programs\node\" set "PATH=%LocalAppData%\Programs\node;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not on PATH.
  echo Install Node.js 18 LTS from https://nodejs.org/ then run this file again.
  echo After installing Node, log out and back in if this message persists.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js from https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo First run: installing dependencies...
  echo This may take a few minutes.
  call npm.cmd install
  if errorlevel 1 (
    echo npm install failed. On Windows you may need "Desktop development with C++" in Visual Studio Build Tools.
    pause
    exit /b 1
  )
)

echo.
echo ============================================
echo  Foundry Rejection Tracker
echo  http://localhost:5176
echo ============================================
echo.
echo Keep this window open while using the app.
echo Close this window to stop the server.
echo.

start "" "http://localhost:5176"
call npm.cmd run dev -- --host localhost --port 5176 --strictPort

if errorlevel 1 (
  echo.
  echo Could not start. Is port 5176 already in use?
  echo Stop any other copy of this app, then try again.
  pause
)

endlocal
