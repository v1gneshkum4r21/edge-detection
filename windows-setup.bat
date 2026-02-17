@echo off
setlocal enabledelayedexpansion

echo =======================================
echo    EdgeVision Pro Windows Setup
echo =======================================

:: 1. Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python is not installed or not in PATH.
    echo [*] Please download it from https://www.python.org/
    pause
    exit /b
) else (
    echo [OK] Python is installed.
)

:: 2. Check for Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Node.js is not installed.
    echo [*] Please download it from https://nodejs.org/
    pause
    exit /b
) else (
    echo [OK] Node.js is installed.
)

:: 3. Backend Setup
echo.
echo [*] Setting up Backend Virtual Environment...
if not exist "backend\venv" (
    python -m venv backend\venv
)

echo [*] Installing Backend Dependencies...
call backend\venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r backend\requirements.txt

:: 4. Frontend Setup
echo.
echo [*] Installing Frontend Dependencies...
cd frontend
call npm install
cd ..

:: 5. Launching
echo.
echo =======================================
echo    All ready! Launching Servers...
echo =======================================
echo [*] Backend will run at http://localhost:8000
echo [*] Frontend will run at http://localhost:5173
echo.

:: Launch Backend in a new window
echo [*] Starting Backend...
start "EdgeVision Backend" cmd /k "cd backend && venv\Scripts\activate.bat && python main.py"

:: Launch Frontend in a new window
echo [*] Starting Frontend...
start "EdgeVision Frontend" cmd /k "cd frontend && npm run dev -- --host 0.0.0.0"

echo.
echo [✓] Both servers are starting in separate windows.
echo [✓] You can close this window now.
pause
