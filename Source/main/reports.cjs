'use strict';
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');


function humanSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = Number(bytes);
  if (!isFinite(v) || v < 0) v = 0;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return (i === 0 ? String(Math.round(v)) : v.toFixed(1)) + ' ' + units[i];
}

async function folderReport(dir, opts = {}) {
  const { maxDepth = 10, topExt = 15, topFiles = 15 } = opts;
  let totalFiles = 0, totalDirs = 0, totalBytes = 0, emptyDirs = 0, maxDepthReached = 0;
  const extMap = new Map(); 
  let largest = [];      

  const pushLargest = (item) => {
    if (topFiles <= 0) return;
    if (largest.length < topFiles) {
      largest.push(item);
      largest.sort((a, b) => b.size - a.size);
      return;
    }
    if (item.size > largest[largest.length - 1].size) {
      largest[largest.length - 1] = item;
      largest.sort((a, b) => b.size - a.size);
    }
  };

  const stack = [{ d: dir, depth: 0 }];
  while (stack.length) {
    const { d: cur, depth } = stack.pop();
    let dirents;
    try { dirents = await fsp.readdir(cur, { withFileTypes: true }); }
    catch { continue; } // permission errors ignored
    if (depth > maxDepthReached) maxDepthReached = depth;
    if (dirents.length === 0) { emptyDirs++; continue; }
    for (const ent of dirents) {
      if (ent.isSymbolicLink()) continue; 
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) {
        totalDirs++;
        if (depth < maxDepth) stack.push({ d: full, depth: depth + 1 });
        continue;
      }
      if (!ent.isFile()) continue;
      totalFiles++;
      let size = 0;
      try { size = (await fsp.stat(full)).size; } catch { size = 0; }
      totalBytes += size;
      const ext = path.extname(ent.name).replace('.', '').toLowerCase();
      const rec = extMap.get(ext);
      if (rec) { rec.count++; rec.bytes += size; }
      else extMap.set(ext, { ext, count: 1, bytes: size });
      pushLargest({ path: full, size });
    }
  }

  const extensions = [...extMap.values()]
    .sort((a, b) => (b.bytes - a.bytes) || (b.count - a.count) || a.ext.localeCompare(b.ext))
    .slice(0, topExt);

  return {
    dir,
    generatedAt: new Date().toISOString(),
    totalFiles,
    totalDirs,
    totalBytes,
    extensions,
    largestFiles: largest, 
    emptyDirs,
    maxDepthReached,
    humanTotalBytes: humanSize(totalBytes)
  };
}


function getAppInfo() {
  return {
    name: 'FileUp',
    developer: 'TheLxxCLoUD',
    telegram: 'lxxcloud',
    telegramUrl: 'https://t.me/lxxcloud',
    edition: 'Professional',
    version: require('../package.json').version,
    license: 'MIT',
    tagline: 'Fast, modern file manager for Windows & Linux'
  };
}

module.exports = { folderReport, humanSize, getAppInfo };
