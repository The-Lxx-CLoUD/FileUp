'use strict';
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const AdmZip = require('adm-zip');

const UNSUPPORTED = 'Unsupported archive format. FileUp supports ZIP archives.';

const isZipName = (p) => /\.zip$/i.test(String(p || ''));
const assertZipPath = (p) => { if (!isZipName(p)) throw new Error(UNSUPPORTED); };


function openZip(archivePath) {
  if (!fs.existsSync(archivePath)) throw new Error(`Archive not found: ${archivePath}`);
  try {
    return new AdmZip(archivePath);
  } catch {
    throw new Error(UNSUPPORTED);
  }
}


function isUnsafeEntryName(entryName) {
  const name = String(entryName || '');
  if (name.split(/[\\/]/).some((seg) => seg === '..')) return true;  
  if (name.startsWith('/') || /^[a-zA-Z]:/.test(name)) return true;  
  return false;
}


async function listArchive(archivePath) {
  assertZipPath(archivePath);
  const zip = openZip(archivePath);
  const entries = [];
  let totalUncompressed = 0, totalCompressed = 0;
  for (const e of zip.getEntries()) {
    const isDir = typeof e.isDirectory === 'function' ? e.isDirectory() : !!e.isDirectory;
    const raw = e.header && e.header.time;
    const date = raw instanceof Date && !isNaN(raw) ? raw.toISOString() : new Date(0).toISOString();
    entries.push({
      path: String(e.entryName).replace(/^\/+/, ''),
      size: e.header.size,
      compressedSize: e.header.compressedSize,
      isDir,
      date
    });
    totalUncompressed += e.header.size;
    totalCompressed += e.header.compressedSize;
  }
  return { entries, count: entries.length, totalUncompressed, totalCompressed };
}


async function extractArchive(archivePath, destDir) {
  assertZipPath(archivePath);
  const zip = openZip(archivePath);
  const entries = zip.getEntries();
  for (const e of entries) {
    if (isUnsafeEntryName(e.entryName)) {
      throw new Error(`Blocked unsafe zip entry "${e.entryName}" (zip-slip protection).`);
    }
  }
  await fsp.mkdir(destDir, { recursive: true });
  zip.extractAllTo(destDir, true);
  let bytes = 0;
  for (const e of entries) {
    const isDir = typeof e.isDirectory === 'function' ? e.isDirectory() : !!e.isDirectory;
    if (!isDir) bytes += e.header.size;
  }
  return { count: entries.length, bytes };
}


async function createArchive(archivePath, sourcePaths) {
  assertZipPath(archivePath);
  const sources = Array.isArray(sourcePaths) ? sourcePaths : [sourcePaths];
  if (!sources.length) throw new Error('No source paths given for archive creation.');
  const zip = new AdmZip();
  for (const src of sources) {
    let st;
    try { st = await fsp.stat(src); }
    catch { throw new Error(`Source not found: ${src}`); }
    const base = path.basename(src);
    if (st.isDirectory()) {
      zip.addFile(base + '/', Buffer.alloc(0)); 
      zip.addLocalFolder(src, base);            
    } else {
      zip.addLocalFile(src, '');                
    }
  }
  zip.writeZip(archivePath);
  const out = await fsp.stat(archivePath);
  return { count: zip.getEntries().length, bytes: out.size };
}

module.exports = { listArchive, extractArchive, createArchive };
