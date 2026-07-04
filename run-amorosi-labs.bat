@echo off
setlocal enabledelayedexpansion

:: ============================================================================
::  Amorosi Labs / jpamorosi.os - Windows Run Harness
:: ----------------------------------------------------------------------------
::  Usage:
::    run-amorosi-labs.bat            (defaults to: dev)
::    run-amorosi-labs.bat dev
::    run-amorosi-labs.bat build
::    run-amorosi-labs.bat test
::    run-amorosi-labs.bat check
::    run-amorosi-labs.bat docker-up
::    run-amorosi-labs.bat docker-down
:: ============================================================================

title Amorosi Labs - Run Harness
color 0B

:: Normalize working directory to the repo root (folder of this script).
cd /d "%~dp0"
set "REPO_ROOT=%~dp0"
set "FRONTEND=%REPO_ROOT%frontend-app"

set "CMD=%~1"
if "%CMD%"=="" set "CMD=dev"

echo.
echo ============================================================
echo  Amorosi Labs harness - command: %CMD%
echo  Repo root: %REPO_ROOT%
echo ============================================================
echo.

:: ---------------------------------------------------------------------------
:: [1/6] Project structure
:: ---------------------------------------------------------------------------
echo [1/6] Verifying project structure...
if not exist "%FRONTEND%" (
    echo [ERROR] frontend-app not found next to this script.
    goto :fail
)
if not exist "%FRONTEND%\package.json" (
    echo [ERROR] frontend-app\package.json not found.
    goto :fail
)
echo       OK

:: ---------------------------------------------------------------------------
:: [2/6] Node.js >= 18
:: ---------------------------------------------------------------------------
echo [2/6] Verifying Node.js ^>= 18...
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install Node 18+ from https://nodejs.org
    goto :fail
)
for /f "tokens=1 delims=." %%a in ('node -v') do set "NODE_MAJOR=%%a"
set "NODE_MAJOR=%NODE_MAJOR:v=%"
if %NODE_MAJOR% LSS 18 (
    echo [ERROR] Node 18+ required. Detected:
    node -v
    goto :fail
)
echo       Node OK ^(major %NODE_MAJOR%^)

:: ---------------------------------------------------------------------------
:: [3/6] pnpm (via corepack if needed)
:: ---------------------------------------------------------------------------
echo [3/6] Verifying pnpm...
where pnpm >nul 2>nul
if errorlevel 1 (
    echo       pnpm not found. Trying corepack...
    call corepack enable >nul 2>nul
    call corepack prepare pnpm@latest --activate >nul 2>nul
    where pnpm >nul 2>nul
    if errorlevel 1 (
        echo [ERROR] pnpm still not available.
        echo         Enable it manually:
        echo             corepack enable
        echo             corepack prepare pnpm@latest --activate
        echo         Or install: npm install -g pnpm
        goto :fail
    )
)
echo       pnpm OK

:: ---------------------------------------------------------------------------
:: [4/6] Python venv (optional)
:: ---------------------------------------------------------------------------
echo [4/6] Checking Python tooling...
where python >nul 2>nul
if errorlevel 1 (
    echo       [WARN] Python not found - skipping venv setup, continuing with frontend only.
) else (
    if exist "%REPO_ROOT%requirements.txt" (
        if not exist "%REPO_ROOT%.venv" (
            echo       Creating virtual environment .venv ...
            python -m venv "%REPO_ROOT%.venv"
        )
        call "%REPO_ROOT%.venv\Scripts\activate.bat"
        echo       Upgrading pip and installing requirements.txt ...
        python -m pip install --upgrade pip
        python -m pip install -r "%REPO_ROOT%requirements.txt"
    ) else (
        echo       No requirements.txt at repo root - skipping venv.
    )
)

:: ---------------------------------------------------------------------------
:: [5/6] Dependencies
:: ---------------------------------------------------------------------------
echo [5/6] Ensuring frontend dependencies...
cd /d "%FRONTEND%"
if not exist "node_modules" (
    echo       node_modules missing - running pnpm install ...
    call pnpm install
    if errorlevel 1 goto :fail
) else (
    echo       node_modules present.
)

