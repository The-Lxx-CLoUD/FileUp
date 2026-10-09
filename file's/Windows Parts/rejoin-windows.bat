@echo off
title FileUp 20MB Rejoin
rem ==============================================================
rem  FileUp v3.1.0 - Rejoin 20MB split parts (Windows)
rem  HOW TO USE: keep this .bat in the SAME folder as the
rem  .fuppart.xxx files, then simply DOUBLE-CLICK it.
rem  (drag && drop of a part onto this .bat also works)
rem ==============================================================
setlocal enabledelayedexpansion

set "DIR=%~dp0"
if not "%~1"=="" set "DIR=%~dp1"

if not exist "%DIR%*.fuppart.000" (
  echo.
  echo  [ERROR] No .fuppart.000 file was found in: %DIR%
  echo.
  echo  1. EXTRACT the ZIP file first  ^(right-click ^> Extract All^)
  echo  2. Keep this rejoin-windows.bat in the SAME folder as the parts
  echo  3. Double-click rejoin-windows.bat again
  echo.
  pause
  exit /b 1
)

pushd "%DIR%"
set "FOUND=0"
for /f "delims=" %%S in ('dir /b /o:n "*.fuppart.000" 2^>nul') do call :JOIN "%%S"
popd

if "!FOUND!"=="0" (
  echo  [ERROR] Nothing was joined - unexpected error.
  pause
  exit /b 1
)

echo.
echo  Done. You can close this window.
pause
exit /b 0

:JOIN
set "FIRST=%~1"
set "BASE=!FIRST:.fuppart.000=!"
echo.
echo  Joining : !BASE!
echo  Folder  : !CD!
echo  Parts   :
for /f "delims=" %%F in ('dir /b /o:n "!BASE!.fuppart.*" 2^>nul') do echo    %%F
echo.

set "LIST="
for /f "delims=" %%F in ('dir /b /o:n "!BASE!.fuppart.*" 2^>nul') do (
  if defined LIST (
    set "LIST=!LIST!+"%%F""
  ) else (
    set "LIST="%%F""
  )
)
if not defined LIST (
  echo  [ERROR] No parts found for !BASE!
  goto :eof
)

copy /b /y %LIST% "!BASE!" > nul
if errorlevel 1 (
  echo  [ERROR] Join failed for !BASE!
  echo  Tip: move the whole folder to your Desktop and try again.
  goto :eof
)

set "EXPECTED="
if /i "!BASE!"=="FileUp-3.1.0-Setup-en-x64.exe" set "EXPECTED=e540cdc6a5b07a7e3af9097960cb7f7a"
if /i "!BASE!"=="FileUp-3.1.0-amd64.deb" set "EXPECTED=15daa1dc5429935fabfb5f6558c853a1"
if /i "!BASE!"=="FileUp-3.1.0-x86_64.AppImage" set "EXPECTED=b0018f91980609a5f231da93a36d3343"

if not defined EXPECTED (
  echo  [OK] Joined: !BASE!   ^(no reference MD5 for this set - check skipped^)
  set /a FOUND+=1
  goto :eof
)

set "GOT="
for /f "skip=1 delims=" %%H in ('certutil -hashfile "!BASE!" MD5 2^>nul') do (
  if not defined GOT set "GOT=%%H"
)
if not defined GOT (
  echo  [INFO] certutil unavailable - MD5 verification skipped.
  set /a FOUND+=1
  goto :eof
)
set "GOT=!GOT: =!"
if /i "!GOT!"=="!EXPECTED!" (
  echo  [OK] MD5 verified: !GOT!
  echo  File created: !CD!\!BASE!
) else (
  echo  [WARNING] MD5 mismatch for !BASE!
  echo   got     : !GOT!
  echo   expected: !EXPECTED!
  echo  Some parts are missing or corrupted - re-download them.
)
set /a FOUND+=1
goto :eof
