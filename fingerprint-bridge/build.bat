@echo off
setlocal enableextensions

rem Builds the DigitalPersona fingerprint bridge (FingerprintBridgeServer).
rem Targets JDK 1.6 (matches the DigitalPersona SDK's native bindings) -- no java.util.Base64
rem or java.nio.charset.StandardCharsets, a hand-rolled Base64Util is used instead.
rem
rem Optional environment variables:
rem   BRIDGE_JAVA_HOME - JDK install to use for this bridge (defaults to "C:\Program Files\Java\jdk1.6.0_45").
rem                      Separate from JAVA_HOME since that may point at a newer JDK used elsewhere.
rem   SDK_JAVA_PATH    - folder containing DPOTAPI.jar / DPFPEnrollment.jar / DPFPVerification.jar
rem                      (defaults to "C:\Program Files\DigitalPersona\Bin\Java")

set PACKAGE_NAME=FingerprintBridge
set SOURCE_PATH=%~dp0src
set BUILD_PATH=%~dp0build\classes
set DISTRO_PATH=%~dp0dist

if "%BRIDGE_JAVA_HOME%" == "" set BRIDGE_JAVA_HOME=C:\Program Files\Java\jdk1.6.0_45
if "%SDK_JAVA_PATH%" == "" set SDK_JAVA_PATH=C:\Program Files\DigitalPersona\Bin\Java

set SDK_CLASSPATH="%SDK_JAVA_PATH%\dpotjni.jar";"%SDK_JAVA_PATH%\dpotapi.jar";"%SDK_JAVA_PATH%\dpfpenrollment.jar";"%SDK_JAVA_PATH%\dpfpverification.jar"

if not exist "%SDK_JAVA_PATH%\dpotapi.jar" (
	echo ERROR: Cannot find the DigitalPersona Java SDK jars in "%SDK_JAVA_PATH%".
	echo Set SDK_JAVA_PATH to the folder containing dpotapi.jar, dpfpenrollment.jar, dpfpverification.jar and dpotjni.jar.
	exit /B 1
)

if exist "%BUILD_PATH%" rmdir /q /s "%BUILD_PATH%"
mkdir "%BUILD_PATH%"
if not exist "%DISTRO_PATH%" mkdir "%DISTRO_PATH%"

set JAVAC=javac
if not "%BRIDGE_JAVA_HOME%" == "" set JAVAC="%BRIDGE_JAVA_HOME%\bin\javac.exe"

del "%~dp0java_sources.lst" > nul 2>&1
for /R "%SOURCE_PATH%" %%f in (*.java) do call :reslash "%%f"

@echo on
%JAVAC% -nowarn -cp %SDK_CLASSPATH% -d "%BUILD_PATH%" @"%~dp0java_sources.lst"
@echo off
if errorlevel 1 exit /B 1

goto afterbuild

:reslash
set file=%~1
echo %file:\=/% >> "%~dp0java_sources.lst"
goto :EOF

:afterbuild

set JAR=jar
if not "%BRIDGE_JAVA_HOME%" == "" set JAR="%BRIDGE_JAVA_HOME%\bin\jar.exe"

@echo on
%JAR% -cmf "%~dp0manifest.mf" "%DISTRO_PATH%\%PACKAGE_NAME%.jar" -C "%BUILD_PATH%" .
@echo off
if errorlevel 1 exit /B 1

echo Built "%DISTRO_PATH%\%PACKAGE_NAME%.jar"
