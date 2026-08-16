@echo off
setlocal enableextensions

rem Runs the DigitalPersona fingerprint bridge. Requires build.bat to have been run first.
rem Usage: run.bat [port]
rem BRIDGE_JAVA_HOME defaults to "C:\Program Files\Java\jdk1.6.0_45" to match the native SDK bindings
rem (kept separate from JAVA_HOME, which may point at a newer JDK used elsewhere on this machine).

set MAIN_CLASS=com.digitalpersona.onetouch.bridge.FingerprintBridgeServer
set DISTRO_PATH=%~dp0dist
set PORT=%1
if "%PORT%" == "" set PORT=8091

if "%BRIDGE_JAVA_HOME%" == "" set BRIDGE_JAVA_HOME=C:\Program Files\Java\jdk1.6.0_45
if "%SDK_JAVA_PATH%" == "" set SDK_JAVA_PATH=C:\Program Files\DigitalPersona\Bin\Java
set SDK_CLASSPATH="%SDK_JAVA_PATH%\dpotjni.jar";"%SDK_JAVA_PATH%\dpotapi.jar";"%SDK_JAVA_PATH%\dpfpenrollment.jar";"%SDK_JAVA_PATH%\dpfpverification.jar"

set JAVA=java
if not "%BRIDGE_JAVA_HOME%" == "" set JAVA="%BRIDGE_JAVA_HOME%\bin\java.exe"

set PATH=%PATH%;%SDK_JAVA_PATH%

rem otdpfpjni.dll/otfxjni.dll/otmcjni.dll live in System32/SysWOW64, not Bin\Java -- must stay on java.library.path.
set NATIVE_LIB_PATH=%SDK_JAVA_PATH%;%SystemRoot%\System32;%SystemRoot%\SysWOW64

@echo on
%JAVA% -Djava.library.path="%NATIVE_LIB_PATH%" -Dfingerprint.scan.dir="%~dp0scanImages" -cp "%DISTRO_PATH%\FingerprintBridge.jar";%SDK_CLASSPATH% %MAIN_CLASS% %PORT%
