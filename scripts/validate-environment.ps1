# Environment Validation Script
# Checks all prerequisites for Android development

param(
    [switch]$Verbose = $false,
    [switch]$Fix = $false
)

Write-Host "=== Development Environment Validation ===" -ForegroundColor Green
Write-Host ""

$validationResults = @()
$hasErrors = $false

# Function to add validation result
function Add-ValidationResult {
    param(
        [string]$Component,
        [bool]$IsValid,
        [string]$Message,
        [string]$Solution = ""
    )
    
    $script:validationResults += @{
        Component = $Component
        IsValid = $IsValid
        Message = $Message
        Solution = $Solution
    }
    
    if (-not $IsValid) {
        $script:hasErrors = $true
    }
}

# 1. Check Java Installation
Write-Host "Checking Java installation..." -ForegroundColor Cyan

if ($env:JAVA_HOME) {
    $javaExe = Join-Path $env:JAVA_HOME "bin\java.exe"
    if (Test-Path $javaExe) {
        try {
            $versionOutput = & $javaExe -version 2>&1
            if ($versionOutput -match 'version "(\d+)\.(\d+)\.(\d+)' -or $versionOutput -match 'version "1\.(\d+)\.(\d+)') {
                $versionLine = ($versionOutput | Select-String "version").ToString()
                
                # Check if version is 11+
                if ($versionOutput -match 'version "(\d+)' -and [int]$matches[1] -ge 11) {
                    Add-ValidationResult "Java" $true "✓ Java $versionLine found at $env:JAVA_HOME"
                } elseif ($versionOutput -match 'version "1\.(\d+)' -and [int]$matches[1] -ge 8) {
                    Add-ValidationResult "Java" $true "✓ Java $versionLine found at $env:JAVA_HOME"
                } else {
                    Add-ValidationResult "Java" $false "❌ Java version is too old: $versionLine" "Install Java 11 or higher"
                }
            } else {
                Add-ValidationResult "Java" $false "❌ Could not determine Java version" "Reinstall Java"
            }
        } catch {
            Add-ValidationResult "Java" $false "❌ Java executable found but not working" "Reinstall Java"
        }
    } else {
        Add-ValidationResult "Java" $false "❌ JAVA_HOME is set but java.exe not found" "Fix JAVA_HOME path or reinstall Java"
    }
} else {
    Add-ValidationResult "Java" $false "❌ JAVA_HOME not set" "Run .\scripts\detect-java.ps1 -SetEnvironment"
}

# 2. Check Node.js
Write-Host "Checking Node.js installation..." -ForegroundColor Cyan

try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Add-ValidationResult "Node.js" $true "✓ Node.js $nodeVersion found"
    } else {
        Add-ValidationResult "Node.js" $false "❌ Node.js not found" "Install Node.js from https://nodejs.org/"
    }
} catch {
    Add-ValidationResult "Node.js" $false "❌ Node.js not found" "Install Node.js from https://nodejs.org/"
}

# 3. Check npm/yarn
Write-Host "Checking package manager..." -ForegroundColor Cyan

try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Add-ValidationResult "npm" $true "✓ npm $npmVersion found"
    } else {
        Add-ValidationResult "npm" $false "❌ npm not found" "Install npm (usually comes with Node.js)"
    }
} catch {
    Add-ValidationResult "npm" $false "❌ npm not found" "Install npm (usually comes with Node.js)"
}

# 4. Check Expo CLI
Write-Host "Checking Expo CLI..." -ForegroundColor Cyan

try {
    $expoVersion = npx expo --version 2>$null
    if ($expoVersion) {
        Add-ValidationResult "Expo CLI" $true "✓ Expo CLI $expoVersion found"
    } else {
        Add-ValidationResult "Expo CLI" $false "❌ Expo CLI not found" "Install with: npm install -g @expo/cli"
    }
} catch {
    Add-ValidationResult "Expo CLI" $false "❌ Expo CLI not found" "Install with: npm install -g @expo/cli"
}

# 5. Check Android SDK (if ANDROID_HOME is set)
Write-Host "Checking Android SDK..." -ForegroundColor Cyan

if ($env:ANDROID_HOME -or $env:ANDROID_SDK_ROOT) {
    $androidHome = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { $env:ANDROID_SDK_ROOT }
    $adbPath = Join-Path $androidHome "platform-tools\adb.exe"
    
    if (Test-Path $adbPath) {
        Add-ValidationResult "Android SDK" $true "✓ Android SDK found at $androidHome"
    } else {
        Add-ValidationResult "Android SDK" $false "❌ Android SDK path set but adb not found" "Install Android SDK or fix ANDROID_HOME"
    }
} else {
    Add-ValidationResult "Android SDK" $false "⚠ ANDROID_HOME not set (optional for Expo Go)" "Install Android Studio or set ANDROID_HOME"
}

# 6. Check project dependencies
Write-Host "Checking project dependencies..." -ForegroundColor Cyan

if (Test-Path "package.json") {
    if (Test-Path "node_modules") {
        Add-ValidationResult "Dependencies" $true "✓ Project dependencies installed"
    } else {
        Add-ValidationResult "Dependencies" $false "❌ Project dependencies not installed" "Run: npm install"
    }
} else {
    Add-ValidationResult "Dependencies" $false "❌ package.json not found" "Run this script from project root"
}

# Display results
Write-Host ""
Write-Host "=== Validation Results ===" -ForegroundColor Green
Write-Host ""

foreach ($result in $validationResults) {
    if ($result.IsValid) {
        Write-Host $result.Message -ForegroundColor Green
    } else {
        Write-Host $result.Message -ForegroundColor Red
        if ($result.Solution) {
            Write-Host "  Solution: $($result.Solution)" -ForegroundColor Yellow
        }
    }
}

# Auto-fix option
if ($Fix -and $hasErrors) {
    Write-Host ""
    Write-Host "=== Auto-Fix Attempt ===" -ForegroundColor Cyan
    
    # Try to fix Java if it's the issue
    $javaResult = $validationResults | Where-Object { $_.Component -eq "Java" -and -not $_.IsValid }
    if ($javaResult) {
        Write-Host "Attempting to fix Java configuration..." -ForegroundColor Yellow
        try {
            & "$PSScriptRoot\detect-java.ps1" -SetEnvironment
            Write-Host "Java fix attempted. Please restart terminal and run validation again." -ForegroundColor Green
        } catch {
            Write-Host "Auto-fix failed. Please fix manually." -ForegroundColor Red
        }
    }
    
    # Try to install dependencies if missing
    $depsResult = $validationResults | Where-Object { $_.Component -eq "Dependencies" -and -not $_.IsValid }
    if ($depsResult -and (Test-Path "package.json")) {
        Write-Host "Installing project dependencies..." -ForegroundColor Yellow
        try {
            npm install
            Write-Host "Dependencies installed successfully." -ForegroundColor Green
        } catch {
            Write-Host "Failed to install dependencies. Please run 'npm install' manually." -ForegroundColor Red
        }
    }
}

# Summary
Write-Host ""
if ($hasErrors) {
    Write-Host "❌ Environment validation failed. Please fix the issues above." -ForegroundColor Red
    Write-Host "Run with -Fix flag to attempt automatic fixes: .\scripts\validate-environment.ps1 -Fix" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ All environment checks passed! You're ready for development." -ForegroundColor Green
    exit 0
}