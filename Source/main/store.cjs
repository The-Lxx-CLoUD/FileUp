const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  theme: 'dark',
  viewMode: 'details',         
  sort: { by: 'name', dir: 'asc', dirsFirst: true },
  showHidden: false,
  confirmDelete: true,
  previewVisible: true,
  sidebarWidth: 248,
  bookmarks: [],                
  window: { width: 1280, height: 800, maximized: false },
  lastPath: null
};

let cfgPath = null;
let cache = null;
let saveTimer = null;

function file() {
  if (!cfgPath) cfgPath = path.join(app.getPath('userData'), 'fileup-config.json');
  return cfgPath;
}

function getConfig() {
  if (cache) return cache;
  cache = JSON.parse(JSON.stringify(DEFAULTS));
  try {
    const raw = JSON.parse(fs.readFileSync(file(), 'utf8'));
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw)) cache[k] = v;
    }
  } catch {  }
  cache.sort = { ...DEFAULTS.sort, ...(cache.sort || {}) };
  cache.window = { ...DEFAULTS.window, ...(cache.window || {}) };
  if (!Array.isArray(cache.bookmarks)) cache.bookmarks = [];
  return cache;
}

function patchConfig(patch) {
  const cur = getConfig();
  for (const [k, v] of Object.entries(patch || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && cur[k] && typeof cur[k] === 'object' && !Array.isArray(cur[k])) {
      Object.assign(cur[k], v);
    } else {
      cur[k] = v;
    }
  }
  scheduleSave();
  return cur;
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 250);
}

function flush() {
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true });
    fs.writeFileSync(file(), JSON.stringify(getConfig(), null, 2));
  } catch (e) {
    console.error('[FileUp] config save failed:', e.message);
  }
}

function listBookmarks() { return getConfig().bookmarks.slice(); }
function addBookmark(p, name) {
  const cfg = getConfig();
  const bp = String(p);
  if (!cfg.bookmarks.some(b => b.path === bp)) {
    cfg.bookmarks.push({ path: bp, name: name || path.basename(bp) || bp });
    scheduleSave();
  }
  return cfg.bookmarks.slice();
}
function removeBookmark(p) {
  const cfg = getConfig();
  cfg.bookmarks = cfg.bookmarks.filter(b => b.path !== p);
  scheduleSave();
  return cfg.bookmarks.slice();
}

app.on('will-quit', () => { clearTimeout(saveTimer); flush(); });

module.exports = { getConfig, patchConfig, listBookmarks, addBookmark, removeBookmark };
