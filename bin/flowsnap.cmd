@ECHO off
GOTO start
:find_dp0
SET dp0=%~dp0
EXIT /b
:start
SETLOCAL
CALL :find_dp0

IF EXIST "%dp0%\..\resources\node.exe" (
  "%dp0%\..\resources\node.exe" "%dp0%\flowsnap.mjs" %*
) ELSE IF EXIST "%dp0%\node.exe" (
  "%dp0%\node.exe" "%dp0%\flowsnap.mjs" %*
) ELSE (
  node "%dp0%\flowsnap.mjs" %*
)
