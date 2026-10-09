'use strict';
const crypto = require('crypto');
const fs = require('fs');
const fsp = fs.promises;
const { pipeline } = require('stream').promises;
const basicFtp = require('basic-ftp');
const ssh2 = require('ssh2');

const sessions = new Map(); 

function getSession(id) {
  const s = sessions.get(id);
  if (!s) throw new Error('Not connected');
  return s;
}

function wrapError(prefix, e) {
  const raw = e ? (e.message || e.level || String(e)) : 'Unknown error';
  const err = new Error(`${prefix}: ${raw}`);
  if (e && e.code) err.code = e.code;
  return err;
}

function joinRemote(dir, name) {
  if (!dir || dir === '.') return name;
  return dir.endsWith('/') ? dir + name : dir + '/' + name;
}

function sftpCall(sftp, fn, ...args) {
  return new Promise((resolve, reject) => {
    try { sftp[fn](...args, (err, res) => (err ? reject(err) : resolve(res))); }
    catch (e) { reject(e); }
  });
}

function closeQuietly(session) {
  try {
    if (session.protocol === 'ftp') session.client.close();
    else session.client.end();
  } catch {  }
}

async function connect(config) {
  const cfg = config || {};
  const protocol = cfg.protocol === 'sftp' ? 'sftp' : cfg.protocol === 'ftp' ? 'ftp' : null;
  if (!protocol) throw new Error('connect: protocol must be "ftp" or "sftp"');
  if (!cfg.host) throw new Error('connect: host is required');

  let client = null, sftp = null;
  try {
    if (protocol === 'ftp') {
      client = new basicFtp.Client(15000);
      await client.access({
        host: cfg.host,
        port: cfg.port || 21,
        user: cfg.user,
        password: cfg.password,
        secure: !!cfg.secure
      });
    } else {
      client = new ssh2.Client();
      await new Promise((resolve, reject) => {
        const onError = (e) => reject(e);
        client.once('error', onError);
        client.once('ready', () => {
          client.removeListener('error', onError);
          client.on('error', () => {  });
          resolve();
        });
        client.connect({
          host: cfg.host,
          port: cfg.port || 22,
          username: cfg.user,
          password: cfg.password,
          readyTimeout: 20000
        });
      });
      sftp = await new Promise((resolve, reject) => client.sftp((err, s) => (err ? reject(err) : resolve(s))));
    }
  } catch (e) {
    if (client) closeQuietly({ protocol, client });
    throw wrapError(protocol === 'ftp' ? 'FTP connect failed' : 'SFTP connect failed', e);
  }

  const id = crypto.randomUUID();
  sessions.set(id, { protocol, client, sftp, config: { ...cfg, password: undefined } });
  return { id, protocol, host: cfg.host, user: cfg.user || null };
}

async function disconnect(id) {
  const s = sessions.get(id);
  if (!s) return false; 
  sessions.delete(id);
  closeQuietly(s);
  return true;
}

function listSessions() {
  const out = [];
  for (const [id, s] of sessions) {
    out.push({ id, protocol: s.protocol, host: s.config && s.config.host, user: s.config && s.config.user });
  }
  return out;
}


