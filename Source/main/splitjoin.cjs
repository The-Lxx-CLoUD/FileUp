'use strict';
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { pipeline } = require('stream/promises');

const DEFAULT_PART_SIZE = 20971520; 
const COPY_BUF = 4 * 1024 * 1024;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exists = async (p) => { try { await fsp.access(p); return true; } catch { return false; } };


function partPad(totalParts) {
  return Math.max(2, String(Math.max(0, totalParts - 1)).length);
}
async function splitFile(filePath, opts = {}) {
  filePath = path.resolve(filePath);
  const st = await fsp.stat(filePath);
  if (!st.isFile()) throw new Error(`Not a regular file: ${filePath}`);
  const partSize = Math.floor(Number(opts.partSize) || DEFAULT_PART_SIZE);
  if (!(partSize > 0)) throw new Error('partSize must be a positive number of bytes.');
  const outDir = opts.outDir ? path.resolve(opts.outDir) : path.dirname(filePath);
  await fsp.mkdir(outDir, { recursive: true });

  const base = path.basename(filePath);
  const totalParts = Math.max(1, Math.ceil(st.size / partSize));
  const pad = partPad(totalParts);
  const names = [];
  for (let i = 0; i < totalParts; i++) {
    names.push(base + '.part' + String(i).padStart(pad, '0'));
  }

  const staleRe = new RegExp('^' + escapeRe(base) + '\\.part\\d+$');
  for (const name of await fsp.readdir(outDir)) {
    if (staleRe.test(name)) await fsp.rm(path.join(outDir, name), { force: true });
  }

  const parts = [];
  for (let i = 0; i < totalParts; i++) {
    const partPath = path.join(outDir, names[i]);
    const start = i * partSize;
    const end = Math.min(st.size, start + partSize) - 1;
    if (st.size === 0) {
      await fsp.writeFile(partPath, Buffer.alloc(0));
    } else {
      const rs = fs.createReadStream(filePath, { start, end, highWaterMark: COPY_BUF });
      const ws = fs.createWriteStream(partPath);
      await pipeline(rs, ws);
    }
    parts.push(partPath);
  }

  const q = (n) => '"' + n + '"';
  const rejoinBat = path.join(outDir, base + '.rejoin.bat');
  const rejoinSh = path.join(outDir, base + '.rejoin.sh');
  const bat = [
    '@echo off',
    'cd /d "%~dp0"',
    'copy /b ' + names.map(q).join('+') + ' ' + q(base) + ' > rejoin.log',
    'echo Done.',
    ''
  ].join('\r\n');
  const sh = [
    '#!/usr/bin/env bash',
    'set -e',
    'cd "$(dirname "$0")"',
    'cat ' + names.map(q).join(' ') + ' > ' + q(base),
    'echo ' + q('Rejoined: ' + base),
    ''
  ].join('\n');
  await fsp.writeFile(rejoinBat, bat, 'utf8');
  await fsp.writeFile(rejoinSh, sh, 'utf8');
  await fsp.chmod(rejoinSh, 0o755).catch(() => {  });

  return { parts, totalParts, originalSize: st.size, partSize, rejoinBat, rejoinSh };
}

async function* eachPartChunk(partPaths) {
  for (const p of partPaths) {
    const rs = fs.createReadStream(p, { highWaterMark: COPY_BUF });
    try {
      yield* rs;
    } finally {
      rs.destroy(); 
    }
  }
}

async function joinParts(firstPartPath, opts = {}) {
  firstPartPath = path.resolve(firstPartPath);
  const dir = path.dirname(firstPartPath);
  const name = path.basename(firstPartPath);
  const m = name.match(/^(.*)\.part(\d+)$/);
  if (!m) throw new Error(`Not a split part file (expected "<name>.partNN"): ${name}`);
  const base = m[1];

  const partRe = new RegExp('^' + escapeRe(base) + '\\.part(\\d+)$');
  const found = [];
  for (const entry of await fsp.readdir(dir)) {
    const mm = entry.match(partRe);
    if (mm) found.push({ name: entry, num: parseInt(mm[1], 10) });
  }
  if (!found.length) throw new Error(`No parts found for "${base}" in ${dir}.`);
  found.sort((a, b) => a.num - b.num);

  let expected = 0;
  for (const p of found) {
    if (p.num !== expected) throw new Error(`Missing part ${expected} — cannot rejoin.`);
    expected++;
  }
  const partPaths = found.map((p) => path.join(dir, p.name));

  let outputPath;
  if (opts.outputPath) {
    outputPath = path.resolve(opts.outputPath);
  } else {
    outputPath = path.join(dir, base);
    const ext = path.extname(outputPath);
    const stem = outputPath.slice(0, outputPath.length - ext.length);
    for (let i = 1; await exists(outputPath); i++) {
      outputPath = stem + ' (' + i + ')' + ext;
    }
  }

  const ws = fs.createWriteStream(outputPath);
  try {
    await pipeline(eachPartChunk(partPaths), ws);
  } catch (e) {
    if (!opts.outputPath) await fsp.rm(outputPath, { force: true }).catch(() => { });
    throw e;
  }

  const outStat = await fsp.stat(outputPath);
  return { outputPath, size: outStat.size, partsUsed: partPaths.length };
}

module.exports = { splitFile, joinParts, DEFAULT_PART_SIZE };
