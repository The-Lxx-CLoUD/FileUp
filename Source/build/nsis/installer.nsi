; FileUp 3.0.1 — custom assisted NSIS installer (vendored, single-phase, no wine required)
; Compiled by electron-builder (native makensis on Linux) with a custom nsis.script.
; Available eb defines: APP_ID APP_GUID UNINSTALL_APP_KEY PRODUCT_NAME PRODUCT_FILENAME
;   APP_FILENAME APP_DESCRIPTION VERSION PROJECT_DIR BUILD_RESOURCES_DIR APP_PACKAGE_NAME
;   APP_64 APP_64_NAME APP_64_HASH APP_64_UNPACKED_SIZE ESTIMATED_SIZE COMPRESSION_METHOD
;   COMPRESS MUI_ICON MUI_UNICON SHORTCUT_NAME UNINSTALL_DISPLAY_NAME

Unicode true
ManifestDPIAware true
RequestExecutionLevel user

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!include "FileFunc.nsh"
; vendored copy with hardcoded English messages (no dependence on eb language plumbing)
!include "${PROJECT_DIR}/build/nsis/extractAppPackage.nsh"

Name "${PRODUCT_NAME} ${VERSION}"
BrandingText "FileUp ${VERSION} — TheLxxCLoUD"

; MUI_ICON / MUI_UNICON are provided by electron-builder via -D defines
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\${PRODUCT_FILENAME}.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Run ${PRODUCT_NAME}"

; --- pages (assisted installer, install dir selectable) ---
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${PROJECT_DIR}\build\license.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; --- per-user install location (matches electron-builder default) ---
InstallDir "$LOCALAPPDATA\Programs\${APP_FILENAME}"
InstallDirRegKey HKCU "Software\${APP_ID}" "InstallLocation"

ShowInstDetails show
ShowUnInstDetails show

; keep a single installer instance
!include "allowOnlyOneInstallerInstance.nsh"

; ============================ install ============================
Section "Install"
  SetOutPath "$INSTDIR"

  ; extract the packaged app (app-64.7z produced by electron-builder)
  !insertmacro extractEmbeddedAppPackage

  ; uninstaller (single-phase: written directly here — no wine step needed)
  WriteUninstaller "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe"

  ; --- registry: ARP entry ---
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "DisplayName" "${UNINSTALL_DISPLAY_NAME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "Publisher" "TheLxxCLoUD"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "DisplayIcon" "$INSTDIR\${PRODUCT_FILENAME}.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString" "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "QuietUninstallString" "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe /S"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "NoRepair" 1
  !ifdef ESTIMATED_SIZE
    WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "EstimatedSize" ${ESTIMATED_SIZE}
  !endif

  ; --- registry: app keys ---
  WriteRegStr HKCU "Software\${APP_ID}" "InstallLocation" "$INSTDIR"

  ; --- shortcuts (desktop + start menu) ---
  CreateDirectory "$SMPROGRAMS"
  CreateShortCut "$SMPROGRAMS\${SHORTCUT_NAME}.lnk" "$INSTDIR\${PRODUCT_FILENAME}.exe" "" "$INSTDIR\${PRODUCT_FILENAME}.exe" 0
  CreateShortCut "$DESKTOP\${SHORTCUT_NAME}.lnk" "$INSTDIR\${PRODUCT_FILENAME}.exe" "" "$INSTDIR\${PRODUCT_FILENAME}.exe" 0
SectionEnd

; ============================ uninstall ============================
Section "uninstall"
  ; remove shortcuts
  Delete "$SMPROGRAMS\${SHORTCUT_NAME}.lnk"
  Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"

  ; remove registry
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
  DeleteRegKey HKCU "Software\${APP_ID}"

  ; remove files — only wipe the folder if it really is the app folder
  ${if} $INSTDIR != ""
  ${andIf} ${FileExists} "$INSTDIR\${PRODUCT_FILENAME}.exe"
    ; never wipe a drive root
    StrCpy $R0 "$INSTDIR" 3
    ${if} $INSTDIR == $R0
      Delete "$INSTDIR\*.*"
    ${else}
      RMDir /r "$INSTDIR"
    ${endIf}
  ${endIf}
SectionEnd
