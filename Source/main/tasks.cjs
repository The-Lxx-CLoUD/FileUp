const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const isHiddenName = (name) => name.startsWith('.') || (process.platform === 'win32' && (name.startsWith('$') || name === 'System Volume Information'));
const tokens = new Map();
function newToken(id) {
  const t = { cancelled: false };
  tokens.set(id, t);
  return t;
}
function cancelToken(id) {
  const t = tokens.get(id);
  if (t) t.cancelled = true;
}
function dropToken(id) { tokens.delete(id); }

async function walk(root, { showHidden = false, maxDepth = 14, maxFiles = 80000, followLinks = false } = {}, visit, token) {
  const stack = [{ dir: root, depth: 0 }];
  let count = 0;
  while (stack.length) {
    if (token && token.cancelled) return count;
    const { dir, depth } = stack.pop();
    let dirents;
    try { dirents = await fsp.readdir(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const d of dirents) {
      if (token && token.cancelled) return count;
      if (!showHidden && isHiddenName(d.name)) continue;
      const full = path.join(dir, d.name);
      count++;
      if (count > maxFiles) return count;
      const isDir = d.isDirectory();
      try { await visit(full, d, isDir); } catch {  }
      if (isDir && depth < maxDepth && (followLinks || !d.isSymbolicLink())) {
        stack.push({ dir: full, depth: depth + 1 });
      }
    }
  }
  return count;
}

function toMatcher(q) {
  const raw = String(q || '');
  const ql = raw.toLowerCase();
  if (raw.includes('*') || raw.includes('?')) {
    let pat = '';
    for (const ch of ql) {
      if (ch === '*') pat += '.*';
      else if (ch === '?') pat += '.';
      else pat += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
    const rx = new RegExp('^' + pat + '$');
    return (name) => rx.test(name.toLowerCase());
  }
  return (name) => name.toLowerCase().includes(ql);
}

async function deepSearch(root, query, { showHidden = false } = {}, token, onProgress) {
  const match = toMatcher(query);
  const results = [];
  const MAX = 5000;
  let lastEmit = Date.now();
  await walk(root, { showHidden }, async (full, d) => {
    if (results.length >= MAX) return;
    if (match(d.name)) {
      let st = null;
      try { st = await fsp.stat(full); } catch {  }
      results.push({
        name: d.name, path: full, isDir: d.isDirectory(),
        isLink: d.isSymbolicLink(),
        size: st ? (d.isDirectory() ? 0 : st.size) : 0,
        mtimeMs: st ? st.mtimeMs : 0,
        ext: d.isDirectory() ? '' : path.extname(d.name).replace('.', '').toLowerCase(),
        hidden: isHiddenName(d.name),
        canWrite: true
      });
      const now = Date.now();
      if (now - lastEmit > 120) { lastEmit = now; onProgress && onProgress({ found: results.length }); }
    }
  }, token);
  return results;
}

async function findDuplicates(root, { showHidden = false, minSize = 1 } = {}, token, onProgress) {
  const bySize = new Map();
  let scanned = 0;
  let lastEmit = Date.now();
  await walk(root, { showHidden }, async (full, d, isDir) => {
    scanned++;
    if (isDir) return;
    let st;
    try { st = await fsp.stat(full); } catch { return; }
    if (!st.isFile() || st.size < minSize) return;
    const arr = bySize.get(st.size);
    if (arr) arr.push({ path: full, name: d.name, size: st.size });
    else bySize.set(st.size, [{ path: full, name: d.name, size: st.size }]);
    const now = Date.now();
    if (now - lastEmit > 120) { lastEmit = now; onProgress && onProgress({ stage: 'scan', scanned }); }
  }, token);

  const sameSize = [...bySize.entries()].filter(([s, arr]) => arr.length > 1);
  const totalToHash = sameSize.reduce((acc, [, arr]) => acc + arr.length, 0);
  const groups = [];
  let hashed = 0;
  lastEmit = Date.now();

  for (const [size, arr] of sameSize) {
    if (token && token.cancelled) break;
    const byHash = new Map();
    for (const item of arr) {
      if (token && token.cancelled) break;
      let hash = '';
      try { hash = await hashFileSync(item.path, 'md5'); }
      catch { continue; }
      hashed++;
      const g = byHash.get(hash);
      if (g) g.push(item);
      else byHash.set(hash, [item]);
      const now = Date.now();
      if (now - lastEmit > 120) { lastEmit = now; onProgress && onProgress({ stage: 'hash', scanned, hashed, totalToHash }); }
    }
    for (const [hash, files] of byHash) {
      if (files.length > 1) groups.push({ hash, size, files });
    }
  }
  groups.sort((a, b) => (b.size * (b.files.length - 1)) - (a.size * (a.files.length - 1)));
  return { groups, scanned, hashed };
}

function hashFileSync(p, algo = 'md5') {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash(algo);
    const stream = fs.createReadStream(p, { highWaterMark: 1024 * 1024 });
    stream.on('data', (c) => h.update(c));
    stream.on('end', () => resolve(h.digest('hex')));
    stream.on('error', reject);
  });
}

