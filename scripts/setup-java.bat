@echo off
REM JAVA_HOME Setup Script for Windows
REM This batch file provides an alternative method to set up Java environment

echo === Java Environment Setup ===
echo.

REM Check if PowerShell is available
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo PowerShell is not available. Using manual setup...
    goto MANUAL_SETUP
)

echo Running Java detection script...
powershell -ExecutionPolicy Bypass -File "%~dp0detect-java.ps1" -SetEnvironment

if %errorlevel% equ 0 (
    echo.
    echo Java environment setup completed successfully!
    echo Please restart your terminal or IDE to use the new settings.
    goto END
)

:MANUAL_SETUP
echo.
echo === Manual Java Setup Required ===
echo.
echo Please follow these steps:
echo.
echo 1. Install Java 11 or higher from:
echo    - Oracle JDK: https://www.oracle.com/java/technologies/downloads/
echo    - OpenJDK: https://openjdk.org/install/
echo    - Eclipse Adoptium: https://adoptium.net/
echo.
echo 2. Find your Java installation directory (usually in Program Files\Java\)
echo.
echo 3. Set JAVA_HOME environment variable:
echo    - Open System Properties ^> Advanced ^> Environment Variables
echo    - Add new User variable: JAVA_HOME = C:\Program Files\Java\jdk-XX
echo    - Add %%JAVA_HOME%%\bin to your PATH variable
echo.
echo 4. Restart your terminal and verify with: java -version
echo.

:END
pause