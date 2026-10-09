const { ipcMain, dialog, shell, nativeImage, app, clipboard: electronClipboard } = require('electron');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const ops = require('./fsops.cjs');
const tasks = require('./tasks.cjs');
const store = require('./store.cjs');

let win = null;
let clip = { paths: [], mode: null }; 

const send = (channel, payload) => { try { win && !win.isDestroyed() && win.webContents.send(channel, payload); } catch { } };
function throttle(ms) {
  let last = 0;
  return (fn) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(); }
  };
}

async function askConflict(parentWin, name, move) {
  const { response } = await dialog.showMessageBox(parentWin, {
    type: 'question',
    buttons: ['Replace All', 'Keep Both', 'Skip All', 'Cancel'],
    defaultId: 1,
    cancelId: 3,
    title: move ? 'Confirm Move' : 'Confirm Copy',
    message: `"${name}" already exists in the destination folder.`,
    detail: 'Replace it, keep both (a number is added to the name), or skip it?'
  });
  return ['replaceAll', 'keep', 'skipAll', 'cancel'][response];
}

function registerIpc(target) {
  win = target;

  ipcMain.on('win:minimize', () => win.minimize());
  ipcMain.on('win:maximize', () => { win.isMaximized() ? win.unmaximize() : win.maximize(); });
  ipcMain.on('win:close', () => win.close());
  ipcMain.handle('win:isMaximized', () => win.isMaximized());
  ipcMain.handle('cfg:get', () => store.getConfig());
  ipcMain.handle('cfg:patch', (_e, patch) => store.patchConfig(patch));
  ipcMain.handle('bm:list', () => store.listBookmarks());
  ipcMain.handle('bm:add', (_e, p, name) => store.addBookmark(p, name));
  ipcMain.handle('bm:remove', (_e, p) => store.removeBookmark(p));
  ipcMain.handle('fs:list', (_e, p, opts) => ops.listDir(p, opts || {}));
  ipcMain.handle('fs:home', () => os.homedir());
  ipcMain.handle('fs:quick', () => ops.quickAccess());
  ipcMain.handle('fs:drives', () => ops.listDrives());
  ipcMain.handle('fs:statfs', (_e, p) => ops.statfsSafe(p));
  ipcMain.handle('fs:stat', async (_e, p) => {
    const st = await fsp.stat(p);
    return {
      size: st.size, isDir: st.isDirectory(), mtimeMs: st.mtimeMs, birthtimeMs: st.birthtimeMs,
      atimeMs: st.atimeMs, mode: st.mode
    };
  });
  ipcMain.handle('fs:mkdir', (_e, dir, base) => ops.mkdirUnique(dir, base));
  ipcMain.handle('fs:createFile', (_e, dir, base) => ops.createFileUnique(dir, base));
  ipcMain.handle('fs:rename', (_e, oldPath, newName) => ops.renameEntry(oldPath, newName));
  ipcMain.handle('fs:trash', (_e, paths) => ops.trashItems(paths));
  ipcMain.handle('fs:deleteForever', (_e, paths) => ops.deleteForever(paths));
  ipcMain.handle('fs:copy', async (_e, paths, dest) => {
    return ops.transfer(paths, dest, { move: false, askConflict: (n, m) => askConflict(win, n, m) });
  });
  ipcMain.handle('fs:move', async (_e, paths, dest) => {
    return ops.transfer(paths, dest, { move: true, askConflict: (n, m) => askConflict(win, n, m) });
  });
  ipcMain.on('clip:set', (_e, paths, mode) => { clip = { paths: paths || [], mode: mode || 'copy' }; });
  ipcMain.handle('clip:get', () => ({ ...clip }));

  ipcMain.handle('fs:open', async (_e, p) => {
    const st = await fsp.stat(p).catch(() => null);
    if (st && st.isDirectory()) return shell.openPath(p);
    const err = await shell.openPath(p);
    if (err) throw new Error(err);
    return true;
  });
  ipcMain.handle('fs:reveal', (_e, p) => { shell.showItemInFolder(p); return true; });
  ipcMain.handle('fs:terminal', async (_e, p) => { await ops.openTerminal(p); return true; });
  const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif', 'tiff', 'tif', 'ico']);
  ipcMain.handle('fs:thumb', async (_e, p, size = 256) => {
    try {
      const ext = path.extname(p).replace('.', '').toLowerCase();
      if (!IMAGE_EXTS.has(ext)) return null;
      const st = await fsp.stat(p);
      if (st.size > 100 * 1024 * 1024) return null;
      const img = nativeImage.createFromPath(p);
      if (img.isEmpty()) return null;
      const { width, height } = img.getSize();
      const side = Math.min(width, height);
      let src = img;
      if (side > 4) {
        src = img.crop({
          x: Math.floor((width - side) / 2),
          y: Math.floor((height - side) / 2),
          width: side, height: side
        });
      }
      return src.resize({ width: size, height: size, quality: 'good' }).toDataURL();
    } catch { return null; }
  });

  ipcMain.handle('fs:previewImage', async (_e, p) => {
    try {
      const st = await fsp.stat(p);
      if (st.size > 120 * 1024 * 1024) return null;
      const img = nativeImage.createFromPath(p);
      if (img.isEmpty()) return null;
      const { width, height } = img.getSize();
      const max = 900;
      let out = img;
      if (Math.max(width, height) > max) {
        const scale = max / Math.max(width, height);
        out = img.resize({
          width: Math.round(width * scale),
          height: Math.round(height * scale),
          quality: 'good'
        });
      }
      return out.toDataURL();
    } catch { return null; }
  });

  ipcMain.handle('fs:textPreview', async (_e, p, limit = 65536) => {
    try {
      const st = await fsp.stat(p);
      if (st.size > 5 * 1024 * 1024) return { binary: true, text: '', truncated: false, size: st.size };
      const fh = await fsp.open(p, 'r');
      try {
        const len = Math.min(limit, st.size);
        const buf = Buffer.alloc(len);
        await fh.read(buf, 0, len, 0);
        
        const sniff = buf.subarray(0, Math.min(4096, buf.length));
        let ctrl = 0;
        for (const b of sniff) { if (b === 0) { ctrl = Infinity; break; } if (b < 9 || (b > 13 && b < 32)) ctrl++; }
        const binary = ctrl === Infinity || (sniff.length > 0 && ctrl / sniff.length > 0.1);
        return {
          binary,
          text: binary ? '' : buf.toString('utf8').replace(/\r\n/g, '\n'),
          truncated: st.size > len,
          size: st.size
        };
      } finally { await fh.close(); }
    } catch (e) {
      return { error: e.message, text: '', binary: false, truncated: false, size: 0 };
    }
  });

  ipcMain.handle('fs:hash', async (_e, p, algo = 'sha256', id = 'hash') => {
    const emit = throttle(100);
    const hex = await tasks.hashWithProgress(p, algo, (frac) => {
      emit(() => send('task:progress', { id, kind: 'hash', frac }));
    });
    send('task:progress', { id, kind: 'hash', frac: 1, done: true });
    return hex;
  });

  ipcMain.handle('fs:search', async (_e, root, query, opts = {}, id = 'search') => {
    const token = tasks.newToken(id);
    try {
      const results = await tasks.deepSearch(root, query, opts, token,
        throttle(150)((prog) => send('task:progress', { id, kind: 'search', ...prog })));
      return { items: results, count: results.length, cancelled: token.cancelled };
    } finally { tasks.dropToken(id); }
  });
  ipcMain.handle('fs:searchCancel', (_e, id) => { tasks.cancelToken(id); return true; });

  ipcMain.handle('fs:dupScan', async (_e, root, opts = {}, id = 'dup') => {
    const token = tasks.newToken(id);
    try {
      const res = await tasks.findDuplicates(root, opts, token,
        throttle(150)((prog) => send('task:progress', { id, kind: 'dup', ...prog })));
      return res;
    } finally { tasks.dropToken(id); }
  });
  ipcMain.handle('fs:dupCancel', (_e, id) => { tasks.cancelToken(id); return true; });

  ipcMain.handle('fs:shred', async (_e, paths, passes = 3, id = 'shred') => {
    const token = tasks.newToken(id);
    const results = { done: [], errors: [], cancelled: false };
    let idx = 0;
    for (const p of paths) {
      if (token.cancelled) { results.cancelled = true; break; }
      idx++;
      const emit = throttle(120);
      try {
        await tasks.shredPath(p, passes, token, (frac) => {
          emit(() => send('task:progress', { id, kind: 'shred', frac, index: idx, total: paths.length, path: p }));
        });
        results.done.push(p);
      } catch (e) {
        results.errors.push(`${path.basename(p)}: ${e.message}`);
      }
    }
    tasks.dropToken(id);
    return results;
  });

  ipcMain.handle('fs:renamePlan', (_e, dir, files, opts) => ops.renamePlan(dir, files, opts));
  ipcMain.handle('fs:renameApply', (_e, dir, plan) => ops.renameApply(dir, plan));

  ipcMain.handle('fs:dirSize', async (_e, root, id = 'dirsize') => {
    const token = tasks.newToken(id);
    let files = 0, folders = 0, total = 0;
    await tasks.walk(root, { showHidden: true, maxFiles: 200000 }, async (full, d, isDir) => {
      if (isDir) { folders++; return; }
      files++;
      try { total += (await fsp.stat(full)).size; } catch {  }
    }, token);
    tasks.dropToken(id);
    return { files, folders, total, cancelled: token.cancelled };
  });

  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    platform: process.platform,
    home: os.homedir(),
    hostname: os.hostname(),
    user: os.userInfo().username
  }));
  ipcMain.handle('os:copyText', (_e, text) => { electronClipboard.writeText(String(text ?? '')); return true; });
  ipcMain.handle('fs:pathForFile', (_e, file) => {
    try { return file.path || null; } catch { return null; }
  });
}

module.exports = { registerIpc };
