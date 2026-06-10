@echo off
title Stocks & Whale Analytics Suite Pipeline Tool
echo ====================================================================
echo       STOCKS ^& WHALE ANALYTICS SUITE - PIPELINE TOOL
echo ====================================================================
echo.

:: Load Supabase connection string from backend/.env if available
set DATABASE_URL_SUPABASE=
if exist backend\.env (
    for /f "usebackq tokens=1,* delims==" %%i in ("backend\.env") do (
        if "%%i"=="DATABASE_URL" (
            set DATABASE_URL_SUPABASE=%%j
        )
    )
)

:: If not found in .env, default to placeholder
if "%DATABASE_URL_SUPABASE%"=="" (
    set DATABASE_URL_SUPABASE=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres
)

echo Select database target:
echo [1] Local SQLite (local.db)
echo [2] Production Supabase (PostgreSQL)
echo.
set /p target="Enter database choice (1 or 2): "

if "%target%"=="2" (
    echo.
    echo [INFO] Target configured to Supabase PostgreSQL.
    set DATABASE_URL=%DATABASE_URL_SUPABASE%
) else (
    echo.
    echo [INFO] Target configured to local SQLite.
    set DATABASE_URL=
)
echo.

echo Select action to perform:
echo [1] Reset ^& Seed (Clears DB tables and loads local CSV files)
echo [2] Live Scrape (Scrapes live yfinance holders for target tickers)
echo [3] Full Cycle (Reset, Seed ^& then run Live Scrape)
echo.
set /p action="Enter action choice (1, 2, or 3): "
echo.
echo ====================================================================
echo.

:: Only prompt for scraper limit and mode if running scrape (choice 2 or 3)
if "%action%"=="1" goto run_action
set limit=all
set /p limit="Enter number of stocks to process [number or all, default: all]: "
set scraper_mode=weekly
set /p scraper_mode="Enter execution mode [weekly or daily, default: weekly]: "
echo.

:run_action
if "%action%"=="1" (
    echo [1/2] Dropping and recreating database schemas...
    uv run python -m backend.reset_db
    echo.
    echo [2/2] Seeding database from local consolidated CSV files...
    uv run python -c "from backend.db import SessionLocal; from backend.pipeline import import_local_data; db=SessionLocal(); print(import_local_data(db)); db.close()"
)

if "%action%"=="2" (
    echo [1/1] Running live yfinance scraping pipeline (limit=%limit%, mode=%scraper_mode%)...
    uv run python -m backend.pipeline %limit% %scraper_mode%
)

if "%action%"=="3" (
    echo [1/3] Dropping and recreating database schemas...
    uv run python -m backend.reset_db
    echo.
    echo [2/3] Seeding database from local consolidated CSV files...
    uv run python -c "from backend.db import SessionLocal; from backend.pipeline import import_local_data; db=SessionLocal(); print(import_local_data(db)); db.close()"
    echo.
    echo [3/3] Running live yfinance scraping pipeline (limit=%limit%, mode=%scraper_mode%)...
    uv run python -m backend.pipeline %limit% %scraper_mode%
)

echo.
echo ====================================================================
echo Task completed successfully!
echo ====================================================================
echo.
pause
