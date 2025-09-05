# Java Detection and JAVA_HOME Setup Script for Windows
# This script detects Java installations and sets up JAVA_HOME automatically

param(
    [switch]$SetEnvironment = $false,
    [switch]$Verbose = $false
)

Write-Host "=== Java Environment Detection Script ===" -ForegroundColor Green

# Function to check Java version
function Test-JavaVersion {
    param([string]$JavaPath)
    
    try {
        $versionOutput = & "$JavaPath" -version 2>&1
        if ($versionOutput -match 'version "(\d+)\.(\d+)\.(\d+)') {
            $majorVersion = [int]$matches[1]
            if ($majorVersion -ge 11) {
                return $true
            }
        } elseif ($versionOutput -match 'version "1\.(\d+)\.(\d+)') {
            $majorVersion = [int]$matches[1]
            if ($majorVersion -ge 8) {
                return $true
            }
        }
        return $false
    } catch {
        return $false
    }
}

# Function to get Java home from executable path
function Get-JavaHomeFromPath {
    param([string]$JavaExePath)
    
    $javaDir = Split-Path -Parent $JavaExePath
    if ($javaDir -match '\\bin$') {
        return Split-Path -Parent $javaDir
    }
    return $javaDir
}

# Check if JAVA_HOME is already set and valid
if ($env:JAVA_HOME) {
    $currentJavaPath = Join-Path $env:JAVA_HOME "bin\java.exe"
    if (Test-Path $currentJavaPath) {
        if (Test-JavaVersion $currentJavaPath) {
            Write-Host "✓ JAVA_HOME is already set and valid: $env:JAVA_HOME" -ForegroundColor Green
            Write-Host "✓ Java version is compatible (11+)" -ForegroundColor Green
            exit 0
        } else {
            Write-Host "⚠ JAVA_HOME is set but Java version is incompatible" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠ JAVA_HOME is set but java.exe not found at expected location" -ForegroundColor Yellow
    }
}

Write-Host "Searching for Java installations..." -ForegroundColor Cyan

# Common Java installation paths
$javaPaths = @(
    "${env:ProgramFiles}\Java\*\bin\java.exe",
    "${env:ProgramFiles(x86)}\Java\*\bin\java.exe",
    "${env:LOCALAPPDATA}\Programs\Java\*\bin\java.exe",
    "${env:ProgramFiles}\Eclipse Adoptium\*\bin\java.exe",
    "${env:ProgramFiles}\OpenJDK\*\bin\java.exe",
    "${env:ProgramFiles}\Amazon Corretto\*\bin\java.exe",
    "${env:ProgramFiles}\Microsoft\*\bin\java.exe"
)

$validJavaInstallations = @()

foreach ($pathPattern in $javaPaths) {
    $foundPaths = Get-ChildItem -Path $pathPattern -ErrorAction SilentlyContinue
    foreach ($javaExe in $foundPaths) {
        if (Test-JavaVersion $javaExe.FullName) {
            $javaHome = Get-JavaHomeFromPath $javaExe.FullName
            $validJavaInstallations += @{
                Path = $javaHome
                Executable = $javaExe.FullName
                Version = (& $javaExe.FullName -version 2>&1 | Select-String "version").ToString()
            }
            
            if ($Verbose) {
                Write-Host "Found valid Java: $javaHome" -ForegroundColor Green
            }
        }
    }
}

if ($validJavaInstallations.Count -eq 0) {
    Write-Host "❌ No compatible Java installation found (Java 11+ required)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Java 11 or higher from one of these sources:" -ForegroundColor Yellow
    Write-Host "- Oracle JDK: https://www.oracle.com/java/technologies/downloads/"
    Write-Host "- OpenJDK: https://openjdk.org/install/"
    Write-Host "- Eclipse Adoptium: https://adoptium.net/"
    Write-Host "- Amazon Corretto: https://aws.amazon.com/corretto/"
    Write-Host ""
    Write-Host "After installation, run this script again with -SetEnvironment flag"
    exit 1
}

# Select the best Java installation (prefer newer versions)
$selectedJava = $validJavaInstallations | Sort-Object Path -Descending | Select-Object -First 1

Write-Host "✓ Found $($validJavaInstallations.Count) compatible Java installation(s)" -ForegroundColor Green
Write-Host "Selected Java: $($selectedJava.Path)" -ForegroundColor Cyan
Write-Host "Version: $($selectedJava.Version)" -ForegroundColor Cyan

if ($SetEnvironment) {
    try {
        # Set JAVA_HOME for current session
        $env:JAVA_HOME = $selectedJava.Path
        
        # Set JAVA_HOME permanently for user
        [Environment]::SetEnvironmentVariable("JAVA_HOME", $selectedJava.Path, "User")
        
        # Update PATH to include Java bin directory
        $javaBinPath = Join-Path $selectedJava.Path "bin"
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
        
        if ($currentPath -notlike "*$javaBinPath*") {
            $newPath = "$javaBinPath;$currentPath"
            [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
            Write-Host "✓ Added Java bin directory to PATH" -ForegroundColor Green
        }
        
        Write-Host "✓ JAVA_HOME set to: $($selectedJava.Path)" -ForegroundColor Green
        Write-Host "✓ Environment variables updated successfully" -ForegroundColor Green
        Write-Host ""
        Write-Host "Please restart your terminal or IDE to use the new environment variables" -ForegroundColor Yellow
        
    } catch {
        Write-Host "❌ Failed to set environment variables: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "You may need to run this script as Administrator" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "To set JAVA_HOME automatically, run:" -ForegroundColor Yellow
    Write-Host "  .\scripts\detect-java.ps1 -SetEnvironment" -ForegroundColor White
    Write-Host ""
    Write-Host "Or set manually:" -ForegroundColor Yellow
    Write-Host "  set JAVA_HOME=$($selectedJava.Path)" -ForegroundColor White
}

Write-Host ""
Write-Host "=== Java Detection Complete ===" -ForegroundColor Green