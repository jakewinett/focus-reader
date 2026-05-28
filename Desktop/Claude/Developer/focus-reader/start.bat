@echo off
:: Focus Reader — local launcher (Windows)
:: Downloads: https://github.com/your-org/focus-reader
:: Requires: Node.js 18+  ->  https://nodejs.org

echo.
echo   Focus Reader
echo   ------------

:: 1. Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo.
  echo   Node.js is required but not installed.
  echo   Download it at: https://nodejs.org
  echo.
  pause
  exit /b 1
)

:: 2. Install dependencies if node_modules is missing
if not exist "node_modules\" (
  echo.
  echo   Installing dependencies ^(one-time setup^)...
  call npm install --silent
)

:: 3. Build the app
echo.
echo   Building app...
call npm run build --silent

:: 4. Launch
echo.
echo   Focus Reader is running at: http://localhost:3000
echo   Open that URL in your browser.
echo   Press Ctrl+C to stop.
echo.

call npm run preview:local
