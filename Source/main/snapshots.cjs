'use strict';
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const MTIME_TOLERANCE_MS = 1000; 


function relPosix(full, root) {
  return path.relative(root, full).split(path.sep).join('/');
}

function toLocalParts(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function collectEntries(root, token) {
  const entries = new Map();
  const stack = [{ dir: root }];
  while (stack.length) {
    if (token && token.cancelled) throw new Error('Cancelled');
    const { dir } = stack.pop();
    let dirents;
    try { dirents = await fsp.readdir(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const ent of dirents) {
      if (token && token.cancelled) throw new Error('Cancelled');
      if (ent.isSymbolicLink()) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) { stack.push({ dir: full }); continue; }
      if (!ent.isFile()) continue;
      let st;
      try { st = await fsp.stat(full); } catch { continue; }
      entries.set(relPosix(full, root), { size: st.size, mtimeMs: st.mtimeMs });
    }
  }
  return entries;
}


async function createSnapshot(sourceDir, snapshotDir) {
  const entries = await collectEntries(sourceDir);
  let totalFiles = 0, totalBytes = 0;
  const manifestEntries = {};
  for (const [rel, info] of entries) {
    manifestEntries[rel] = { size: info.size, mtimeMs: info.mtimeMs };
    totalFiles++;
    totalBytes += info.size;
  }
  await fsp.mkdir(snapshotDir, { recursive: true });
  const name = `snapshot-${toLocalParts(new Date())}.fsnap.json`;
  const snapshotPath = path.join(snapshotDir, name);
  const manifest = {
    format: 'FSNAP1',
    createdAt: new Date().toISOString(),
    sourceDir,
    totalFiles,
    totalBytes,
    entries: manifestEntries
  };
  await fsp.writeFile(snapshotPath, JSON.stringify(manifest, null, 2), 'utf8');
  return { snapshotPath, totalFiles, totalBytes, name };
}

async function listSnapshots(snapshotDir) {
  let names;
  try { names = await fsp.readdir(snapshotDir); } catch { return []; }
  const items = [];
  for (const name of names) {
    if (!name.endsWith('.fsnap.json')) continue;
    const p = path.join(snapshotDir, name);
    try {
      const m = JSON.parse(await fsp.readFile(p, 'utf8'));
      items.push({
        name,
        path: p,
        createdAt: m.createdAt || null,
        sourceDir: m.sourceDir || null,
        totalFiles: m.totalFiles || 0,
        totalBytes: m.totalBytes || 0
      });
    } catch {  }
  }
  const tsOf = (it) => { const t = Date.parse(it.createdAt); return isFinite(t) ? t : 0; };
  items.sort((a, b) => (tsOf(b) - tsOf(a)) || b.name.localeCompare(a.name)); // newest first
  return items;
}


async function compareSnapshot(snapshotPath, targetDir, token) {
  const manifest = JSON.parse(await fsp.readFile(snapshotPath, 'utf8'));
  if (!manifest || manifest.format !== 'FSNAP1' || !manifest.entries) {
    throw new Error('Invalid snapshot file: ' + snapshotPath);
  }
  const snapEntries = manifest.entries;
  const targetEntries = await collectEntries(targetDir, token);

  const added = [], modified = [], deleted = [];
  let unchangedCount = 0;
  let targetBytesDelta = 0;

  for (const [rel, cur] of targetEntries) {
    const old = snapEntries[rel];
    if (!old) { added.push(rel); targetBytesDelta += cur.size; continue; }
    if (cur.size !== old.size || Math.abs(cur.mtimeMs - old.mtimeMs) > MTIME_TOLERANCE_MS) {
      modified.push(rel);
      targetBytesDelta += cur.size - old.size;
    } else {
      unchangedCount++;
    }
  }
  for (const [rel, old] of Object.entries(snapEntries)) {
    if (!targetEntries.has(rel)) { deleted.push(rel); targetBytesDelta -= old.size; }
  }

  return { added, modified, deleted, unchangedCount, targetBytesDelta };
}


async function backupChanges(snapshotPath, targetDir, backupDir, token) {
  const diff = await compareSnapshot(snapshotPath, targetDir, token);
  await fsp.mkdir(backupDir, { recursive: true });
  const copied = [];
  let bytes = 0;
  for (const rel of [...diff.added, ...diff.modified]) {
    if (token && token.cancelled) throw new Error('Cancelled');
    const src = path.join(targetDir, ...rel.split('/'));
    const dest = path.join(backupDir, ...rel.split('/'));
    let st;
    try { st = await fsp.stat(src); } catch { continue; } 
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.copyFile(src, dest);
    copied.push(rel);
    bytes += st.size;
  }
  return { copied, backupDir, bytes };
}

module.exports = { createSnapshot, listSnapshots, compareSnapshot, backupChanges };
