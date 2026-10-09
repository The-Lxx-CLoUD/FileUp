const { contextBridge, ipcRenderer, webUtils } = require('electron');
const TASK_CHANNELS = new Set([
  'task:progress',
  'win:maximized'
]);

contextBridge.exposeInMainWorld('fileup', {
  platform: process.platform,

  win: {
    minimize: () => ipcRenderer.send('win:minimize'),
    maximizeToggle: () => ipcRenderer.send('win:maximize'),
    close: () => ipcRenderer.send('win:close'),
    isMaximized: () => ipcRenderer.invoke('win:isMaximized')
  },

  settings: {
    get: () => ipcRenderer.invoke('cfg:get'),
    patch: (patch) => ipcRenderer.invoke('cfg:patch', patch)
  },

  bookmarks: {
    list: () => ipcRenderer.invoke('bm:list'),
    add: (path, name) => ipcRenderer.invoke('bm:add', path, name),
    remove: (path) => ipcRenderer.invoke('bm:remove', path)
  },

  fs: {
    list: (p, opts) => ipcRenderer.invoke('fs:list', p, opts),
    stat: (p) => ipcRenderer.invoke('fs:stat', p),
    statfs: (p) => ipcRenderer.invoke('fs:statfs', p),
    home: () => ipcRenderer.invoke('fs:home'),
    quick: () => ipcRenderer.invoke('fs:quick'),
    drives: () => ipcRenderer.invoke('fs:drives'),
    mkdir: (dir, base) => ipcRenderer.invoke('fs:mkdir', dir, base),
    createFile: (dir, base) => ipcRenderer.invoke('fs:createFile', dir, base),
    rename: (oldPath, newName) => ipcRenderer.invoke('fs:rename', oldPath, newName),
    trash: (paths) => ipcRenderer.invoke('fs:trash', paths),
    deleteForever: (paths) => ipcRenderer.invoke('fs:deleteForever', paths),
    copy: (paths, dest) => ipcRenderer.invoke('fs:copy', paths, dest),
    move: (paths, dest) => ipcRenderer.invoke('fs:move', paths, dest),
    clipSet: (paths, mode) => ipcRenderer.send('clip:set', paths, mode),
    clipGet: () => ipcRenderer.invoke('clip:get'),
    open: (p) => ipcRenderer.invoke('fs:open', p),
    reveal: (p) => ipcRenderer.invoke('fs:reveal', p),
    terminal: (p) => ipcRenderer.invoke('fs:terminal', p),
    thumb: (p, size) => ipcRenderer.invoke('fs:thumb', p, size),
    previewImage: (p) => ipcRenderer.invoke('fs:previewImage', p),
    textPreview: (p, limit) => ipcRenderer.invoke('fs:textPreview', p, limit),
    hash: (p, algo, id) => ipcRenderer.invoke('fs:hash', p, algo, id),
    search: (root, q, opts, id) => ipcRenderer.invoke('fs:search', root, q, opts, id),
    searchCancel: (id) => ipcRenderer.invoke('fs:searchCancel', id),
    dupScan: (root, opts, id) => ipcRenderer.invoke('fs:dupScan', root, opts, id),
    dupCancel: (id) => ipcRenderer.invoke('fs:dupCancel', id),
    shred: (paths, passes, id) => ipcRenderer.invoke('fs:shred', paths, passes, id),
    renamePlan: (dir, files, opts) => ipcRenderer.invoke('fs:renamePlan', dir, files, opts),
    renameApply: (dir, plan) => ipcRenderer.invoke('fs:renameApply', dir, plan),
    dirSize: (root, id) => ipcRenderer.invoke('fs:dirSize', root, id)
  },

  app: {
    info: () => ipcRenderer.invoke('app:info'),
    infoFull: () => ipcRenderer.invoke('app:infoFull'),
    copyText: (t) => ipcRenderer.invoke('os:copyText', t)
  },

  pick: {
    folder: (title, defaultPath) => ipcRenderer.invoke('pick:folder', title, defaultPath),
    paths: (opts) => ipcRenderer.invoke('pick:paths', opts),
    save: (opts) => ipcRenderer.invoke('pick:save', opts)
  },

  tools: {
    zipList: (p) => ipcRenderer.invoke('zip:list', p),
    zipExtract: (p, dest) => ipcRenderer.invoke('zip:extract', p, dest),
    zipCreate: (sources, archivePath) => ipcRenderer.invoke('zip:create', sources, archivePath),
    split: (p, opts) => ipcRenderer.invoke('split:run', p, opts),
    join: (firstPart, outputPath) => ipcRenderer.invoke('join:run', firstPart, outputPath),
    encrypt: (p, password, opts) => ipcRenderer.invoke('enc:encrypt', p, password, opts),
    decrypt: (p, password, opts) => ipcRenderer.invoke('enc:decrypt', p, password, opts),
    grep: (opts, id) => ipcRenderer.invoke('grep:start', opts, id),
    grepCancel: (id) => ipcRenderer.invoke('grep:cancel', id),
    report: (dir, opts) => ipcRenderer.invoke('report:folder', dir, opts),
    snapCreate: (src, dir) => ipcRenderer.invoke('snap:create', src, dir),
    snapList: (dir) => ipcRenderer.invoke('snap:list', dir),
    snapCompare: (snapPath, targetDir) => ipcRenderer.invoke('snap:compare', snapPath, targetDir),
    snapBackup: (snapPath, targetDir, backupDir) => ipcRenderer.invoke('snap:backup', snapPath, targetDir, backupDir),
    junkScan: (roots, opts) => ipcRenderer.invoke('junk:scan', roots, opts),
    junkClean: (paths, opts) => ipcRenderer.invoke('junk:clean', paths, opts),
    remoteConnect: (cfg) => ipcRenderer.invoke('remote:connect', cfg),
    remoteList: (id, p) => ipcRenderer.invoke('remote:list', id, p),
    remoteDownload: (id, rp, lp) => ipcRenderer.invoke('remote:download', id, rp, lp),
    remoteUpload: (id, lp, rp) => ipcRenderer.invoke('remote:upload', id, lp, rp),
    remoteMkdir: (id, rp) => ipcRenderer.invoke('remote:mkdir', id, rp),
    remoteRemove: (id, rp, isDir) => ipcRenderer.invoke('remote:remove', id, rp, isDir),
    remoteDisconnect: (id) => ipcRenderer.invoke('remote:disconnect', id),
    remoteSessions: () => ipcRenderer.invoke('remote:sessions')
  },

  pathForFile: (file) => {
    try { return webUtils.getPathForFile(file); } catch { return file && file.path ? file.path : null; }
  },

  on: (channel, cb) => {
    if (!TASK_CHANNELS.has(channel)) return () => { };
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  }
});
