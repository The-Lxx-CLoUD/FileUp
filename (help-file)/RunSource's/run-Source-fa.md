## 🚀 اجرا از سورس

پیش‌نیاز: **Node.js 18+**

```bash
npm install
npm start
```

حالت توسعه (اتو-ریلود رندرر):

```bash
npm run dev
```

---

## 📦 ساخت نصب‌کننده‌ها

```bash
# ویندوز (NSIS + Portable) — روی ویندوز اجرا شود
npm run dist:win

# لینوکس (AppImage + deb)
npm run dist:linux

# هر دو
npm run dist
```

> 💡 بیلد ویندوز حتماً روی خود ویندوز اجرا شود تا آیکون و متادیتا به‌صورت کامل داخل `FileUp.exe` جاسازی شود. خروجی‌ها در پوشه `release/` قرار می‌گیرند.

### خروجی‌های آماده این مخزن

| فایل | پلتفرم | روش نصب |
|---|---|---|
| `FileUp-1.0.0-amd64.deb` | دبیان/اوبونتو | `sudo dpkg -i FileUp-1.0.0-amd64.deb` |
| `FileUp-1.0.0-win.zip` | ویندوز | استخراج و اجرای `FileUp.exe` |

---




