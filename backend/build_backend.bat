@echo off
echo ============================================
echo   AutoMind Backend Builder
echo ============================================
echo.

echo [1/5] Cleaning previous build artifacts...
if exist venv rmdir /s /q venv
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist backend.spec del /f backend.spec
echo       Done.
echo.

echo [2/5] Creating fresh virtual environment...
python -m venv venv
call venv\Scripts\activate.bat
echo       Done.
echo.

echo [3/5] Upgrading pip...
python -m pip install --upgrade pip --quiet
echo       Done.
echo.

echo [4/5] Installing ALL backend dependencies...
pip install -r requirements.txt
pip install pyinstaller
echo       Done.
echo.

echo [5/5] Building backend.exe with PyInstaller...
python -m PyInstaller ^
    --onefile ^
    --name backend ^
    --collect-all uvicorn ^
    --collect-all fastapi ^
    --collect-all sqlalchemy ^
    --collect-all langchain_ollama ^
    --collect-all langgraph ^
    --hidden-import=pandas ^
    --hidden-import=numpy ^
    --collect-all matplotlib ^
    --collect-all seaborn ^
    run.py
echo.

echo ============================================
echo   Build complete!
echo   Output: dist\backend.exe
echo ============================================
