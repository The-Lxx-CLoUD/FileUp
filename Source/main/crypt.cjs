'use strict';
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const MAGIC = Buffer.from('FENC1', 'ascii');
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const HEADER_LEN = MAGIC.length + SALT_LEN + IV_LEN;
const CHUNK = 4 * 1024 * 1024;
const ALGORITHM = 'aes-256-gcm';
const KDF = 'scrypt';
const SCRYPT_OPTS = { N: 32768, r: 8, p: 1, maxmem: 536870912 };
const NOT_FENC = 'Not a FileUp encrypted file (FENC1).';
const BAD_AUTH = 'Wrong password or corrupted file.';

const requirePassword = (password) => {
  const pw = typeof password === 'string' ? password : String(password ?? '');
  if (!pw) throw new Error('Password is required.');
  return pw;
};

const deriveKey = (password, salt) => crypto.scryptSync(requirePassword(password), salt, 32, SCRYPT_OPTS);

const exists = async (p) => { try { await fsp.access(p); return true; } catch { return false; } };


async function encryptFile(filePath, password, opts = {}) {
  const outPath = opts.outPath ? path.resolve(opts.outPath) : filePath + '.fenc';
  if (await exists(outPath) && !opts.overwrite) {
    throw new Error(`Output file already exists: ${outPath}`);
  }
  await fsp.access(filePath); 

  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = deriveKey(password, salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const header = Buffer.concat([MAGIC, salt, iv]);

  const fh = await fsp.open(outPath, 'w');
  let ok = false;
  try {
    await fh.write(header); 
    const rs = fs.createReadStream(filePath, { highWaterMark: CHUNK });
    for await (const chunk of rs) {
      const enc = cipher.update(chunk);
      if (enc.length) await fh.write(enc);
    }
    const tail = cipher.final(); 
    if (tail.length) await fh.write(tail);
    await fh.write(cipher.getAuthTag()); 
    ok = true;
  } finally {
    await fh.close().catch(() => { });
    if (!ok) await fsp.rm(outPath, { force: true }).catch(() => { });
  }

  const st = await fsp.stat(outPath);
  return { outputPath: outPath, size: st.size, algorithm: ALGORITHM, kdf: KDF };
}


async function decryptFile(filePath, password, opts = {}) {
  const st = await fsp.stat(filePath);
  if (st.size < HEADER_LEN + TAG_LEN) throw new Error(NOT_FENC);

  const fh = await fsp.open(filePath, 'r');
  let head, tag;
  try {
    head = Buffer.alloc(HEADER_LEN);
    const h = await fh.read(head, 0, HEADER_LEN, 0);
    if (h.bytesRead !== HEADER_LEN || !head.subarray(0, MAGIC.length).equals(MAGIC)) {
      throw new Error(NOT_FENC);
    }
    tag = Buffer.alloc(TAG_LEN);
    const t = await fh.read(tag, 0, TAG_LEN, st.size - TAG_LEN);
    if (t.bytesRead !== TAG_LEN) throw new Error(NOT_FENC);
  } finally {
    await fh.close().catch(() => { });
  }

  const salt = head.subarray(MAGIC.length, MAGIC.length + SALT_LEN);
  const iv = head.subarray(MAGIC.length + SALT_LEN, HEADER_LEN);
  const cipherLen = st.size - HEADER_LEN - TAG_LEN;
  if (cipherLen < 0) throw new Error(NOT_FENC);

  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let outPath;
  if (opts.outPath) {
    outPath = path.resolve(opts.outPath);
  } else {
    outPath = /\.fenc$/i.test(filePath) ? filePath.slice(0, -5) : filePath + '.dec';
  }
  if (await exists(outPath) && !opts.overwrite) {
    throw new Error(`Output file already exists: ${outPath}`);
  }

  const out = await fsp.open(outPath, 'w');
  let ok = false;
  try {
    if (cipherLen > 0) {
      
      const rs = fs.createReadStream(filePath, {
        start: HEADER_LEN,
        end: st.size - TAG_LEN - 1,
        highWaterMark: CHUNK
      });
      for await (const chunk of rs) {
        const dec = decipher.update(chunk);
        if (dec.length) await out.write(dec);
      }
    }
    const tail = decipher.final();
    if (tail.length) await out.write(tail);
    ok = true;
  } catch (e) {
    
    if (e && typeof e.code === 'string' && ['ENOENT', 'EACCES', 'EPERM', 'EISDIR'].includes(e.code)) throw e;
    throw new Error(BAD_AUTH);
  } finally {
    await out.close().catch(() => { });
    if (!ok) await fsp.rm(outPath, { force: true }).catch(() => { });
  }

  const outStat = await fsp.stat(outPath);
  return { outputPath: outPath, size: outStat.size };
}

module.exports = { encryptFile, decryptFile };
