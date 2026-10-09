## 🚀 Running from Source

Prerequisite: **Node.js 18+**

```bash
npm install
npm start
```

Development mode (renderer auto-reload):

```bash
npm run dev
```

---

## 📦 Building the Installers

```bash
# Windows (NSIS + Portable) — run on Windows
npm run dist:win

# Linux (AppImage + deb)
npm run dist:linux

# Both
npm run dist
```

> 💡 Be sure to run the Windows build on Windows itself so the icon and metadata are fully embedded in `FileUp.exe`. Output goes to the `release/` folder.

### Ready-made Outputs in This Repository

| File | Platform | How to install |
|---|---|---|
| `FileUp-1.0.0-amd64.deb` | Debian/Ubuntu | `sudo dpkg -i FileUp-1.0.0-amd64.deb` |
| `FileUp-1.0.0-win.zip` | Windows | Extract and run `FileUp.exe` |

---
