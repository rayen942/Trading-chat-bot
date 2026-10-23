@echo off
REM ============================================================
REM  MoneyTrade AI - launcher
REM  Starts the Flask backend and opens the app in your browser.
REM  IMPORTANT: always use the app at http://localhost:5000
REM  Do NOT open index.html directly / with Live Server (causes 405).
REM ============================================================

cd /d "%~dp0"

echo Starting local AI (Ollama)...
REM Only launch a server if one isn't already listening on 11434.
curl -s -m 2 http://127.0.0.1:11434/api/tags >nul 2>&1
if errorlevel 1 (
    start "" /min cmd /c "ollama serve"
) else (
    echo   Ollama already running.
)

REM Wait (up to ~30s) until Ollama answers before starting Flask.
echo Waiting for Ollama to be ready...
for /l %%i in (1,1,30) do (
    curl -s -m 2 http://127.0.0.1:11434/api/tags >nul 2>&1
    if not errorlevel 1 goto ollama_ready
    timeout /t 1 >nul
)
echo   WARNING: Ollama did not respond in time; chat may fail until it loads.
:ollama_ready

echo Starting MoneyTrade AI backend...
echo Opening http://localhost:5000 in your browser...

REM Give the server a moment to boot, then open the browser.
start "" cmd /c "timeout /t 2 >nul & start http://localhost:5000"

python app.py

echo.
echo Server stopped. Press any key to close.
pause >nul
