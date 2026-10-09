const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');
const { shell } = require('electron');
const naming = require('./naming.cjs');
const WIN = process.platform === 'win32';
const { isHiddenName, sanitizeName, buildNewName } = naming;



async function canWrite(p, isDir) {
  try {
    await fsp.access(p, isDir ? (fs.constants.W_OK | fs.constants.X_OK) : fs.constants.W_OK);
    return true;
  } catch { return false; }
}

async function statfsSafe(p) {
  try {
    const s = await fsp.statfs(p);
    const bsize = s.bsize || 4096;
    return { total: Number(s.blocks) * bsize, free: Number(s.bavail) * bsize };
  } catch { return { total: 0, free: 0 }; }
}



async function listDir(dirPath, { showHidden = false, dirsOnly = false } = {}) {
  let dirents;
  try {
    dirents = await fsp.readdir(dirPath, { withFileTypes: true });
  } catch (e) {
    const err = new Error(e.code === 'EACCES' || e.code === 'EPERM'
      ? `Access denied: ${dirPath}`
      : `Cannot open folder: ${e.message}`);
    err.code = e.code;
    throw err;
  }
  const out = [];
  const CONC = 96;
  for (let i = 0; i < dirents.length; i += CONC) {
    const chunk = dirents.slice(i, i + CONC);
    const metas = await Promise.all(chunk.map(async (d) => {
      try {
        const full = path.join(dirPath, d.name);
        let st;
        try { st = await fsp.stat(full); }
        catch { try { st = await fsp.lstat(full); } catch { return null; } }
        const isDir = st.isDirectory(); 
        const hidden = isHiddenName(d.name);
        if (hidden && !showHidden) return null;
        if (dirsOnly && !isDir) return null;
        return {
          name: d.name,
          path: full,
          isDir,
          isLink: d.isSymbolicLink(),
          size: isDir ? 0 : st.size,
          mtimeMs: st.mtimeMs,
          birthtimeMs: st.birthtimeMs || st.ctimeMs,
          ext: isDir ? '' : path.extname(d.name).replace('.', '').toLowerCase(),
          hidden,
          canWrite: await canWrite(full, isDir)
        };
      } catch { return null; }
    }));
    for (const m of metas) if (m) out.push(m);
  }
  return out;
}



async function listDrives() {
  const out = [];
  if (WIN) {
    for (let c = 65; c <= 90; c++) {
      const letter = String.fromCharCode(c);
      const root = `${letter}:\\`;
      try {
        await fsp.stat(root);
        const sf = await statfsSafe(root);
        out.push({ path: root, name: `${letter}: Drive`, fs: '', total: sf.total, free: sf.free });
      } catch {  }
    }
  } else {
    const skipFs = new Set(['proc', 'sysfs', 'devtmpfs', 'tmpfs', 'devpts', 'securityfs', 'cgroup', 'cgroup2',
      'pstore', 'bpf', 'debugfs', 'tracefs', 'configfs', 'fusectl', 'hugetlbfs', 'mqueue', 'overlay', 'squashfs',
      'autofs', 'binfmt_misc', 'efivarfs', 'ramfs', 'cgmfs', 'none']);
    const seen = new Set();
    try {
      const mounts = (await fsp.readFile('/proc/mounts', 'utf8')).split('\n');
      for (const line of mounts) {
        const parts = line.split(' ');
        const dev = parts[0], mp = parts[1], type = parts[2];
        if (!dev || !dev.startsWith('/dev/')) continue;
        if (skipFs.has(type)) continue;
        if (seen.has(mp)) continue;
        seen.add(mp);
        const sf = await statfsSafe(mp);
        const name = mp === '/' ? 'System (/)' : (path.basename(mp) || mp);
        out.push({ path: mp, name, fs: type, total: sf.total, free: sf.free });
      }
    } catch {  }
    if (!out.some(d => d.path === '/')) {
      const sf = await statfsSafe('/');
      out.unshift({ path: '/', name: 'System (/)', fs: '', total: sf.total, free: sf.free });
    }
  }
  return out;
}

