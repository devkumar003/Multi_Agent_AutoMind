@echo off
echo ==============================================
echo  AI Multi-Agent Problem Solver System
echo ==============================================

echo [1/2] Starting FastAPI Backend on Port 8000
start "AutoThink Backend" cmd /k "cd backend && uvicorn main:app --reload --port 8000"

echo [2/2] Starting React Vite Frontend...
start "AutoThink Frontend" cmd /k "cd frontend && npm run dev"

echo Waiting for servers to initialize...
timeout /nobreak /t 3 >nul

echo Opening in Browser...
start http://localhost:5173
