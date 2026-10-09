export const IS_WIN = typeof window !== 'undefined' && window.fileup ? window.fileup.platform === 'win32' : false;

export function formatBytes(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
  let v = n;
  let i = -1;
  do { v /= 1024; i++; } while (v >= 1024 && i < units.length - 1);
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}

export function formatDate(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  const date = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

const KINDS = {
  image: new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif', 'tiff', 'tif', 'ico', 'svg']),
  video: new Set(['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'm4v', 'mpg', 'mpeg', '3gp']),
  audio: new Set(['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma', 'opus', 'mid']),
  archive: new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'zst', 'lz4']),
  iso: new Set(['iso', 'img', 'dmg', 'vhd']),
  pdf: new Set(['pdf']),
  doc: new Set(['doc', 'docx', 'odt', 'rtf']),
  sheet: new Set(['xls', 'xlsx', 'csv', 'ods']),
  slide: new Set(['ppt', 'pptx', 'odp']),
  code: new Set(['js', 'jsx', 'ts', 'tsx', 'py', 'c', 'cpp', 'h', 'hpp', 'cs', 'java', 'html', 'htm', 'css',
    'scss', 'json', 'xml', 'yml', 'yaml', 'sh', 'bash', 'bat', 'cmd', 'ps1', 'rb', 'go', 'rs', 'php', 'vue',
    'sql', 'lua', 'toml', 'ini', 'swift', 'kt', 'pl', 'r', 'dart']),
  exe: new Set(['exe', 'msi', 'appimage', 'deb', 'rpm', 'apk', 'bin', 'dll', 'so']),
  font: new Set(['ttf', 'otf', 'woff', 'woff2', 'eot']),
  text: new Set(['txt', 'md', 'log', 'cfg', 'conf', 'env', 'properties', 'desktop'])
};

export function iconKind(entry) {
  if (entry.isDir) return 'dir';
  const e = entry.ext || '';
  for (const [kind, set] of Object.entries(KINDS)) {
    if (set.has(e)) return kind;
  }
  return 'file';
}

const KIND_LABEL = {
  dir: 'Folder', image: 'Image', video: 'Video', audio: 'Audio', archive: 'Archive',
  iso: 'Disk Image', pdf: 'PDF Document', doc: 'Document', sheet: 'Spreadsheet',
  slide: 'Presentation', code: 'Source Code', exe: 'Application', font: 'Font',
  text: 'Text', file: 'File'
};

export function typeLabel(entry) {
  if (entry.isDir) return 'Folder';
  return KIND_LABEL[iconKind(entry)] || 'File';
}

export function kindLabel(kind) { return KIND_LABEL[kind] || 'File'; }

export function basename(p) {
  if (!p) return '';
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || p;
}

export function splitPath(p) {
  if (!p) return [];
  const norm = p.replace(/\\/g, '/');
  return norm.split('/').filter(Boolean);
}

export function segments(p) {
  const out = [];
  if (!p) return out;
  if (/^[a-zA-Z]:/.test(p)) {
    const norm = p.replace(/\\/g, '/');
    const segs = norm.split('/').filter(Boolean);
    out.push({ label: segs[0], path: segs[0] + '\\' });
    let acc = segs[0];
    for (let i = 1; i < segs.length; i++) {
      acc = acc + '/' + segs[i];
      out.push({ label: segs[i], path: acc.replace(/\//g, '\\') });
    }
  } else {
    const segs = p.split('/').filter(Boolean);
    out.push({ label: '/', path: '/' });
    let acc = '';
    for (const s of segs) {
      acc = acc + '/' + s;
      out.push({ label: s, path: acc });
    }
  }
  return out;
}

export function parentPath(p) {
  const segs = segments(p);
  if (segs.length <= 1) return null;
  return segs[segs.length - 2].path;
}

export function matchesQuery(name, q) {
  return name.toLowerCase().includes(q.toLowerCase());
}
