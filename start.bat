@echo off
setlocal enabledelayedexpansion

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

echo ========================================
echo  Scrum Master Development Environment
echo ========================================

:: 1. Pre-flight requirement check
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is required but was not found.
    pause
    exit /b 1
)
echo [OK] Node.js detected

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is required but was not found.
    pause
    exit /b 1
)
echo [OK] npm detected

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is required but was not found.
    pause
    exit /b 1
)
echo [OK] Python detected

if not exist "%ROOT_DIR%frontend\package.json" (
    echo [ERROR] frontend\package.json is missing. Are you in the correct directory?
    pause
    exit /b 1
)

if not exist "%ROOT_DIR%backend\requirements.txt" (
    echo [ERROR] backend\requirements.txt is missing.
    pause
    exit /b 1
)

:: 2. Environment file check
if not exist "%ROOT_DIR%frontend\.env" (
    echo [ERROR] frontend\.env is missing.
    echo Please create it from frontend\.env.example
    pause
    exit /b 1
)
echo [OK] Frontend environment detected

if not exist "%ROOT_DIR%backend\.env" (
    echo [ERROR] backend\.env is missing.
    echo Please create it from backend\.env.example
    pause
    exit /b 1
)
echo [OK] Backend environment detected

:: 3. Frontend Dependencies
if not exist "%ROOT_DIR%frontend\node_modules\" (
    echo [INFO] frontend\node_modules missing. Running npm install...
    cd "%ROOT_DIR%frontend"
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    cd "%ROOT_DIR%"
)
echo [OK] Frontend dependencies ready

:: 4. Backend Virtual Environment
if not exist "%ROOT_DIR%backend\.venv\" (
    echo [INFO] backend\.venv missing. Creating virtual environment...
    cd "%ROOT_DIR%backend"
    python -m venv .venv
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to create Python virtual environment.
        pause
        exit /b 1
    )
    echo [INFO] Installing backend dependencies...
    ".venv\Scripts\python.exe" -m pip install -r requirements.txt
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install backend dependencies.
        pause
        exit /b 1
    )
    cd "%ROOT_DIR%"
)
echo [OK] Backend virtual environment ready

:: 5. Python Interpreter verification
cd "%ROOT_DIR%backend"
".venv\Scripts\python.exe" -c "import app.main" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Failed to import backend application. There may be a syntax or dependency error.
    pause
    exit /b 1
)
cd "%ROOT_DIR%"

:: 6. Backend Startup
echo Starting backend...
start "Scrum Master - Backend" cmd /c "cd /d "%ROOT_DIR%backend" && ".venv\Scripts\python.exe" -m uvicorn app.main:app --reload || pause"

:: Wait briefly
timeout /t 3 /nobreak >nul

:: 7. Frontend Startup
echo Starting frontend...
start "Scrum Master - Frontend" cmd /c "cd /d "%ROOT_DIR%frontend" && npm run dev || pause"

:: 10. Terminal Experience
echo.
echo ========================================
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:8000
echo  API Docs: http://localhost:8000/docs
echo ========================================
echo.
echo Press Ctrl+C in the respective windows to stop the servers.
