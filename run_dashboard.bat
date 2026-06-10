@echo off
title Stocks & Whale Analytics Suite Launcher
echo ====================================================================
echo       STOCKS & WHALE ANALYTICS LAUNCHER (LOCAL DEV ENVIRONMENT)
echo ====================================================================
echo.

echo [1/2] Starting FastAPI Backend Server (Port: 8000)...
echo.
start "Stocks Backend API" cmd /k "set DATABASE_URL=sqlite:///./local.db&& uv run uvicorn backend.main:app --host 0.0.0.0 --reload"

echo [2/2] Starting React Vite Frontend (Port: 5173)...
echo.
start "Stocks Frontend App" cmd /k "cd frontend && npm run dev"

echo.
echo ====================================================================
echo Both servers have been launched in separate console windows!
echo.
echo - FastAPI Backend API  : http://0.0.0.0:8000
echo - Swagger API Docs     : http://0.0.0.0:8000/docs
echo - React Frontend App   : http://0.0.0.0:5173
echo ====================================================================
echo.
echo Press any key to close this launcher console window...
pause > nul