function hashWithProgress(p, algo = 'sha256', onProgress) {
  return new Promise((resolve, reject) => {
    let size = 0;
    try { size = fs.statSync(p).size; } catch {  }
    const h = crypto.createHash(algo);
    const stream = fs.createReadStream(p, { highWaterMark: 1024 * 512 });
    let done = 0;
    stream.on('data', (c) => {
      h.update(c);
      done += c.length;
      if (onProgress && size) onProgress(done / size);
    });
    stream.on('end', () => resolve(h.digest('hex')));
    stream.on('error', reject);
  });
}

async function shredFile(p, passes = 3, onProgress) {
  let st;
  try { st = await fsp.stat(p); } catch { return; }
  if (!st.isFile()) throw new Error('Not a regular file: ' + p);
  const size = st.size;
  let fd;
  try {
    fd = await fsp.open(p, 'r+');
  } catch (e) {
    if (e.code === 'EACCES' || e.code === 'EPERM') {
      await fsp.chmod(p, 0o666).catch(() => {});
      fd = await fsp.open(p, 'r+');
    } else throw e;
  }
  try {
    const CHUNK = 1024 * 1024;
    const buf = Buffer.alloc(CHUNK);
    for (let pass = 0; pass < passes; pass++) {
      let pos = 0;
      while (pos < size) {
        const len = Math.min(CHUNK, size - pos);
        if (pass === passes - 1) buf.fill(0, 0, len);
        else crypto.randomFillSync(buf, 0, len);
        await fd.write(buf, 0, len, pos);
        pos += len;
        if (onProgress) onProgress((pass + pos / size) / passes);
      }
      await fd.sync();
    }
  } finally {
    await fd.close().catch(() => {});
  }
  try { await fsp.rename(p, path.join(path.dirname(p), 'fileup-shred-' + crypto.randomBytes(6).toString('hex'))); } catch {  }
  await fsp.unlink(p).catch(async () => { await fsp.rm(p, { force: true }); });
}

async function shredPath(p, passes = 3, token, onProgress) {
  const st = await fsp.lstat(p);
  if (st.isDirectory()) {
    const entries = await fsp.readdir(p);
    for (const e of entries) {
      if (token && token.cancelled) return false;
      await shredPath(path.join(p, e), passes, token, onProgress);
    }
    await fsp.rmdir(p).catch(() => fsp.rm(p, { recursive: true, force: true }));
    return true;
  }
  await shredFile(p, passes, onProgress);
  return true;
}

module.exports = { newToken, cancelToken, dropToken, walk, deepSearch, findDuplicates, hashWithProgress, hashFileSync, shredPath };
