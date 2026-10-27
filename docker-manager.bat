@echo off
REM PUERTO VALLARTA TODAY - Docker Startup Script for Windows
REM This script helps you manage the Docker environment

setlocal enabledelayedexpansion

echo =====================================
echo   PUERTO VALLARTA TODAY - Docker Manager
echo =====================================
echo.

REM Check if .env exists
if not exist .env (
    echo No .env file found. Creating from .env.example...
    copy .env.example .env
    echo Created .env file. Please review and update the values.
    echo.
)

REM Parse command line argument
set "COMMAND=%~1"
if "%COMMAND%"=="" set "COMMAND=start"

if "%COMMAND%"=="start" goto START
if "%COMMAND%"=="stop" goto STOP
if "%COMMAND%"=="restart" goto RESTART
if "%COMMAND%"=="logs" goto LOGS
if "%COMMAND%"=="status" goto STATUS
if "%COMMAND%"=="clean" goto CLEAN
if "%COMMAND%"=="r2" goto R2
if "%COMMAND%"=="prod-deploy" goto PROD_DEPLOY
goto HELP

:START
echo Starting services...
docker-compose up -d --build
echo.
echo Services started!
echo.
echo Access the application at:
echo   Frontend: http://localhost
echo   Backend API: http://localhost:4000
echo   Database: localhost:3306
echo.
echo Use 'docker-compose logs -f' to view logs
goto END

:STOP
echo Stopping services...
docker-compose down
echo Services stopped
goto END

:RESTART
echo Restarting services...
docker-compose down
echo.
docker-compose up -d --build
echo.
echo Services restarted!
goto END

:LOGS
docker-compose logs -f
goto END

:STATUS
docker-compose ps
goto END

:CLEAN
echo Removing all containers, networks, and volumes...
docker-compose down -v
echo Cleanup complete
goto END

:R2
echo Starting local R2 via Wrangler...
cd r2-local
call npm install
call npm run dev
goto END

:PROD_DEPLOY
echo Running production-safe deployment sequence...
echo 1) Applying database migrations...
docker-compose -f docker-compose.prod.yml run --rm backend npx sequelize-cli db:migrate
if errorlevel 1 (
    echo Migration step failed. Aborting deployment.
    goto END
)
echo.
echo 2) Building and starting production services...
docker-compose -f docker-compose.prod.yml up -d --build
if errorlevel 1 (
    echo Production compose startup failed.
    goto END
)
echo.
echo 3) Showing backend logs for startup verification...
docker-compose -f docker-compose.prod.yml logs --tail=120 backend
goto END

:HELP
echo Usage: docker-manager.bat [command]
echo.
echo Commands:
echo   start   - Start all services (default)
echo   stop    - Stop all services
echo   restart - Restart all services
echo   logs    - Show logs (follow mode)
echo   status  - Show status of services
echo   clean   - Remove all containers and volumes
echo   r2      - Start local Cloudflare R2 (Wrangler)
echo   prod-deploy - Run migration-first production deployment sequence
goto END

:END
endlocal