async function quickAccess() {
  const home = os.homedir();
  const entries = [
    ['Home', home],
    ['Desktop', path.join(home, 'Desktop')],
    ['Documents', path.join(home, 'Documents')],
    ['Downloads', path.join(home, 'Downloads')],
    ['Music', path.join(home, 'Music')],
    ['Pictures', path.join(home, 'Pictures')],
    ['Videos', path.join(home, 'Videos')]
  ];
  const out = [];
  for (const [name, p] of entries) {
    try { const st = await fsp.stat(p); if (st.isDirectory()) out.push({ name, path: p }); } catch {  }
  }
  return out;
}



async function mkdirUnique(dirPath, base) {
  let candidate = path.join(dirPath, sanitizeName(base, 'folder name'));
  let i = 2;
  const ext = path.extname(candidate);
  const stem = candidate.slice(0, candidate.length - ext.length);
  while (true) {
    try { await fsp.access(candidate); candidate = `${stem} (${i})${ext}`; i++; }
    catch { break; }
  }
  await fsp.mkdir(candidate, { recursive: false });
  return candidate;
}

async function createFileUnique(dirPath, base) {
  let candidate = path.join(dirPath, sanitizeName(base, 'file name'));
  let i = 2;
  const ext = path.extname(candidate);
  const stem = candidate.slice(0, candidate.length - ext.length);
  while (true) {
    try { await fsp.access(candidate); candidate = `${stem} (${i})${ext}`; i++; }
    catch { break; }
  }
  const fh = await fsp.open(candidate, 'wx');
  await fh.close();
  return candidate;
}

async function renameEntry(oldPath, newName) {
  const name = sanitizeName(newName, 'new name');
  const dir = path.dirname(oldPath);
  const target = path.join(dir, name);
  if (path.resolve(target) === path.resolve(oldPath)) return target;
  try { await fsp.access(target); throw Object.assign(new Error(`"${name}" already exists.`), { code: 'EEXIST' }); }
  catch (e) { if (e.code === 'EEXIST') throw e; }
  await fsp.rename(oldPath, target);
  return target;
}

async function trashItems(paths) {
  const errors = [];
  for (const p of paths) {
    try { const ok = await shell.trashItem(p); if (!ok) errors.push(`${path.basename(p)}: could not move to trash`); }
    catch (e) { errors.push(`${path.basename(p)}: ${e.message}`); }
  }
  return { ok: errors.length === 0, errors };
}

async function deleteForever(paths) {
  const errors = [];
  for (const p of paths) {
    try { await fsp.rm(p, { recursive: true, force: true }); }
    catch (e) { errors.push(`${path.basename(p)}: ${e.message}`); }
  }
  return { ok: errors.length === 0, errors };
}



async function uniqueDest(target) {
  const dir = path.dirname(target);
  const ext = path.extname(target);
  const base = path.basename(target, ext);
  let candidate = target;
  let i = 2;
  while (true) {
    try { await fsp.access(candidate); candidate = path.join(dir, `${base} (${i})${ext}`); i++; }
    catch { return candidate; }
  }
}

