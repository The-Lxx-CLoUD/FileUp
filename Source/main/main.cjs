const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { getConfig, patchConfig } = require('./store.cjs');
const { registerIpc } = require('./ipc.cjs');
const { registerToolsIpc } = require('./ipc-tb.cjs');
const isDev = !!process.env.VITE_DEV_SERVER_URL;
let mainWindow = null;
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  function saveGeometry(win) {
    try {
      const w = { maximized: win.isMaximized() };
      if (!win.isMaximized() && !win.isMinimized()) Object.assign(w, win.getBounds());
      patchConfig({ window: w });
    } catch {  }
  }

  function createWindow() {
    const cfg = getConfig();
    const saved = cfg.window || {};
    const win = new BrowserWindow({
      width: saved.width || 1280,
      height: saved.height || 800,
      x: saved.x,
      y: saved.y,
      minWidth: 940,
      minHeight: 600,
      frame: false,
      titleBarStyle: 'hidden',
      backgroundColor: cfg.theme === 'light' ? '#f3f5fa' : '#0b0f17',
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: false
      }
    });

    Menu.setApplicationMenu(null);
    win.setMenuBarVisibility(false);

    if (saved.maximized) win.maximize();
    win.once('ready-to-show', () => win.show());

    const sendMax = () => { try { win.webContents.send('win:maximized', win.isMaximized()); } catch {} };
    win.on('maximize', sendMax);
    win.on('unmaximize', sendMax);

    win.on('close', () => saveGeometry(win));
    win.on('closed', () => { mainWindow = null; });

    if (isDev) win.loadURL(process.env.VITE_DEV_SERVER_URL);
    else win.loadFile(path.join(__dirname, '../dist/renderer/index.html'));

    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/i.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });

    
    if (process.env.FILEUP_SMOKE) {
      win.webContents.once('did-finish-load', () => {
        console.log('[FileUp] renderer loaded (smoke mode)');
        const dlgType = process.env.FILEUP_SMOKE_DIALOG;
        if (dlgType) {
          win.webContents.executeJavaScript(`window.__smokeDialog(${JSON.stringify(dlgType)})`).catch(() => {});
        }
        setTimeout(async () => {
          try {
            const img = await win.webContents.capturePage();
            require('fs').writeFileSync(process.env.FILEUP_SMOKE, img.toPNG());
            console.log('[FileUp] screenshot saved to', process.env.FILEUP_SMOKE);
          } catch (e) {
            console.error('[FileUp] smoke capture failed:', e.message);
          }
          app.quit();
        }, 2500);
      });
    }

    mainWindow = win;
    registerIpc(win);
    registerToolsIpc();
  }

  app.whenReady().then(() => {
    app.setAppUserModelId('cloud.lxx.fileup');
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
