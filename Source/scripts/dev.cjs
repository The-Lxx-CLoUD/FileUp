const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const electronPath = (() => { try { return require('electron'); } catch { return 'electron'; } })();
const ROOT = path.join(__dirname, '..');
const PORT = 5173;
const URL = `http://localhost:${PORT}`;

function waitForServer(url, tries = 120) {
  return new Promise((resolve, reject) => {
    const ping = (n) => {
      const req = http.get(url, (res) => { res.resume(); resolve(); });
      req.on('error', () => {
        if (n <= 0) return reject(new Error('Vite dev server did not start'));
        setTimeout(() => ping(n - 1), 500);
      });
    };
    ping(tries);
  });
}

(async () => {
  const devServer = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, BROWSER: 'none' }
  });

  try {
    await waitForServer(URL);
  } catch (e) {
    devServer.kill('SIGTERM');
    console.error(e.message);
    process.exit(1);
  }

  const electron = spawn(electronPath, ['.'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, VITE_DEV_SERVER_URL: URL }
  });

  const cleanup = () => {
    try { electron.kill('SIGTERM'); } catch {}
    try { devServer.kill('SIGTERM'); } catch {}
    process.exit(0);
  };
  electron.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
})();
