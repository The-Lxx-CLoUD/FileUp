# 🌐 FileUp Download and Installation Guide 🌐
**Developer:** TheLxxCLoUD
**Telegram:** [@lxxcloud](https://t.me/lxxcloud)
 
---
### Files:
 
| File | Platform | Size |
|---|---|---|
| `FileUp-3.0.1-Setup-en-x64.exe` | Windows 10/11 (64-bit) | ~80 MB |
| `FileUp-3.0.1-en-amd64.deb` | Linux (Debian/Ubuntu/Mint) | ~86 MB |
 
---
 
### 1️⃣ Step 1 — Download:
 
**Windows (4 parts)**
 
```
windows part's ⤵️
FileUp-3.1.0-Setup-en-x64.exe.fuppart.000
FileUp-3.1.0-Setup-en-x64.exe.fuppart.001
FileUp-3.1.0-Setup-en-x64.exe.fuppart.002
FileUp-3.1.0-Setup-en-x64.exe.fuppart.003
FileUp-3.1.0-Setup-en-x64.exe.fuppart.004
```
**Linux — deb (5 parts)**
 
```
Deb part's (linux) ⤵️
FileUp-3.1.0-amd64.deb.fuppart.000
FileUp-3.1.0-amd64.deb.fuppart.001
FileUp-3.1.0-amd64.deb.fuppart.002
FileUp-3.1.0-amd64.deb.fuppart.003
FileUp-3.1.0-amd64.deb.fuppart.004
```
 
### 2️⃣ Step 2 — Rejoin the Parts:
 
**💡 On Windows:**
1. Put all the exe parts in one folder.
2. Double-click `rejoin-windows.bat`
(run as administrator).
3. The file `FileUp-3.0.1-Setup-en-x64.exe` will be created.

**💡 On Linux:**
```bash
chmod +x rejoin-linux.sh
./rejoin-linux.sh
```
1. The file `FileUp-3.1.0-amd64.deb` will be created.
## 🌐 Installation:
 
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
 
# Uninstall:
sudo apt remove fileup
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
 
