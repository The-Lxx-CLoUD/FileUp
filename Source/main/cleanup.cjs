'use strict';
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { humanSize } = require('./reports.cjs');

const DAY_MS = 24 * 60 * 60 * 1000;
const TEMP_EXTS = new Set(['tmp', 'temp', 'bak', '$$']);
const LOG_EXTS = new Set(['log', 'old']);
const SYSTEM_NAMES = new Set(['thumbs.db', '.ds_store', 'desktop.ini']);
const SPLIT_PART_RX = /\.part\d{2,}$/i;      
const PART_SINGLE_RX = /\.part\d$/i;         



function classifyFile(name) {
  const ext = path.extname(name).replace('.', '').toLowerCase();
  if (SPLIT_PART_RX.test(name)) return null; 
  if (TEMP_EXTS.has(ext) || name.startsWith('~') || name.endsWith('~')) return 'tempFiles';
  if (LOG_EXTS.has(ext)) return 'logFiles';
  if (SYSTEM_NAMES.has(name.toLowerCase())) return 'systemJunk';
  if (ext === 'crdownload') return 'systemJunk';
  if (ext === 'part' || PART_SINGLE_RX.test(name)) return 'systemJunk';
  return null;
}



async function scanJunk(roots, opts = {}) {
  const { minAgeDays = 0 } = opts;
  const minMtime = minAgeDays > 0 ? Date.now() - minAgeDays * DAY_MS : 0;
  const rootList = Array.isArray(roots) ? roots : [roots];
  const categories = { tempFiles: [], logFiles: [], systemJunk: [], emptyDirs: [] };

  for (const root of rootList) {
    const stack = [{ dir: root }];
    while (stack.length) {
      const { dir } = stack.pop();
      let dirents;
      try { dirents = await fsp.readdir(dir, { withFileTypes: true }); }
      catch { continue; } 
      if (dirents.length === 0) {
        let st = null;
        try { st = await fsp.stat(dir); } catch { }
        categories.emptyDirs.push({ path: dir, size: 0, mtimeMs: st ? st.mtimeMs : 0 });
        continue;
      }
      for (const ent of dirents) {
        if (ent.isSymbolicLink()) continue; 
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) { stack.push({ dir: full }); continue; }
        if (!ent.isFile()) continue;
        const cat = classifyFile(ent.name);
        if (!cat) continue;
        let st;
        try { st = await fsp.stat(full); } catch { continue; }
        if (minMtime && st.mtimeMs > minMtime) continue; 
        categories[cat].push({ path: full, size: st.size, mtimeMs: st.mtimeMs });
      }
    }
  }

  let count = 0, bytes = 0;
  for (const key of Object.keys(categories)) {
    for (const item of categories[key]) { count++; bytes += item.size || 0; }
  }
  return { categories, totals: { count, bytes }, humanBytes: humanSize(bytes) };
}



async function cleanJunk(paths, opts = {}) {
  const { dryRun = false } = opts;
  const list = Array.isArray(paths) ? paths : [paths];
  let removed = 0, freedBytes = 0;
  const failed = [];

  for (const p of list) {
    let st;
    try { st = await fsp.lstat(p); }
    catch (e) { failed.push({ path: p, error: e.code === 'ENOENT' ? 'Not found' : e.message }); continue; }
    const isDir = st.isDirectory();
    if (dryRun) { removed++; freedBytes += isDir ? 0 : st.size; continue; }
    try {
      if (isDir) await fsp.rmdir(p); 
      else await fsp.rm(p, { force: true });
      removed++;
      freedBytes += isDir ? 0 : st.size;
    } catch (e) {
      failed.push({ path: p, error: e.code === 'ENOTEMPTY' ? 'Directory not empty' : e.message });
    }
  }
  return { removed, failed, freedBytes, dryRun };
}

module.exports = { scanJunk, cleanJunk };
