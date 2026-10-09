const DICT = {
  en: {
    tools: 'Tools',
    tool_archive_create: 'ZIP: Create archive…',
    tool_archive_extract: 'ZIP: Extract archive…',
    tool_split: 'Split file into parts…',
    tool_join: 'Join parts back…',
    tool_encrypt: 'Encrypt file…',
    tool_decrypt: 'Decrypt file…',
    tool_grep: 'Content search (inside files)…',
    tool_report: 'Folder report…',
    tool_snap: 'Folder snapshots…',
    tool_cleanup: 'Cleanup manager…',
    tool_remote: 'Remote FTP / SFTP…',
    run: 'Run', cancel: 'Cancel', close: 'Close', browse: 'Browse…', ok: 'OK',
    create: 'Create', extract: 'Extract', split: 'Split', join: 'Join',
    encrypt: 'Encrypt', decrypt: 'Decrypt', search: 'Search', stop: 'Stop',
    scan: 'Scan', clean: 'Clean', connect: 'Connect', disconnect: 'Disconnect',
    download: 'Download', upload: 'Upload', refresh: 'Refresh',
    password: 'Password', confirm_password: 'Confirm password',
    file: 'File', folder: 'Folder', destination: 'Destination', source: 'Source',
    // about
    about_dev: 'Developed by',
    about_edition: 'Professional Edition',
    about_tg: 'Telegram',
    // settings
    language: 'Language',
    language_desc: 'Interface language for the toolbox (restart not required)'
  },
  fa: {
    tools: 'ابزارها',
    tool_archive_create: 'ZIP: ساخت آرشیو…',
    tool_archive_extract: 'ZIP: استخراج آرشیو…',
    tool_split: 'تقسیم فایل به پارت‌ها…',
    tool_join: 'ادغام مجدد پارت‌ها…',
    tool_encrypt: 'رمزگذاری فایل…',
    tool_decrypt: 'رمزگشایی فایل…',
    tool_grep: 'جستجو در متن فایل‌ها…',
    tool_report: 'گزارش پوشه…',
    tool_snap: 'اسنپ‌شات پوشه…',
    tool_cleanup: 'پاک‌سازی فایل‌های اضافی…',
    tool_remote: 'اتصال از راه دور FTP / SFTP…',
    run: 'اجرا', cancel: 'انصراف', close: 'بستن', browse: 'انتخاب…', ok: 'تأیید',
    create: 'ساخت', extract: 'استخراج', split: 'تقسیم', join: 'ادغام',
    encrypt: 'رمزگذاری', decrypt: 'رمزگشایی', search: 'جستجو', stop: 'توقف',
    scan: 'اسکن', clean: 'پاک‌سازی', connect: 'اتصال', disconnect: 'قطع اتصال',
    download: 'دانلود', upload: 'آپلود', refresh: 'بازخوانی',
    password: 'رمز عبور', confirm_password: 'تکرار رمز عبور',
    file: 'فایل', folder: 'پوشه', destination: 'مقصد', source: 'مبدأ',
    about_dev: 'توسعه‌دهنده',
    about_edition: 'نسخه حرفه‌ای',
    about_tg: 'تلگرام',
    language: 'زبان',
    language_desc: 'زبان رابط کاربری جعبه‌ابزار (نیازی به راه‌اندازی مجدد نیست)'
  }
};

export function isRtl(lang) { return lang === 'fa'; }

export function t(lang, key, vars) {
  let s = (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

export function makeT(lang) { return (key, vars) => t(lang, key, vars); }
