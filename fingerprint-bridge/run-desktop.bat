@echo off
setlocal enableextensions

rem Runs the standalone desktop fingerprint enrollment tool (no browser/HTTP involved).
rem Requires build.bat to have been run first.

set MAIN_CLASS=com.digitalpersona.onetouch.bridge.EnrollDesktopApp
set DISTRO_PATH=%~dp0dist

if "%BRIDGE_JAVA_HOME%" == "" set BRIDGE_JAVA_HOME=C:\Program Files\Java\jdk1.6.0_45
if "%SDK_JAVA_PATH%" == "" set SDK_JAVA_PATH=C:\Program Files\DigitalPersona\Bin\Java
set SDK_CLASSPATH="%SDK_JAVA_PATH%\dpotjni.jar";"%SDK_JAVA_PATH%\dpotapi.jar";"%SDK_JAVA_PATH%\dpfpenrollment.jar";"%SDK_JAVA_PATH%\dpfpverification.jar"

set JAVA=java
if not "%BRIDGE_JAVA_HOME%" == "" set JAVA="%BRIDGE_JAVA_HOME%\bin\java.exe"

set NATIVE_LIB_PATH=%SDK_JAVA_PATH%;%SystemRoot%\System32;%SystemRoot%\SysWOW64

@echo on
%JAVA% -Djava.library.path="%NATIVE_LIB_PATH%" -Dfingerprint.scan.dir="%~dp0scanImages" -cp "%DISTRO_PATH%\FingerprintBridge.jar";%SDK_CLASSPATH% %MAIN_CLASS%
