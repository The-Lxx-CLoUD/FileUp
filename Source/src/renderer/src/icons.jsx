import React from 'react';

const S = ({ size = 18, children, viewBox = '0 0 24 24', ...rest }) => (
  <svg width={size} height={size} viewBox={viewBox} fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {children}
  </svg>
);

export const IBack = (p) => <S {...p}><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></S>;
export const IForward = (p) => <S {...p}><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></S>;
export const IUp = (p) => <S {...p}><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></S>;
export const IRefresh = (p) => <S {...p}><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></S>;
export const ISearch = (p) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></S>;
export const IList = (p) => <S {...p}><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3.5 6h.01" /><path d="M3.5 12h.01" /><path d="M3.5 18h.01" /></S>;
export const IGrid = (p) => <S {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></S>;
export const ISort = (p) => <S {...p}><path d="M3 6h13" /><path d="M3 12h9" /><path d="M3 18h6" /><path d="M17 8v10" /><path d="M14 15l3 3 3-3" /></S>;
export const INewFolder = (p) => <S {...p}><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /><path d="M12 10v6" /><path d="M9 13h6" /></S>;
export const INewFile = (p) => <S {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M12 12v6" /><path d="M9 15h6" /></S>;
export const IPaste = (p) => <S {...p}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11v6" /><path d="M9 14h6" /></S>;
export const ICopy = (p) => <S {...p}><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M5 16H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1" /></S>;
export const ICut = (p) => <S {...p}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.12 15.88" /><path d="M14.47 14.48L20 20" /><path d="M8.12 8.12L12 12" /></S>;
export const ITrash = (p) => <S {...p}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M10 11v6" /><path d="M14 11v6" /></S>;
export const IShred = (p) => <S {...p}><path d="M4 6h16" /><path d="M6 6v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" /><path d="M10 2h4" /><path d="M12 10v3" /><path d="M9.5 11.5l1 1.5" /><path d="M14.5 11.5l-1 1.5" /><path d="M12 17.5v.01" /></S>;
export const IRename = (p) => <S {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></S>;
export const IInfo = (p) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8h.01" /><path d="M12 11v5" /></S>;
export const IOpen = (p) => <S {...p}><path d="M15 3h6v6" /><path d="M10 14L21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></S>;
export const IEye = (p) => <S {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></S>;
export const IEyeOff = (p) => <S {...p}><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 8 10 8a13.2 13.2 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.39-1.61" /><path d="M2 2l20 20" /><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /></S>;
export const IPin = (p) => <S {...p}><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></S>;
export const IPlus = (p) => <S {...p}><path d="M12 5v14" /><path d="M5 12h14" /></S>;
export const IClose = (p) => <S {...p}><path d="M18 6L6 18" /><path d="M6 6l12 12" /></S>;
export const IChevron = (p) => <S {...p}><path d="M9 18l6-6-6-6" /></S>;
export const IChevronDown = (p) => <S {...p}><path d="M6 9l6 6 6-6" /></S>;
export const IFolder = (p) => <S {...p}><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></S>;
export const IHome = (p) => <S {...p}><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></S>;
export const IDesktop = (p) => <S {...p}><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></S>;
export const IDocs = (p) => <S {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h5" /></S>;
export const IDownload = (p) => <S {...p}><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 21h16" /></S>;
export const IMusic = (p) => <S {...p}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></S>;
export const IImage = (p) => <S {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></S>;
export const IVideo = (p) => <S {...p}><rect x="2" y="6" width="14" height="12" rx="2" /><path d="M22 8.5v7L16 12z" /></S>;
export const IDrive = (p) => <S {...p}><rect x="3" y="8" width="18" height="8" rx="2" /><path d="M6.5 12h.01" /><path d="M10 12h7" /><path d="M5 16l-1.5 4h17L19 16" /></S>;
export const ISettings = (p) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></S>;
export const ISun = (p) => <S {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" /></S>;
export const IMoon = (p) => <S {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></S>;
export const IHash = (p) => <S {...p}><path d="M4 9h16" /><path d="M4 15h16" /><path d="M10 3L8 21" /><path d="M16 3l-2 18" /></S>;
export const IDup = (p) => <S {...p}><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M5 16H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1" /><path d="M14.5 14.5v0" /></S>;
export const ITerminal = (p) => <S {...p}><rect x="2" y="3" width="20" height="18" rx="2" /><path d="M7 9l3 3-3 3" /><path d="M13 15h4" /></S>;
export const ICheck = (p) => <S {...p}><path d="M20 6L9 17l-5-5" /></S>;
export const IWarn = (p) => <S {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></S>;
export const IFile = (p) => <S {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></S>;
export const IMinimize = (p) => <S {...p} viewBox="0 0 12 12"><path d="M2.5 6h7" /></S>;
export const IMaximize = (p) => <S {...p} viewBox="0 0 12 12"><rect x="2.8" y="2.8" width="6.4" height="6.4" rx="1" /></S>;
export const IRestore = (p) => <S {...p} viewBox="0 0 12 12"><rect x="2.5" y="4.5" width="5" height="5" rx="1" /><path d="M4.5 4.5v-1a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1" /></S>;
export const ISparkle = (p) => <S {...p}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 17l.7 1.8L21.5 19.5l-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z" /></S>;


const KIND_STYLE = {
  dir: { from: '#5aa2ff', to: '#2f6fe0' },
  image: { from: '#a78bfa', to: '#7c3aed' },
  video: { from: '#fb7185', to: '#e11d48' },
  audio: { from: '#fbbf24', to: '#d97706' },
  archive: { from: '#fcd34d', to: '#b45309' },
  iso: { from: '#c084fc', to: '#7e22ce' },
  pdf: { from: '#f87171', to: '#dc2626' },
  doc: { from: '#60a5fa', to: '#2563eb' },
  sheet: { from: '#4ade80', to: '#16a34a' },
  slide: { from: '#fb923c', to: '#ea580c' },
  code: { from: '#34d399', to: '#059669' },
  exe: { from: '#94a3b8', to: '#475569' },
  font: { from: '#f472b6', to: '#db2777' },
  text: { from: '#a8b3c4', to: '#64748b' },
  file: { from: '#9aa7bd', to: '#5b6b84' }
};

let uid = 0;

export function FileTypeIcon({ entry, size = 38 }) {
  const kind = entry.isDir ? 'dir' : kindOf(entry);
  const style = KIND_STYLE[kind] || KIND_STYLE.file;
  const gid = `g${kind}${size}`;
  if (kind === 'dir') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={style.from} />
            <stop offset="1" stopColor={style.to} />
          </linearGradient>
        </defs>
        <path d="M4 11a3 3 0 0 1 3-3h8.2a3 3 0 0 1 2.4 1.2l1.6 2.1a3 3 0 0 0 2.4 1.2H33a3 3 0 0 1 3 3V29a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V11Z" fill={`url(#${gid})`} />
        <path d="M4 15.5h32" stroke="rgba(255,255,255,.35)" strokeWidth="1" />
        <path d="M4 11a3 3 0 0 1 3-3h8.2a3 3 0 0 1 2.4 1.2l1.6 2.1a3 3 0 0 0 2.4 1.2H33a3 3 0 0 1 3 3V13H4v-2Z" fill="rgba(255,255,255,.18)" />
      </svg>
    );
  }
  const label = (entry.ext || '').toUpperCase().slice(0, 4) || 'FILE';
  const fs1 = label.length <= 2 ? 13 : label.length === 3 ? 10.5 : 8.5;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={style.from} />
          <stop offset="1" stopColor={style.to} />
        </linearGradient>
      </defs>
      <rect x="5" y="3" width="30" height="34" rx="5" fill={`url(#${gid})`} />
      <rect x="5" y="3" width="30" height="12" rx="5" fill="rgba(255,255,255,.16)" />
      <path d="M26 3h4a5 5 0 0 1 5 5v4l-9-9z" fill="rgba(255,255,255,.22)" />
      <text x="20" y="26" textAnchor="middle" dominantBaseline="middle"
        fontSize={fs1} fontWeight="700" fill="#fff" fontFamily="inherit" letterSpacing="0.5">{label}</text>
    </svg>
  );
}

function kindOf(entry) {
  const e = entry.ext || '';
  const KINDS = {
    image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif', 'tiff', 'tif', 'ico', 'svg'],
    video: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'm4v', 'mpg', 'mpeg', '3gp'],
    audio: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma', 'opus', 'mid'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'zst', 'lz4'],
    iso: ['iso', 'img', 'dmg', 'vhd'],
    pdf: ['pdf'],
    doc: ['doc', 'docx', 'odt', 'rtf'],
    sheet: ['xls', 'xlsx', 'csv', 'ods'],
    slide: ['ppt', 'pptx', 'odp'],
    code: ['js', 'jsx', 'ts', 'tsx', 'py', 'c', 'cpp', 'h', 'hpp', 'cs', 'java', 'html', 'htm', 'css', 'scss', 'json', 'xml', 'yml', 'yaml', 'sh', 'bash', 'bat', 'cmd', 'ps1', 'rb', 'go', 'rs', 'php', 'vue', 'sql', 'lua', 'toml', 'ini', 'swift', 'kt', 'pl', 'r', 'dart'],
    exe: ['exe', 'msi', 'appimage', 'deb', 'rpm', 'apk', 'bin', 'dll', 'so'],
    font: ['ttf', 'otf', 'woff', 'woff2', 'eot'],
    text: ['txt', 'md', 'log', 'cfg', 'conf', 'env', 'properties', 'desktop']
  };
  for (const [kind, list] of Object.entries(KINDS)) {
    if (list.includes(e)) return kind;
  }
  return 'file';
}

export function Logo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="fup-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a90ff" />
          <stop offset="1" stopColor="#1f5fd6" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="10" fill="url(#fup-logo)" />
      <path d="M20 30V12" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M11.5 20.5L20 12l8.5 8.5" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 30h18" stroke="rgba(255,255,255,.85)" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

export const ITools = (p) => <S {...p}><path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6L14 13l-3-3 3.7-3.7Z" /></S>;
export const IZip = (p) => <S {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 3v2" /><path d="M12 7v2" /><path d="M12 11v2" /><rect x="10.5" y="14" width="3" height="4" rx="1" /></S>;
export const IScissors = (p) => <S {...p}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.12 15.88" /><path d="M14.47 14.48L20 20" /><path d="M8.12 8.12L12 12" /></S>;
export const IShield = (p) => <S {...p}><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4Z" /><path d="M9 12l2 2 4-4" /></S>;
export const ITextSearch = (p) => <S {...p}><path d="M21 6H3" /><path d="M12 12H3" /><circle cx="16" cy="16" r="4" /><path d="M19 19l2.5 2.5" /></S>;
export const IChart = (p) => <S {...p}><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" /><rect x="12" y="8" width="3" height="10" /><rect x="17" y="5" width="3" height="13" /></S>;
export const ICamera = (p) => <S {...p}><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="14" r="4" /></S>;
export const IBroom = (p) => <S {...p}><path d="M19 3l-7 7" /><path d="M12 10l-8.5 8.5a2.1 2.1 0 0 0 3 3L15 13" /><path d="M9 15l-2 2" /></S>;
export const ICloud = (p) => <S {...p}><path d="M17.5 19a4.5 4.5 0 0 0 .42-8.98 7 7 0 0 0-13.6 1.9A4 4 0 0 0 6 19.9h11.5" /></S>;
export const ITelegram = (p) => <S {...p}><path d="M21.5 4.5L2.9 11.7c-.9.35-.86 1.63.06 1.92l4.64 1.45 1.74 5.4c.27.85 1.36 1.03 1.9.32l2.5-3.3 4.7 3.45c.7.52 1.7.14 1.9-.72l2.6-14.4c.2-1-.75-1.8-1.44-1.32Z" /><path d="M7.6 14.9L18 7.5l-7.4 8.2-.24 3.4" /></S>;
