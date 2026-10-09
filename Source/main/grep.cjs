'use strict';
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const readline = require('readline');
const TEXT_SLICE = 500;        
const SNIFF_BYTES = 8192;      



function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function buildRegex(pattern, { isRegex = false, caseSensitive = false, wholeWord = false } = {}) {
  let src = String(pattern ?? '');
  if (!src) throw new Error('Empty search pattern');
  if (!isRegex) src = escapeRegex(src);
  if (wholeWord && !isRegex) src = '\\b(?:' + src + ')\\b';
  const flags = caseSensitive ? 'g' : 'gi';
  try {
    return new RegExp(src, flags);
  } catch (e) {
    throw new Error(`Invalid ${isRegex ? 'regex' : 'pattern'}: ${e.message}`);
  }
}


function globListToMatcher(fileGlob) {
  const parts = String(fileGlob).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!parts.length) return null;
  const regexes = parts.map((g) => {
    let src = '';
    for (const ch of g) {
      if (ch === '*') src += '.*';
      else if (ch === '?') src += '.';
      else src += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp('^' + src + '$');
  });
  return (name) => regexes.some((rx) => rx.test(name.toLowerCase()));
}

async function looksBinary(p) {
  let fh;
  try { fh = await fsp.open(p, 'r'); } catch { return true; }
  try {
    const buf = Buffer.alloc(SNIFF_BYTES);
    const { bytesRead } = await fh.read(buf, 0, SNIFF_BYTES, 0);
    for (let i = 0; i < bytesRead; i++) if (buf[i] === 0) return true;
    return false;
  } catch { return true; }
  finally { try { await fh.close(); } catch { } }
}

async function walkFiles(root, { followSymlinks = false, token = null } = {}, visit) {
  const stack = [{ dir: root }];
  while (stack.length) {
    if (token && token.cancelled) throw new Error('Cancelled');
    const { dir } = stack.pop();
    let dirents;
    try { dirents = await fsp.readdir(dir, { withFileTypes: true }); }
    catch { continue; } 
    for (const d of dirents) {
      if (token && token.cancelled) throw new Error('Cancelled');
      const full = path.join(dir, d.name);
      let isDir = d.isDirectory();
      if (d.isSymbolicLink()) {
        if (!followSymlinks) continue; 
        try { isDir = (await fsp.stat(full)).isDirectory(); } catch { continue; }
      }
      if (isDir) { stack.push({ dir: full }); continue; }
      if (d.isFile() || d.isSymbolicLink()) await visit(full, d);
    }
  }
}



async function scanLines(file, rx, sink, token) {
  const stream = fs.createReadStream(file, { encoding: 'utf8', highWaterMark: 64 * 1024 });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lineNo = 0;
  try {
    for await (const line of rl) {
      if (token && token.cancelled) throw new Error('Cancelled');
      lineNo++;
      rx.lastIndex = 0;
      let m;
      while ((m = rx.exec(line)) !== null) {
        sink({
          file,
          line: lineNo,
          column: m.index + 1,
          text: line.length > TEXT_SLICE ? line.slice(0, TEXT_SLICE) : line
        });
        if (m.index === rx.lastIndex) rx.lastIndex++; 
      }
    }
  } finally {
    try { rl.close(); } catch { }
    try { stream.destroy(); } catch { }
  }
  return lineNo;
}



async function searchInFiles(opts, onProgress) {
  const o = opts || {};
  const {
    dir, pattern,
    isRegex = false, caseSensitive = false, wholeWord = false,
    fileGlob = null, maxResults = 2000, maxFileBytes = 8 * 1024 * 1024,
    followSymlinks = false, token = null
  } = o;
  if (!dir) throw new Error('searchInFiles: "dir" is required');
  if (!pattern) throw new Error('searchInFiles: "pattern" is required');

  const rx = buildRegex(pattern, { isRegex, caseSensitive, wholeWord });
  const globOk = fileGlob ? globListToMatcher(fileGlob) : null;

  const started = Date.now();
  const matches = [];
  const matchedFiles = new Set();
  let filesScanned = 0;
  let totalFound = 0;
  let truncated = false;

  await walkFiles(dir, { followSymlinks, token }, async (file) => {
    if (token && token.cancelled) throw new Error('Cancelled');
    if (globOk && !globOk(path.basename(file))) return;
    let st;
    try { st = await fsp.stat(file); } catch { return; }
    if (!st.isFile() || st.size > maxFileBytes) return;
    if (await looksBinary(file)) return; 

    filesScanned++;
    try {
      await scanLines(file, rx, (hit) => {
        totalFound++;
        if (totalFound <= maxResults) {
          matchedFiles.add(file);
          matches.push(hit);
        } else {
          truncated = true; 
        }
      }, token);
    } catch (e) {
      if ((token && token.cancelled) || e.message === 'Cancelled') throw e;
     
    }
    if (onProgress) { try { onProgress({ filesScanned }); } catch { } }
  });

  if (token && token.cancelled) throw new Error('Cancelled');

  return {
    matches,
    stats: {
      filesScanned,
      filesMatched: matchedFiles.size,
      matches: matches.length,
      truncated,
      elapsedMs: Date.now() - started
    }
  };
}

module.exports = { searchInFiles, buildRegex };
