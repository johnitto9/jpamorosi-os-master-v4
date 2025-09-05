@echo off
setlocal enabledelayedexpansion

:: =================================================================
:: 🚀 jpamorosi.os - Launcher Automático
:: =================================================================
:: Este script verifica dependencias, instala si es necesario,
:: y levanta el servidor de desarrollo automáticamente
:: =================================================================

title jpamorosi.os - Launcher
color 0B

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                    🚀 jpamorosi.os                          ║
echo  ║                 Interactive CV Launcher                     ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

:: =================================================================
:: 1. VERIFICAR DIRECTORIO
:: =================================================================
echo [INFO] Verificando estructura del proyecto...

if not exist "frontend-app" (
    echo [ERROR] No se encontró el directorio 'frontend-app'
    echo [ERROR] Asegúrate de ejecutar este script desde la raíz del proyecto jpamorosi-os
    echo.
    echo Estructura esperada:
    echo   jpamorosi-os/
    echo   ├── frontend-app/
    echo   ├── start-jpamorosi-os.bat  ^<-- Este archivo
    echo   └── GUIA_LOCAL.md
    echo.
    pause
    exit /b 1
)

if not exist "frontend-app\package.json" (
    echo [ERROR] No se encontró package.json en frontend-app/
    echo [ERROR] El proyecto parece estar corrupto o incompleto
    pause
    exit /b 1
)

echo [OK] Estructura del proyecto verificada
echo.

:: =================================================================
:: 2. VERIFICAR NODE.JS
:: =================================================================
echo [INFO] Verificando Node.js...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no está instalado o no está en el PATH
    echo [ERROR] Por favor instala Node.js v18+ desde: https://nodejs.org/
    pause
    exit /b 1
)

:: Verificar versión de Node.js
for /f "tokens=1 delims=." %%a in ('node --version') do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% lss 18 (
    echo [ERROR] Node.js versión %NODE_MAJOR% detectada, pero se requiere v18+
    echo [ERROR] Por favor actualiza Node.js desde: https://nodejs.org/
    pause
    exit /b 1
)

for /f %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% detectado
echo.

:: =================================================================
:: 3. VERIFICAR/INSTALAR PNPM
:: =================================================================
echo [INFO] Verificando pnpm...

where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARN] pnpm no está instalado
    echo [INFO] Instalando pnpm globalmente...
    call npm install -g pnpm
    if %errorlevel% neq 0 (
        echo [ERROR] Falló la instalación de pnpm
        echo [INFO] Intentando usar npm como alternativa...
        set USE_NPM=1
    ) else (
        echo [OK] pnpm instalado exitosamente
    )
) else (
    for /f %%i in ('pnpm --version') do set PNPM_VERSION=%%i
    echo [OK] pnpm v!PNPM_VERSION! detectado
)

echo.

:: =================================================================
:: 4. NAVEGAR AL DIRECTORIO FRONTEND-APP
:: =================================================================
echo [INFO] Navegando a frontend-app...
cd frontend-app
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo acceder al directorio frontend-app
    pause
    exit /b 1
)

echo [OK] Ubicado en: %CD%
echo.

:: =================================================================
:: 5. VERIFICAR/INSTALAR DEPENDENCIAS
:: =================================================================
echo [INFO] Verificando dependencias...

if not exist "node_modules" (
    echo [WARN] node_modules no existe
    set NEED_INSTALL=1
) else (
    echo [INFO] node_modules existe, verificando integridad...
    
    :: Verificar si las dependencias principales existen
    if not exist "node_modules\next" set NEED_INSTALL=1
    if not exist "node_modules\react" set NEED_INSTALL=1
    if not exist "node_modules\typescript" set NEED_INSTALL=1
)

if defined NEED_INSTALL (
    echo [INFO] Instalando dependencias del proyecto...
    echo [INFO] Esto puede tomar unos minutos la primera vez...
    echo.
    
    if defined USE_NPM (
        call npm install
    ) else (
        call pnpm install
    )
    
    if %errorlevel% neq 0 (
        echo [ERROR] Falló la instalación de dependencias
        echo [ERROR] Verifica tu conexión a internet y vuelve a intentar
        pause
        exit /b 1
    )
    
    echo [OK] Dependencias instaladas exitosamente
) else (
    echo [OK] Dependencias ya están instaladas
)

echo.

:: =================================================================
:: 6. PREPARAR SERVIDOR (SALTEAR BUILD CHECK)
:: =================================================================
echo [INFO] Saltando verificación de build para acelerar inicio...
echo [INFO] El dev server detectará errores automáticamente

echo.

:: =================================================================
:: 7. MOSTRAR INFORMACIÓN ÚTIL
:: =================================================================
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                     🎮 INFORMACIÓN ÚTIL                     ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  🌐 URL Principal:     http://localhost:3000
echo  🔧 API Contact:       http://localhost:3000/api/contact  
echo  📱 PWA Manifest:      http://localhost:3000/manifest.webmanifest
echo.
echo  🚩 Flags disponibles:
echo     ?no3d=true         - Deshabilita efectos 3D
echo     ?density=500       - Reduce partículas 3D
echo     ?renderer=vue      - Usa renderer Vue (experimental)
echo.
echo  🎮 Controles del Desktop:
echo     • Clic en dock     - Abrir apps
echo     • Drag ventanas    - Mover ventanas  
echo     • Drag esquina     - Redimensionar
echo     • Botón rojo       - Cerrar ventana
echo     • Botón amarillo   - Minimizar
echo.
echo  🧪 Comandos de desarrollo:
echo     pnpm dev           - Servidor desarrollo
echo     pnpm build         - Build producción
echo     pnpm test          - Ejecutar tests
echo.

:: =================================================================
:: 8. LEVANTAR SERVIDOR DE DESARROLLO
:: =================================================================
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                🚀 INICIANDO SERVIDOR                        ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo [INFO] Iniciando servidor de desarrollo en una NUEVA VENTANA...

if defined USE_NPM (
  start "jpamorosi.os dev" cmd /k "npm run dev"
) else (
  start "jpamorosi.os dev" cmd /k "pnpm dev"
)

rem --- Pequeño delay para dar tiempo a que el servidor arranque
timeout /t 3 /nobreak >nul

echo [INFO] Abriendo http://localhost:3000 en el navegador...
start "" "http://localhost:3000"
echo.
echo [INFO] El servidor esta corriendo en la nueva ventana.
echo [INFO] Este launcher ya puede cerrarse.

:: Esperar que el servidor arranque y detectar puerto
echo [INFO] Esperando que el servidor arranque...
timeout /t 10 /nobreak >nul

:: Leer el archivo de salida para encontrar el puerto
set SERVER_PORT=3000
if exist server_output.txt (
    for /f "tokens=2 delims=:" %%a in ('findstr /c:"Local:" server_output.txt') do (
        set SERVER_URL=%%a
    )
)

:: Limpiar la URL y extraer puerto
if defined SERVER_URL (
    set SERVER_URL=%SERVER_URL: =%
    set SERVER_URL=%SERVER_URL:http://localhost=%
    set SERVER_PORT=%SERVER_URL%
)

:: Abrir navegador solo en el puerto correcto
echo [INFO] Abriendo navegador en puerto %SERVER_PORT%...
start "" "http://localhost:%SERVER_PORT%"

:: Mostrar servidor en primer plano
if defined USE_NPM (
    call npm run dev
) else (
    call pnpm dev
)

:: =================================================================
:: 9. CLEANUP AL SALIR
:: =================================================================
echo.
echo [INFO] Servidor detenido
echo [INFO] Presiona cualquier tecla para cerrar...
pause >nul