async function transfer(srcPaths, destDir, { move = false, askConflict = null } = {}) {
  const results = { copied: 0, skipped: 0, renamed: 0, errors: [] };
  let strategy = 'ask'; 
  for (const src of srcPaths) {
    try {
      const base = path.basename(src);
      const srcRes = path.resolve(src);
      const destRes = path.resolve(destDir);
      if (move && srcRes === destRes) { results.skipped++; continue; }
      if (move && destRes.startsWith(srcRes + path.sep)) {
        results.errors.push(`Cannot move "${base}" into itself`);
        continue;
      }
      let target = path.join(destDir, base);
      let exists = false;
      try { await fsp.access(target); exists = true; } catch {  }

      if (exists && !(move && srcRes === path.resolve(target))) {
        let act = strategy;
        if (act === 'ask') {
          if (askConflict) act = await askConflict(base, move);
          else act = 'keep';
          if (act === 'cancel') break;
          if (act === 'replaceAll') { act = 'replace'; strategy = 'replace'; }
          else if (act === 'skipAll') { act = 'skip'; strategy = 'skip'; }
          else if (act === 'keep') strategy = 'keep';
        }
        if (act === 'skip') { results.skipped++; continue; }
        if (act === 'keep') { target = await uniqueDest(target); results.renamed++; }
      }

      if (move) {
        try {
          await fsp.rename(src, target);
        } catch (e) {
          if (e.code === 'EXDEV') {
            await fsp.cp(src, target, { recursive: true, force: true, errorOnExist: true });
            await fsp.rm(src, { recursive: true, force: true });
          } else throw e;
        }
      } else {
        await fsp.cp(src, target, { recursive: true, force: true, errorOnExist: false });
      }
      results.copied++;
    } catch (e) {
      results.errors.push(`${path.basename(src)}: ${e.code || ''} ${e.message}`.trim());
    }
  }
  return results;
}



async function openPath(p) {
  const err = await shell.openPath(p);
  if (err) throw new Error(err);
  return true;
}

function openTerminal(dirPath) {
  return new Promise((resolve, reject) => {
    if (WIN) {
      try {
        const child = spawn('cmd.exe', ['/c', 'start', 'cmd'], { cwd: dirPath, detached: true, stdio: 'ignore' });
        child.on('error', (e) => reject(e));
        child.unref();
        resolve(true);
      } catch (e) { reject(e); }
      return;
    }
    const candidates = ['x-terminal-emulator', 'gnome-terminal', 'konsole', 'xfce4-terminal', 'alacritty', 'kitty', 'tilix', 'xterm'];
    (async () => {
      for (const t of candidates) {
        try {
          execSync(`command -v ${t}`, { stdio: 'ignore' });
          const child = spawn(t, [], { cwd: dirPath, detached: true, stdio: 'ignore' });
          child.on('error', () => {  });
          child.unref();
          return resolve(true);
        } catch {  }
      }
      reject(new Error('No terminal emulator found on this system.'));
    })();
  });
}



async function renamePlan(dir, files, opts) {
  const existing = new Set();
  try { (await fsp.readdir(dir)).forEach(n => existing.add(n)); } catch {  }
  const planned = new Set();
  const plan = [];
  for (let i = 0; i < files.length; i++) {
    const name = files[i];
    let to = name;
    let error = null;
    try {
      to = buildNewName(name, i, opts || {});
      if (to === name) {  }
      else if (existing.has(to) && !planned.has(to) && to !== name) error = 'Target name already exists in folder';
      else if (planned.has(to)) error = 'Duplicate target within selection';
      else planned.add(to);
    } catch (e) { error = e.message; to = name; }
    plan.push({ from: name, to, error });
  }
  return plan;
}

async function renameApply(dir, plan) {
  const results = { renamed: 0, skipped: 0, errors: [] };
  for (const item of plan) {
    if (item.from === item.to || item.error) { results.skipped++; continue; }
    const from = path.join(dir, item.from);
    let to = path.join(dir, item.to);
    try {
      try { await fsp.access(to); to = await uniqueDest(to); }
      catch {  }
      await fsp.rename(from, to);
      results.renamed++;
    } catch (e) {
      results.errors.push(`${item.from}: ${e.message}`);
    }
  }
  return results;
}

module.exports = {
  WIN,
  isHiddenName,
  sanitizeName,
  listDir,
  listDrives,
  quickAccess,
  statfsSafe,
  mkdirUnique,
  createFileUnique,
  renameEntry,
  trashItems,
  deleteForever,
  transfer,
  uniqueDest,
  openPath,
  openTerminal,
  renamePlan,
  renameApply
};
