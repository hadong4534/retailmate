@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   RetailMate Deploy  [main -^> retailmate.io]
echo ============================================
echo.

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set CURBR=%%b
if not "%CURBR%"=="main" (
  echo [WARNING] Current branch is "%CURBR%", not main.
  echo Please run first:  git checkout main
  echo.
  pause
  exit /b 1
)

echo [1/3] Staging changes...
git add -A

echo [2/3] Committing...
git commit -m "update via Claude"
if errorlevel 1 (
  echo.
  echo [INFO] Nothing to commit. Exiting.
  pause
  exit /b 0
)

echo [3/3] Pushing to GitHub main...
git push origin main
if errorlevel 1 (
  echo.
  echo [ERROR] Push failed. Check internet or git login.
  pause
  exit /b 1
)

echo.
echo ============================================
echo   Done! Vercel will auto-deploy.
echo   Live on retailmate.io in 1-2 minutes.
echo ============================================
pause