:: ---------------------------------------------------------------------------
:: [6/6] Dispatch command
:: ---------------------------------------------------------------------------
echo [6/6] Running command: %CMD%
echo.

if /i "%CMD%"=="dev"          goto :run_dev
if /i "%CMD%"=="build"        goto :run_build
if /i "%CMD%"=="test"         goto :run_test
if /i "%CMD%"=="check"        goto :run_check
if /i "%CMD%"=="docker-up"    goto :run_docker_up
if /i "%CMD%"=="docker-down"  goto :run_docker_down
if /i "%CMD%"=="backend-up"   goto :run_backend_up
if /i "%CMD%"=="backend-down" goto :run_backend_down

echo [ERROR] Unknown command: %CMD%
echo         Valid: dev ^| build ^| test ^| check ^| docker-up ^| docker-down ^| backend-up ^| backend-down
goto :fail

:run_dev
echo ==== DEV SERVER (http://localhost:3000) ====
echo   /      Amorosi Labs home
echo   /os    Preserved interactive OS
echo   /admin Backoffice (if ADMIN_ENABLED=true)
echo.
start "Amorosi Labs Browser" cmd /c "timeout /t 5 >nul & start http://localhost:3000"
call pnpm dev
if errorlevel 1 goto :fail
goto :done

:run_build
echo ==== BUILD ====
call pnpm build
if errorlevel 1 goto :fail
goto :done

:run_test
echo ==== TEST ====
call pnpm test run
if errorlevel 1 goto :fail
goto :done

:run_check
echo ==== CHECK (build + test) ====
call pnpm build
if errorlevel 1 goto :fail
call pnpm test run
if errorlevel 1 goto :fail
goto :done

:run_docker_up
echo ==== DOCKER UP (public web image, port 3000) ====
call :require_docker || goto :fail
cd /d "%REPO_ROOT%"
call docker compose up --build
if errorlevel 1 goto :fail
goto :done

:run_docker_down
echo ==== DOCKER DOWN ====
call :require_docker || goto :fail
cd /d "%REPO_ROOT%"
call docker compose down
if errorlevel 1 goto :fail
goto :done

:run_backend_up
echo ==== BACKEND EMULATOR UP (amorosi-backend, port 3001) ====
echo   Admin: http://localhost:3001/admin  (needs frontend-app\.env.docker.local)
call :require_docker || goto :fail
cd /d "%REPO_ROOT%"
call docker compose --profile backend up --build
if errorlevel 1 goto :fail
goto :done

:run_backend_down
echo ==== BACKEND EMULATOR DOWN ====
call :require_docker || goto :fail
cd /d "%REPO_ROOT%"
call docker compose --profile backend down
if errorlevel 1 goto :fail
goto :done

:: --- helper: verify docker + compose file, with a friendly message ----------
:require_docker
if not exist "%REPO_ROOT%docker-compose.yml" (
    echo [ERROR] docker-compose.yml not found at repo root.
    exit /b 1
)
where docker >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Docker CLI not found.
    echo         Install Docker Desktop and enable WSL integration, then retry:
    echo             https://docs.docker.com/desktop/wsl/
    echo         Run this .bat from Windows ^(PowerShell/CMD^), not inside WSL,
    echo         if the WSL distro cannot see Docker.
    exit /b 1
)
docker compose version >nul 2>nul
if errorlevel 1 (
    echo [ERROR] "docker compose" not available. Update Docker Desktop.
    exit /b 1
)
exit /b 0

:fail
echo.
echo ============================================================
echo  [FAILED] Command "%CMD%" did not complete successfully.
echo ============================================================
echo.
pause
exit /b 1

:done
echo.
echo ============================================================
echo  [OK] Command "%CMD%" finished.
echo ============================================================
echo.
pause
exit /b 0
