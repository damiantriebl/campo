# Java Setup Troubleshooting Guide

This guide helps resolve common Java environment issues for Android development with Expo.

## Quick Fix

Run our automated Java detection script:

```bash
# PowerShell (Recommended)
.\scripts\detect-java.ps1 -SetEnvironment

# Command Prompt
.\scripts\setup-java.bat

# Validate your setup
.\scripts\validate-environment.ps1
```

## Common Issues and Solutions

### 1. JAVA_HOME Not Set

**Error Messages:**
- `JAVA_HOME is not set and no 'java' command could be found`
- `Could not find or load main class`
- `The system cannot find the path specified`

**Solution:**

1. **Automatic Fix:**
   ```bash
   .\scripts\detect-java.ps1 -SetEnvironment
   ```

2. **Manual Fix:**
   - Find your Java installation (usually in `C:\Program Files\Java\`)
   - Set JAVA_HOME environment variable:
     - Windows 10/11: Settings → System → About → Advanced system settings → Environment Variables
     - Add User Variable: `JAVA_HOME` = `C:\Program Files\Java\jdk-17.0.1` (your path)
     - Add to PATH: `%JAVA_HOME%\bin`

### 2. Java Version Incompatibility

**Error Messages:**
- `Android Gradle plugin requires Java 11 to run`
- `Unsupported class file major version`

**Current Requirements:**
- **Minimum:** Java 11
- **Recommended:** Java 17 LTS
- **Maximum:** Java 19 (some tools may not support newer versions)

**Solution:**

1. **Check your Java version:**
   ```bash
   java -version
   ```

2. **Install compatible Java version:**
   - **Oracle JDK:** https://www.oracle.com/java/technologies/downloads/
   - **OpenJDK:** https://openjdk.org/install/
   - **Eclipse Adoptium (Recommended):** https://adoptium.net/
   - **Amazon Corretto:** https://aws.amazon.com/corretto/

3. **Multiple Java versions:**
   If you have multiple Java versions, ensure JAVA_HOME points to Java 11+:
   ```bash
   .\scripts\detect-java.ps1 -Verbose
   ```

### 3. Java Not Found Despite Installation

**Symptoms:**
- Java is installed but not detected
- `'java' is not recognized as an internal or external command`

**Common Causes:**
- Java not in PATH
- Incorrect JAVA_HOME path
- Spaces in installation path not properly handled

**Solution:**

1. **Verify Java installation:**
   ```bash
   # Check common locations
   dir "C:\Program Files\Java\"
   dir "C:\Program Files (x86)\Java\"
   ```

2. **Fix PATH issues:**
   ```bash
   # Add Java to PATH temporarily
   set PATH=%JAVA_HOME%\bin;%PATH%
   
   # Test
   java -version
   ```

3. **Handle spaces in paths:**
   If Java is installed in a path with spaces, ensure JAVA_HOME is properly quoted:
   ```bash
   set JAVA_HOME="C:\Program Files\Java\jdk-17.0.1"
   ```

### 4. Permission Issues

**Error Messages:**
- `Access is denied`
- `Cannot set environment variable`

**Solution:**

1. **Run as Administrator:**
   - Right-click Command Prompt or PowerShell
   - Select "Run as administrator"
   - Run the setup script again

2. **User vs System variables:**
   - Set as User variables if you don't have admin rights
   - System variables require administrator privileges

### 5. Android Gradle Build Failures

**Error Messages:**
- `Could not determine the dependencies of task ':app:compileDebugJavaWithJavac'`
- `Execution failed for task ':app:mergeDebugResources'`

**Solution:**

1. **Clean and rebuild:**
   ```bash
   cd android
   .\gradlew clean
   cd ..
   npx expo run:android
   ```

2. **Check Gradle wrapper:**
   ```bash
   cd android
   .\gradlew --version
   ```

3. **Update Gradle if needed:**
   Edit `android/gradle/wrapper/gradle-wrapper.properties`

### 6. Multiple Java Installations Conflict

**Symptoms:**
- Different Java versions reported by different commands
- Inconsistent behavior between tools

**Solution:**

1. **List all Java installations:**
   ```bash
   .\scripts\detect-java.ps1 -Verbose
   ```

2. **Choose the best version:**
   - Prefer Java 17 LTS for stability
   - Ensure it's Java 11 or higher
   - Use the same version across all tools

3. **Clean up old installations:**
   - Uninstall unused Java versions
   - Update JAVA_HOME to point to the preferred version

## Environment-Specific Issues

### Windows Subsystem for Linux (WSL)

If using WSL, Java setup is different:

```bash
# Install Java in WSL
sudo apt update
sudo apt install openjdk-17-jdk

# Set JAVA_HOME in WSL
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
source ~/.bashrc
```

### Corporate/Enterprise Environments

**Common restrictions:**
- Limited installation permissions
- Proxy/firewall restrictions
- Specific Java versions required

**Solutions:**
- Use portable Java distributions
- Request IT support for Java installation
- Use organization-approved Java versions

## Verification Steps

After fixing Java issues, verify your setup:

1. **Run validation script:**
   ```bash
   .\scripts\validate-environment.ps1
   ```

2. **Test Java directly:**
   ```bash
   java -version
   javac -version
   echo %JAVA_HOME%
   ```

3. **Test Android build:**
   ```bash
   npx expo run:android
   ```

## Advanced Troubleshooting

### Enable Detailed Logging

For complex issues, enable verbose logging:

```bash
# Gradle verbose output
cd android
.\gradlew assembleDebug --info --stacktrace

# Expo verbose output
npx expo run:android --verbose
```

### Check Environment Variables

```bash
# PowerShell
Get-ChildItem Env: | Where-Object Name -like "*JAVA*"
Get-ChildItem Env: | Where-Object Name -like "*ANDROID*"

# Command Prompt
set | findstr JAVA
set | findstr ANDROID
```

### Reset Environment

If all else fails, reset your Java environment:

1. **Remove all Java-related environment variables**
2. **Uninstall all Java versions**
3. **Install fresh Java 17 LTS**
4. **Run setup script**

## Getting Help

If you're still having issues:

1. **Run diagnostic script:**
   ```bash
   .\scripts\validate-environment.ps1 -Verbose
   ```

2. **Collect information:**
   - Operating system version
   - Java version and installation path
   - Error messages (full text)
   - Steps that led to the error

3. **Common support resources:**
   - Expo documentation: https://docs.expo.dev/
   - React Native troubleshooting: https://reactnative.dev/docs/troubleshooting
   - Stack Overflow: Search for specific error messages

## Prevention

To avoid future Java issues:

1. **Use LTS versions:** Stick to Java 17 LTS for stability
2. **Avoid multiple installations:** Keep only one Java version if possible
3. **Regular validation:** Run validation script periodically
4. **Document your setup:** Keep notes on your specific configuration

## Quick Reference

### Essential Commands

```bash
# Check Java version
java -version

# Check JAVA_HOME
echo %JAVA_HOME%

# Auto-setup Java
.\scripts\detect-java.ps1 -SetEnvironment

# Validate environment
.\scripts\validate-environment.ps1

# Test Android build
npx expo run:android
```

### Environment Variables

- **JAVA_HOME:** Path to Java installation directory
- **PATH:** Must include `%JAVA_HOME%\bin`
- **ANDROID_HOME:** Path to Android SDK (optional for Expo Go)

### File Locations

- **Scripts:** `.\scripts\`
- **Java installations:** `C:\Program Files\Java\`
- **Android SDK:** `%LOCALAPPDATA%\Android\Sdk\`