const WIN = process.platform === 'win32';
const INVALID_NAME_CHARS = WIN ? /[\\/:*?"<>|]/ : /\//;
function isHiddenName(name) {
  if (name.startsWith('.')) return true;
  if (WIN && (name.startsWith('$') || name === 'System Volume Information' || name === 'pagefile.sys' || name === 'hiberfil.sys' || name === 'swapfile.sys')) return true;
  if (!WIN && name === 'lost+found') return true;
  return false;
}

function sanitizeName(name, kind = 'name') {
  const n = String(name || '').trim();
  if (!n) throw Object.assign(new Error('Please enter a ' + kind + '.'), { code: 'EINVAL' });
  if (n === '.' || n === '..') throw Object.assign(new Error('Invalid ' + kind + '.'), { code: 'EINVAL' });
  if (INVALID_NAME_CHARS.test(n)) throw Object.assign(new Error(`A ${kind} cannot contain ${WIN ? '\\ / : * ? " < > |' : '/'} characters.`), { code: 'EINVAL' });
  if (n.endsWith(' ') || n.endsWith('.')) {
    if (WIN) throw Object.assign(new Error('A ' + kind + ' cannot end with a space or dot on Windows.'), { code: 'EINVAL' });
  }
  if (n.length > 255) throw Object.assign(new Error('Name is too long.'), { code: 'EINVAL' });
  return n;
}

function buildNewName(name, idx, opts) {
  const ext = path_extname(name);
  const stem = name.slice(0, name.length - ext.length);
  let nn = stem;
  opts = opts || {};
  switch (opts.mode) {
    case 'number': {
      const base = opts.base ?? 'File';
      const sep = opts.sep ?? '_';
      const start = Number(opts.start ?? 1) || 1;
      const pad = Math.max(1, Number(opts.pad ?? 3) || 3);
      nn = `${base}${sep}${String(start + idx).padStart(pad, '0')}`;
      break;
    }
    case 'replace': {
      const find = opts.find ?? '';
      const rep = opts.replaceWith ?? '';
      if (!find) { nn = stem; break; }
      if (opts.useRegex) {
        try { nn = stem.replace(new RegExp(find, opts.regexIgnoreCase ? 'gi' : 'g'), rep); }
        catch { nn = stem; }
      } else {
        nn = opts.ignoreCase
          ? stem.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), rep)
          : stem.split(find).join(rep);
      }
      break;
    }
    case 'affix': {
      nn = `${opts.prefix || ''}${stem}${opts.suffix || ''}`;
      break;
    }
    case 'case': {
      const m = opts.caseMode || 'lower';
      if (m === 'lower') nn = stem.toLowerCase();
      else if (m === 'upper') nn = stem.toUpperCase();
      else if (m === 'title') nn = stem.toLowerCase().replace(/(^|[\s\-_.])(\p{L})/gu, (s) => s.toUpperCase());
      break;
    }
    default: nn = stem;
  }
  let finalExt = ext;
  if (opts.changeExt && opts.newExt !== undefined && opts.newExt !== null && opts.newExt !== '') {
    finalExt = '.' + String(opts.newExt).replace(/^\./, '').toLowerCase();
  }
  const out = (nn || stem) + finalExt;
  if (out !== name && INVALID_NAME_CHARS.test(out)) throw Object.assign(new Error('New name contains invalid characters.'), { code: 'EINVAL' });
  return out;
}

function path_extname(p) {
  const base = p.split(/[\\/]/).pop() || '';
  const i = base.lastIndexOf('.');
  if (i <= 0) return '';
  return base.slice(i);
}

module.exports = { WIN, INVALID_NAME_CHARS, isHiddenName, sanitizeName, buildNewName, path_extname };
