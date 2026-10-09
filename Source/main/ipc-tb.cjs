const { ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const archives = require('./archives.cjs');
const splitjoin = require('./splitjoin.cjs');
const crypt = require('./crypt.cjs');
const grep = require('./grep.cjs');
const reports = require('./reports.cjs');
const snapshots = require('./snapshots.cjs');
const cleanup = require('./cleanup.cjs');
const remote = require('./remote.cjs');

const PART_SIZE = 20971520; 

let grepToken = null;

function bw(x) {
  if (x instanceof BrowserWindow) return x;
  return BrowserWindow.getAllWindows()[0] || null;
}

async function pickFolder(title, defaultPath) {
  const win = bw(null);
  const r = await dialog.showOpenDialog(win, {
    title: title || 'Select folder',
    defaultPath,
    properties: ['openDirectory', 'createDirectory']
  });
  return r.canceled ? null : r.filePaths[0];
}

async function pickPaths(opts) {
  const win = bw(null);
  const r = await dialog.showOpenDialog(win, {
    title: opts.title || 'Select',
    defaultPath: opts.defaultPath,
    filters: opts.filters,
    properties: opts.multi ? ['openFile', 'multiSelections'] : ['openFile']
  });
  return r.canceled ? null : (opts.multi ? r.filePaths : r.filePaths[0]);
}

async function pickSave(opts) {
  const win = bw(null);
  const r = await dialog.showSaveDialog(win, {
    title: opts.title || 'Save as',
    defaultPath: opts.defaultPath,
    filters: opts.filters
  });
  return r.canceled ? null : r.filePath;
}

function registerToolsIpc() {
  ipcMain.handle('pick:folder', (_e, title, defaultPath) => pickFolder(title, defaultPath));
  ipcMain.handle('pick:paths', (_e, opts) => pickPaths(opts || {}));
  ipcMain.handle('pick:save', (_e, opts) => pickSave(opts || {}));

  ipcMain.handle('zip:list', (_e, p) => archives.listArchive(p));
  ipcMain.handle('zip:extract', async (_e, p, dest) => {
    if (!dest) dest = await pickFolder('Extract to…', path.dirname(p));
    if (!dest) return null;
    return archives.extractArchive(p, dest);
  });
  ipcMain.handle('zip:create', async (_e, sources, archivePath) => {
    if (!archivePath) {
      const first = path.dirname(Array.isArray(sources) && sources[0] ? sources[0] : '.');
      archivePath = await pickSave({
        title: 'Create ZIP archive',
        defaultPath: path.join(first, 'Archive.zip'),
        filters: [{ name: 'ZIP archive', extensions: ['zip'] }]
      });
    }
    if (!archivePath) return null;
    if (!/\.zip$/i.test(archivePath)) archivePath += '.zip';
    return archives.createArchive(archivePath, sources);
  });

  ipcMain.handle('split:run', async (_e, filePath, opts) => {
    const o = Object.assign({ partSize: PART_SIZE }, opts || {});
    if (!o.outDir) o.outDir = path.dirname(filePath);
    return splitjoin.splitFile(filePath, o);
  });
  ipcMain.handle('join:run', (_e, firstPart, outputPath) => splitjoin.joinParts(firstPart, { outputPath }));

  ipcMain.handle('enc:encrypt', (_e, filePath, password, opts) => crypt.encryptFile(filePath, password, opts || {}));
  ipcMain.handle('enc:decrypt', (_e, filePath, password, opts) => crypt.decryptFile(filePath, password, opts || {}));

  ipcMain.handle('grep:start', async (_e, opts, id) => {
    if (grepToken) grepToken.cancelled = true;
    grepToken = { cancelled: false, id };
    const onProgress = (st) => {
      const w = bw(null);
      try { w && w.webContents.send('task:progress', { id, kind: 'grep', ...st }); } catch {}
    };
    try {
      return await grep.searchInFiles(Object.assign({ token: grepToken }, opts), onProgress);
    } finally {
      if (grepToken && grepToken.id === id) grepToken = null;
    }
  });
  ipcMain.handle('grep:cancel', () => { if (grepToken) grepToken.cancelled = true; return true; });

  ipcMain.handle('report:folder', (_e, dir, opts) => reports.folderReport(dir, opts || {}));
  ipcMain.handle('app:infoFull', () => Object.assign(reports.getAppInfo(), {
    electron: process.versions.electron,
    node: process.versions.node,
    platform: process.platform
  }));

  ipcMain.handle('snap:create', async (_e, sourceDir, snapshotDir) => {
    if (!snapshotDir) snapshotDir = path.join(sourceDir, 'FileUp-Snapshots');
    await fsp.mkdir(snapshotDir, { recursive: true });
    return snapshots.createSnapshot(sourceDir, snapshotDir);
  });
  ipcMain.handle('snap:list', (_e, dir) => snapshots.listSnapshots(dir));
  ipcMain.handle('snap:compare', (_e, snapPath, targetDir) => snapshots.compareSnapshot(snapPath, targetDir));
  ipcMain.handle('snap:backup', async (_e, snapPath, targetDir, backupDir) => {
    if (!backupDir) backupDir = path.join(path.dirname(targetDir), path.basename(targetDir) + '-Backup-' + Date.now().toString(36));
    return snapshots.backupChanges(snapPath, targetDir, backupDir);
  });

  ipcMain.handle('junk:scan', (_e, roots, opts) => cleanup.scanJunk(roots, opts || {}));
  ipcMain.handle('junk:clean', (_e, paths, opts) => cleanup.cleanJunk(paths, opts || {}));

  ipcMain.handle('remote:connect', (_e, cfg) => remote.connect(cfg));
  ipcMain.handle('remote:list', (_e, id, p) => remote.list(id, p));
  ipcMain.handle('remote:download', (_e, id, rp, lp) => remote.downloadFile(id, rp, lp));
  ipcMain.handle('remote:upload', (_e, id, lp, rp) => remote.uploadFile(id, lp, rp));
  ipcMain.handle('remote:mkdir', (_e, id, rp) => remote.mkdir(id, rp));
  ipcMain.handle('remote:remove', (_e, id, rp, isDir) => remote.remove(id, rp, isDir));
  ipcMain.handle('remote:disconnect', (_e, id) => remote.disconnect(id));
  ipcMain.handle('remote:sessions', () => remote.listSessions());
}

module.exports = { registerToolsIpc, PART_SIZE };
