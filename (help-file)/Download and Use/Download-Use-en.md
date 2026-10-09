# FileUp Download and Installation Guide — Version 3.0.1

**Developer:** TheLxxCLoUD
**Telegram:** [@lxxcloud](https://t.me/lxxcloud)

FileUp is a fast, modern file manager for Windows and Linux. This version (v3.0.1) includes a complete professional toolbox: ZIP archiving, file split/merge, AES-256 encryption, in-file text search, folder reports, snapshots, cleanup, and FTP/SFTP connectivity.

---

## Files

| File | Platform | Size |
|---|---|---|
| `FileUp-3.0.1-Setup-en-x64.exe` | Windows 10/11 (64-bit) | ~80 MB |
| `FileUp-3.0.1-en-amd64.deb` | Linux (Debian/Ubuntu/Mint) | ~86 MB |
| `FileUp-3.0.1-en-x86_64.AppImage` | Linux (all distributions) | ~110 MB |

All three files are **English**; inside the app you can switch the toolbox language to **Persian** from **Settings → Language**.

## What You'll See Inside the App

- **About** (gear button → About): developer name **TheLxxCLoUD** and Telegram link **@lxxcloud** — version 3.0.1
- **Tools** in the toolbar: all 8 professional tools
- Changing the language: **Settings → Language → Persian** (no restart required)

---

## Downloading in 20 MB Parts

If your internet connection is slow or large files give you trouble, use the 20 MB parts. All parts + the rejoin scripts + `MD5SUMS.txt` are inside the file `FileUp-v3.0.1-EN-20MB-parts.zip`.

### Step 1 — Download
Download and extract the ZIP file. The parts for each program are placed together:

**Windows (4 parts):**
```
FileUp-3.0.1-Setup-en-x64.exe.part00
FileUp-3.0.1-Setup-en-x64.exe.part01
FileUp-3.0.1-Setup-en-x64.exe.part02
FileUp-3.0.1-Setup-en-x64.exe.part03
```

**Linux — deb (5 parts) and AppImage (6 parts)**

### Step 2 — Rejoin the Parts

**On Windows:**
1. Put all the exe parts in one folder.
2. Double-click `rejoin-windows.bat`.
3. The file `FileUp-3.0.1-Setup-en-x64.exe` will be created.

**On Linux:**
```bash
chmod +x rejoin-linux.sh
./rejoin-linux.sh
```

> **Manual command (without the script):**
> - Windows (CMD): `copy /b "FileUp-3.0.1-Setup-en-x64.exe.part00"+"FileUp-3.0.1-Setup-en-x64.exe.part01"+"FileUp-3.0.1-Setup-en-x64.exe.part02"+"FileUp-3.0.1-Setup-en-x64.exe.part03" "FileUp-3.0.1-Setup-en-x64.exe"`
> - Linux: `cat FileUp-3.0.1-Setup-en-x64.exe.part* > FileUp-3.0.1-Setup-en-x64.exe`

### Step 3 — Verify Integrity (optional but recommended)

On Windows (CMD):
```cmd
certutil -hashfile "FileUp-3.0.1-Setup-en-x64.exe" MD5
```
On Linux:
```bash
md5sum FileUp-3.0.1-Setup-en-x64.exe
```
The result must match the value in `MD5SUMS.txt`:

```
bf58618963e798e3554a56cf56a9403c  FileUp-3.0.1-Setup-en-x64.exe
21efbe3bf837ff0c2e805ae8e06399da  FileUp-3.0.1-en-amd64.deb
ec8625616c5b44ff8364681d006c8263  FileUp-3.0.1-en-x86_64.AppImage
```

---

## Installation

### Windows
1. Double-click `FileUp-3.0.1-Setup-en-x64.exe`.
2. Accept the license (MIT) → choose the install folder (default: `%LOCALAPPDATA%\Programs\FileUp`) → Install.
3. A desktop shortcut and Start menu entry are created automatically.
4. If Windows SmartScreen shows a warning: **More info → Run anyway** (the app has no commercial digital signature; the code is open source and you can build it yourself).

### Linux — deb (Ubuntu / Debian / Mint)
```bash
sudo dpkg -i FileUp-3.0.1-en-amd64.deb
# If there is a dependency error:
sudo apt-get install -f
```
Uninstall: `sudo apt remove fileup`

### Linux — AppImage (all distributions)
```bash
chmod +x FileUp-3.0.1-en-x86_64.AppImage
./FileUp-3.0.1-en-x86_64.AppImage
```

---

## Features of Version 3.0.1

- **Tabs** — multiple folders in one window, with history
- **Live + deep search** — instant filtering and recursive search with glob support
- **In-file text search (new)** — Regex, case-sensitive, whole word; like grep
- **ZIP archives (new)** — create/extract/view contents with zip-slip protection
- **File split and merge (new)** — parts from 5 to 100 MB (default 20 MB) + ready-made rejoin scripts for Windows and Linux
- **File encryption (new)** — FENC1 format with AES-256-GCM and scrypt; the password cannot be recovered!
- **Folder report (new)** — file type statistics, largest files, empty folders
- **Folder snapshot (new)** — manifest + comparison + backup of changes
- **Cleanup (new)** — temporary/log/system junk files and empty folders
- **FTP / SFTP (new)** — browse, upload, download, create folders, and delete on the server
- 3-pass secure shredder, duplicate file finder, batch rename, MD5/SHA checksums, bookmarks, dark/light themes

## Technical Specifications

- Electron 33 · React 18 · Vite 5 · electron-builder 26
- Encryption: AES-256-GCM + scrypt (N=32768, maxmem 512MB)
- Windows installer signing: none (open source, MIT) — for a silent install: `Setup.exe /S`
- Windows per-user install: `%LOCALAPPDATA%\Programs\FileUp`
- Linux deb install: `/opt/FileUp`

---

© 2026 TheLxxCLoUD — MIT License · Telegram: [@lxxcloud](https://t.me/lxxcloud)
