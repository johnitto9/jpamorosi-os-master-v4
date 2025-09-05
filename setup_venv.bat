@echo off
echo ========================================
echo Configurando entorno virtual Python para jpamorosi-os
echo ========================================

REM Verificar que Python esté instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no está instalado o no está en PATH
    echo Instale Python desde https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Crear entorno virtual
echo Creando entorno virtual...
python -m venv venv

REM Activar entorno virtual
echo Activando entorno virtual...
call venv\Scripts\activate.bat

REM Actualizar pip
echo Actualizando pip...
python -m pip install --upgrade pip

REM Instalar dependencias
echo Instalando dependencias desde requirements.txt...
pip install -r requirements.txt

echo.
echo ========================================
echo Entorno virtual configurado exitosamente!
echo ========================================
echo.
echo Para activar el entorno virtual en el futuro, ejecute:
echo   venv\Scripts\activate.bat
echo.
echo Para desactivar:
echo   deactivate
echo.
pause