async function list(id, remotePath = '.') {
  const s = getSession(id);
  try {
    if (s.protocol === 'ftp') {
      const client = s.client;
      let resolved = remotePath;
      if (remotePath === '.') {
        try { resolved = await client.pwd(); } catch { resolved = remotePath; }
      }
      const raw = await client.list(resolved);
      const entries = raw.map((fi) => ({
        name: fi.name,
        path: joinRemote(resolved, fi.name),
        size: fi.size || 0,
        isDir: !!fi.isDirectory,
        modifiedAt: fi.modifiedAt instanceof Date && !isNaN(fi.modifiedAt) ? fi.modifiedAt.toISOString() : null
      }));
      return { entries, path: resolved };
    }

    const sftp = s.sftp;
    const names = await sftpCall(sftp, 'readdir', remotePath);
    let resolved = remotePath;
    try { resolved = await sftpCall(sftp, 'realpath', remotePath); } catch {  }
    const entries = [];
    const CONC = 16;
    for (let i = 0; i < names.length; i += CONC) {
      const chunk = names.slice(i, i + CONC);
      const metas = await Promise.all(chunk.map(async (ent) => {
        const name = ent.filename;
        const full = joinRemote(resolved, name);
        let size = 0, isDir = false, mtime = null;
        try {
          const st = await sftpCall(sftp, 'stat', full);
          isDir = st.isDirectory();
          size = st.size || 0;
          if (st.mtime) mtime = new Date(st.mtime * 1000);
        } catch {  }
        return {
          name, path: full, size, isDir,
          modifiedAt: mtime && !isNaN(mtime) ? mtime.toISOString() : null
        };
      }));
      entries.push(...metas);
    }
    return { entries, path: resolved };
  } catch (e) {
    if (e.message === 'Not connected') throw e;
    throw wrapError(s.protocol === 'ftp' ? 'FTP list failed' : 'SFTP list failed', e);
  }
}

async function downloadFile(id, remotePath, localPath) {
  const s = getSession(id);
  try {
    if (s.protocol === 'ftp') {
      await s.client.downloadTo(localPath, remotePath);
    } else {
      await pipeline(s.sftp.createReadStream(remotePath), fs.createWriteStream(localPath));
    }
    let size = 0;
    try { size = (await fsp.stat(localPath)).size; } catch { }
    return { localPath, size };
  } catch (e) {
    throw wrapError(s.protocol === 'ftp' ? 'FTP download failed' : 'SFTP download failed', e);
  }
}

async function uploadFile(id, localPath, remotePath) {
  const s = getSession(id);
  let size = 0;
  try { size = (await fsp.stat(localPath)).size; } catch { }
  try {
    if (s.protocol === 'ftp') {
      await s.client.uploadFrom(localPath, remotePath);
    } else {
      await pipeline(fs.createReadStream(localPath), s.sftp.createWriteStream(remotePath));
    }
    return { remotePath, size };
  } catch (e) {
    throw wrapError(s.protocol === 'ftp' ? 'FTP upload failed' : 'SFTP upload failed', e);
  }
}


async function mkdir(id, remotePath) {
  const s = getSession(id);
  try {
    if (s.protocol === 'ftp') {
      let prev = null;
      try { prev = await s.client.pwd(); } catch { }
      await s.client.ensureDir(remotePath);
      if (prev) { try { await s.client.cd(prev); } catch { } }
      return true;
    }
    try {
      await sftpCall(s.sftp, 'mkdir', remotePath);
    } catch (e) {
      let exists = false;
      try { exists = (await sftpCall(s.sftp, 'stat', remotePath)).isDirectory(); } catch { }
      if (!exists) throw e;
    }
    return true;
  } catch (e) {
    if (e.message === 'Not connected') throw e;
    throw wrapError(s.protocol === 'ftp' ? 'FTP mkdir failed' : 'SFTP mkdir failed', e);
  }
}

async function remove(id, remotePath, isDir = false) {
  const s = getSession(id);
  try {
    if (s.protocol === 'ftp') {
      if (isDir) await s.client.removeDir(remotePath);
      else await s.client.remove(remotePath);
    } else if (isDir) {
      await sftpCall(s.sftp, 'rmdir', remotePath);
    } else {
      await sftpCall(s.sftp, 'unlink', remotePath);
    }
    return true;
  } catch (e) {
    if (e.message === 'Not connected') throw e;
    throw wrapError(s.protocol === 'ftp' ? 'FTP remove failed' : 'SFTP remove failed', e);
  }
}

module.exports = { connect, disconnect, listSessions, list, downloadFile, uploadFile, mkdir, remove };
