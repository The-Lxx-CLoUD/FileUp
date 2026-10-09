#  🌐 راهنمای دانلود و نصب FileUp 🌐
**توسعه‌دهنده:** TheLxxCLoUD
**تلگرام:** [@lxxcloud](https://t.me/lxxcloud)



---
### فایل‌ها :

| فایل | پلتفرم | حجم |
|---|---|---|
| `FileUp-3.1.0-Setup-en-x64.exe` | ویندوز ۱۰/۱۱ (۶۴ بیتی) | ~۸۰ MB |
| `FileUp-3.1.0-en-amd64.deb` | لینوکس (Debian/Ubuntu/Mint) | ~۸۶ MB |


---

### 1️⃣ مرحله ۱ — دانلود :

**ویندوز (4 پارت)**

```
windows part's ⤵️
FileUp-3.1.0-Setup-en-x64.exe.fuppart.000
FileUp-3.1.0-Setup-en-x64.exe.fuppart.001
FileUp-3.1.0-Setup-en-x64.exe.fuppart.002
FileUp-3.1.0-Setup-en-x64.exe.fuppart.003
FileUp-3.1.0-Setup-en-x64.exe.fuppart.004
```
**لینوکس — deb (4 پارت)**

```
Deb part's (linux) ⤵️
FileUp-3.1.0-amd64.deb.fuppart.000
FileUp-3.1.0-amd64.deb.fuppart.001
FileUp-3.1.0-amd64.deb.fuppart.002
FileUp-3.1.0-amd64.deb.fuppart.003
FileUp-3.1.0-amd64.deb.fuppart.004
```

### 2️⃣ مرحله ۲ — ادغام پارت‌ها : 

**💡 در ویندوز:**
1. همه پارت‌های exe را در یک پوشه بگذارید.
2. روی `rejoin-windows.bat` دوبار کلیک کنید
(اجرا با دسترسی ادمین).
3. فایل `FileUp-3.1.0-Setup-en-x64.exe` ساخته می‌شود.

**💡 در لینوکس:**
```bash
chmod +x rejoin-linux.sh
./rejoin-linux.sh
```
1. فایل `FileUp-3.1.0-amd64.deb` ساخته می شود.





## 🌐 نصب : 

### ویندوز
1. روی `FileUp-3.1.0-Setup-en-x64.exe` دوبار کلیک کنید.
2. مجوز (MIT) را بپذیرید → پوشه نصب را انتخاب کنید (پیش‌فرض: `%LOCALAPPDATA%\Programs\FileUp`) → Install.
3. میانبر دسکتاپ و منوی استارت به‌طور خودکار ساخته می‌شود.
4. اگر ویندوز SmartScreen پیام داد: **More info ← Run anyway** (برنامه امضای دیجیتال تجاری ندارد؛ کد باز است و می‌توانید خودتان بسازید).

### لینوکس — deb (Ubuntu / Debian / Mint)
```bash
sudo dpkg -i FileUp-3.1.0-en-amd64.deb

# اگر خطای وابستگی بود :
sudo apt-get install -f

# حذف :
sudo apt remove fileup
```

---

## ویژگی‌های نسخه 3.1.0

- **زبانه‌ها** — چند پوشه در یک پنجره، با تاریخچه
- **جستجوی زنده + عمیق** — فیلتر فوری و جستجوی بازگشتی با پشتیبانی glob
- **جستجوی متن فایل‌ها (جدید)** — Regex، حساس به حروف، کل کلمه؛ مثل grep
- **آرشیو ZIP (جدید)** — ساخت/استخراج/مشاهده محتوا با محافظت zip-slip
- **تقسیم و ادغام فایل (جدید)** — پارت‌های ۵ تا ۱۰۰ مگ (پیش‌فرض ۲۰ مگ) + اسکریپت ادغام آماده برای ویندوز و لینوکس
- **رمزگذاری فایل (جدید)** — فرمت FENC1 با AES-256-GCM و scrypt؛ رمز عبور قابل بازیابی نیست!
- **گزارش پوشه (جدید)** — آمار نوع فایل‌ها، بزرگ‌ترین فایل‌ها، پوشه‌های خالی
- **اسنپ‌شات پوشه (جدید)** — مانیفست + مقایسه + پشتیبان‌گیری تغییرات
- **پاک‌سازی (جدید)** — فایل‌های موقت/لاگ/زباله سیستم و پوشه‌های خالی
- **FTP / SFTP (جدید)** — مرور، آپلود، دانلود، پوشه‌سازی و حذف روی سرور
- پاک‌سازی امن ۳ مرحله‌ای، یافتن فایل‌های تکراری، تغییر نام گروهی، چک‌سام MD5/SHA، نشانک‌ها، تم تیره/روشن

## مشخصات فنی

- Electron 33 · React 18 · Vite 5 · electron-builder 26
- رمزگذاری: AES-256-GCM + scrypt (N=32768, maxmem 512MB)
- امضای نصاب ویندوز: ندارد (کد باز، MIT) — برای نصب ساکت: `Setup.exe /S`
- نصب per-user ویندوز: `%LOCALAPPDATA%\Programs\FileUp`
- نصب deb لینوکس: `/opt/FileUp`

---

© 2026 TheLxxCLoUD — MIT License · Telegram: [@lxxcloud](https://t.me/lxxcloud)
