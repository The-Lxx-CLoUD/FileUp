import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../store.jsx';
import { formatBytes } from '../lib/fmt.js';
import { makeT } from '../lib/i18n.js';
import {
  IZip, IScissors, IShield, ITextSearch, IChart, ICamera, IBroom, ICloud,
  IOpen, ICheck, IClose, IInfo, IFolder
} from '../icons.jsx';

function joinPath(dir, name) {
  if (!dir) return name;
  const sep = dir.includes('\\') ? '\\' : '/';
  return dir.endsWith(sep) ? dir + name : dir + sep + name;
}

function useT() {
  const app = useApp();
  return makeT(app.cfg.lang || 'en');
}

function Head({ icon: Ic, title }) {
  return (
    <div className="dlg-head">
      <div className="d-ic"><Ic size={17} /></div>
      <div className="dlg-title">{title}</div>
    </div>
  );
}

function PathRow({ label, value, onPick, pickTitle, disabled }) {
  const tr = useT();
  return (
    <div className="tb-field">
      <label>{label}</label>
      <div className="tb-path">
        <input value={value} readOnly placeholder={tr('file') + '…'} spellCheck={false} />
        <button className="btn" disabled={disabled} onClick={onPick}>{tr('browse')}</button>
      </div>
    </div>
  );
}

function Note({ children, kind = 'info' }) {
  return <div className={`tb-note ${kind}`}><IInfo size={13} /><span>{children}</span></div>;
}

function Stat({ v, l }) {
  return <div className="tb-stat"><div className="v">{v}</div><div className="l">{l}</div></div>;
}

function useErr() {
  const [err, setErr] = useState(null);
  const wrap = async (fn) => {
    setErr(null);
    try { return await fn(); }
    catch (e) { setErr(e.message || String(e)); return null; }
  };
  return [err, wrap, setErr];
}

export function ArchiveCreateDialog({ dialog }) {
  const app = useApp();
  const tr = useT();
  const [err, run] = useErr();
  const [sources, setSources] = useState(dialog.props.paths || []);
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);

  const pickFiles = async () => {
    const p = await app.api.pick.paths({ title: tr('tool_archive_create'), multi: true });
    if (p) setSources(s => [...s, ...p]);
  };
  const pickDir = async () => {
    const p = await app.api.pick.folder(tr('tool_archive_create'));
    if (p) setSources(s => [...s, p]);
  };
  const create = () => run(async () => {
    setBusy(true);
    try {
      const suggested = sources.length === 1
        ? joinPath(app.activeTab.path || '', (sources[0].split(/[\\/]/).pop() || 'Archive') + '.zip')
        : joinPath(app.activeTab.path || '', 'Archive.zip');
      const r = await app.api.tools.zipCreate(sources, out || suggested);
      setRes(r); app.toast('ok', `ZIP created: ${r.count} item(s), ${formatBytes(r.bytes)}`);
    } finally { setBusy(false); }
  });

  return (
    <div className="dialog tb-dlg">
      <Head icon={IZip} title={tr('tool_archive_create')} />
      <div className="dlg-body">
        {err && <Note kind="error">{err}</Note>}
        <div className="tb-field">
          <label>{tr('source')}</label>
          <div className="tb-chips">
            {sources.map((p, i) => (
              <span key={p + i} className="chip" title={p}>
                {p.split(/[\\/]/).pop()}
                <button onClick={() => setSources(s => s.filter((_, j) => j !== i))}><IClose size={10} /></button>
              </span>
            ))}
            <button className="btn sm" onClick={pickFiles}>+ {tr('file')}</button>
            <button className="btn sm" onClick={pickDir}>+ {tr('folder')}</button>
          </div>
        </div>
        <PathRow label={tr('destination')} value={out} onPick={async () => {
          const p = await app.api.pick.save({ title: tr('tool_archive_create'), defaultPath: joinPath(app.activeTab.path || '', 'Archive.zip'), filters: [{ name: 'ZIP archive', extensions: ['zip'] }] });
          if (p) setOut(p);
        }} />
        {res && (
          <div className="tb-ok">
            <ICheck size={14} /> {res.count} item(s) — {formatBytes(res.bytes)} · {res.count ? '' : ''}
            <button className="btn sm" onClick={() => app.api.fs.reveal(sources[0])}>{tr('refresh')}</button>
          </div>
        )}
        <Note>ZIP (deflate) · {tr('folder')} + {tr('file')}</Note>
      </div>
      <div className="dlg-foot">
        <button className="btn" onClick={() => app.closeDialog(dialog.id, null)}>{tr('close')}</button>
        <button className="btn primary" disabled={!sources.length || busy} onClick={create}>{busy ? '…' : tr('create')}</button>
      </div>
    </div>
  );
}

export function ArchiveExtractDialog({ dialog }) {
  const app = useApp();
  const tr = useT();
  const [err, run] = useErr();
  const [zip, setZip] = useState(dialog.props.path || '');
  const [dest, setDest] = useState('');
  const [entries, setEntries] = useState(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);

  const pick = async () => {
    const p = await app.api.pick.paths({ title: tr('tool_archive_extract'), filters: [{ name: 'ZIP archive', extensions: ['zip'] }] });
    if (!p) return;
    setZip(p); setEntries(null); setRes(null);
    setDest(joinPath(p.replace(/[\\/]+$/, '').replace(/\.[Zz][Ii][Pp]$/, ''), ''));
  };

  const inspect = () => run(async () => { setEntries(await app.api.tools.zipList(zip)); });

  const extract = () => run(async () => {
    setBusy(true);
    try {
      const r = await app.api.tools.zipExtract(zip, dest || undefined);
      if (r === null) { return; }
      setRes(r); app.toast('ok', `Extracted ${r.count} item(s) — ${formatBytes(r.bytes)}`);
    } finally { setBusy(false); }
  });

  return (
    <div className="dialog tb-dlg">
      <Head icon={IZip} title={tr('tool_archive_extract')} />
      <div className="dlg-body">
        {err && <Note kind="error">{err}</Note>}
        <PathRow label="ZIP" value={zip} onPick={pick} />
        <PathRow label={tr('destination')} value={dest} onPick={async () => {
          const d = await app.api.pick.folder('Extract to…');
          if (d) setDest(d);
        }} />
        <div className="tb-row">
          <button className="btn sm" disabled={!zip} onClick={inspect}>Contents</button>
        </div>
        {entries && (
          <div className="tb-list mono">
            {entries.entries.slice(0, 200).map(e => (
              <div key={e.path} className="tb-li">{e.isDir ? '📁' : '📄'} {e.path} {!e.isDir && <span className="dim">{formatBytes(e.size)}</span>}</div>
            ))}
            {entries.count > 200 && <div className="tb-li dim">… +{entries.count - 200} more</div>}
          </div>
        )}
        {res && <div className="tb-ok"><ICheck size={14} /> {res.count} item(s) → {formatBytes(res.bytes)}</div>}
      </div>
      <div className="dlg-foot">
        <button className="btn" onClick={() => app.closeDialog(dialog.id, null)}>{tr('close')}</button>
        <button className="btn primary" disabled={!zip || busy} onClick={extract}>{busy ? '…' : tr('extract')}</button>
      </div>
    </div>
  );
}

const SIZES = [
  { v: 5 * 1024 * 1024, l: '5 MB' },
  { v: 10 * 1024 * 1024, l: '10 MB' },
  { v: 20971520, l: '20 MB' },
  { v: 50 * 1024 * 1024, l: '50 MB' },
  { v: 100 * 1024 * 1024, l: '100 MB' }
];

export function SplitDialog({ dialog }) {
  const app = useApp();
  const tr = useT();
  const [err, run] = useErr();
  const [file, setFile] = useState(dialog.props.path || '');
  const [size, setSize] = useState(20971520);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);

  const pick = async () => {
    const p = await app.api.pick.paths({ title: tr('tool_split') });
    if (p) { setFile(p); setRes(null); }
  };

  const go = () => run(async () => {
    setBusy(true);
    try {
      const r = await app.api.tools.split(file, { partSize: size });
      setRes(r);
      app.toast('ok', `Split into ${r.totalParts} parts`);
    } finally { setBusy(false); }
  });

  return (
    <div className="dialog tb-dlg">
      <Head icon={IScissors} title={tr('tool_split')} />
      <div className="dlg-body">
        {err && <Note kind="error">{err}</Note>}
        <PathRow label={tr('file')} value={file} onPick={pick} />
        <div className="tb-field">
          <label>Part size</label>
          <div className="radio-cards">
            {SIZES.map(s => (
              <button key={s.v} className={`radio-card ${size === s.v ? 'active' : ''}`} onClick={() => setSize(s.v)}>{s.l}</button>
            ))}
          </div>
        </div>
        {res && (
          <div className="tb-ok col">
            <div><ICheck size={14} /> {res.totalParts} parts · {formatBytes(res.originalSize)}</div>
            <div className="tb-list mono small">
              {res.parts.map(p => <div key={p} className="tb-li">{p.split(/[\\/]/).pop()}</div>)}
            </div>
            <Note>Rejoin scripts: {res.rejoinBat.split(/[\\/]/).pop()} + {res.rejoinSh.split(/[\\/]/).pop()}</Note>
          </div>
        )}
        <Note kind="warn">Windows: run <b>rejoin .bat</b> — Linux/Mac: run <b>rejoin .sh</b></Note>
      </div>
      <div className="dlg-foot">
        <button className="btn" onClick={() => app.closeDialog(dialog.id, null)}>{tr('close')}</button>
        <button className="btn primary" disabled={!file || busy} onClick={go}>{busy ? '…' : tr('split')}</button>
      </div>
    </div>
  );
}

export function JoinDialog({ dialog }) {
  const app = useApp();
  const tr = useT();
  const [err, run] = useErr();
  const [part, setPart] = useState(dialog.props.path || '');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);

  const pick = async () => {
    const p = await app.api.pick.paths({ title: tr('tool_join') + ' — .part00' });
    if (p) { setPart(p); setRes(null); }
  };

  const go = () => run(async () => {
    setBusy(true);
    try {
      const r = await app.api.tools.join(part);
      setRes(r); app.toast('ok', `Rejoined: ${formatBytes(r.size)}`);
    } finally { setBusy(false); }
  });

  return (
    <div className="dialog tb-dlg">
      <Head icon={IScissors} title={tr('tool_join')} />
      <div className="dlg-body">
        {err && <Note kind="error">{err}</Note>}
        <PathRow label="First part (.part00)" value={part} onPick={pick} />
        {res && <div className="tb-ok"><ICheck size={14} /> {res.outputPath} — {formatBytes(res.size)} ({res.partsUsed} parts)</div>}
        <Note>Select the <b>.part00</b> file — the rest are found automatically.</Note>
      </div>
      <div className="dlg-foot">
        <button className="btn" onClick={() => app.closeDialog(dialog.id, null)}>{tr('close')}</button>
        <button className="btn primary" disabled={!part || busy} onClick={go}>{busy ? '…' : tr('join')}</button>
      </div>
    </div>
  );
}

export function CryptDialog({ dialog }) {
  const app = useApp();
  const tr = useT();
  const mode = dialog.props.mode || 'encrypt';
  const [err, run] = useErr();
  const [file, setFile] = useState(dialog.props.path || '');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);

  const pick = async () => {
    const p = await app.api.pick.paths({ title: mode === 'encrypt' ? tr('tool_encrypt') : tr('tool_decrypt'), filters: mode === 'decrypt' ? [{ name: 'FileUp encrypted', extensions: ['fenc'] }] : null });
    if (p) { setFile(p); setRes(null); }
  };

  const go = () => run(async () => {
    if (mode === 'encrypt' && pw.length < 4) throw new Error('Password must be at least 4 characters.');
    if (mode === 'encrypt' && pw !== pw2) throw new Error('Passwords do not match.');
    setBusy(true);
    try {
      const r = mode === 'encrypt'
        ? await app.api.tools.encrypt(file, pw)
        : await app.api.tools.decrypt(file, pw);
      setRes(r);
      app.toast('ok', (mode === 'encrypt' ? 'Encrypted → ' : 'Decrypted → ') + r.outputPath);
    } finally { setBusy(false); }
  });

  return (
    <div className="dialog tb-dlg">
      <Head icon={IShield} title={mode === 'encrypt' ? tr('tool_encrypt') : tr('tool_decrypt')} />
      <div className="dlg-body">
        {err && <Note kind="error">{err}</Note>}
        <PathRow label={tr('file')} value={file} onPick={pick} />
        <div className="tb-field">
          <label>{tr('password')}</label>
          <div className="tb-path">
            <input type={show ? 'text' : 'password'} value={pw} onChange={e => { setPw(e.target.value); setRes(null); }} spellCheck={false} autoFocus />
            <button className="btn" onClick={() => setShow(!show)}>{show ? '🙈' : '👁'}</button>
          </div>
        </div>
        {mode === 'encrypt' && (
          <div className="tb-field">
            <label>{tr('confirm_password')}</label>
            <input type={show ? 'text' : 'password'} value={pw2} onChange={e => setPw2(e.target.value)} spellCheck={false} />
          </div>
        )}
        {res && <div className="tb-ok"><ICheck size={14} /> {res.outputPath} — {formatBytes(res.size)}</div>}
        <Note>AES-256-GCM + scrypt · FileUp format <b>.fenc</b> · keep your password safe — it cannot be recovered.</Note>
      </div>
      <div className="dlg-foot">
        <button className="btn" onClick={() => app.closeDialog(dialog.id, null)}>{tr('close')}</button>
        <button className="btn primary" disabled={!file || !pw || busy} onClick={go}>{busy ? '…' : (mode === 'encrypt' ? tr('encrypt') : tr('decrypt'))}</button>
      </div>
    </div>
  );
}

export function GrepDialog({ dialog }) {
  const app = useApp();
  const tr = useT();
  const [err, run] = useErr();
  const [dir, setDir] = useState(dialog.props.dir || app.activeTab.path || '');
  const [q, setQ] = useState('');
  const [isRegex, setRegex] = useState(false);
  const [caseSensitive, setCase] = useState(false);
  const [wholeWord, setWhole] = useState(false);
  const [glob, setGlob] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [res, setRes] = useState(null);
  const runIdRef = useRef(0);

  const progress = busyId ? app.progress[busyId] : null;

  const pickDir = async () => {
    const d = await app.api.pick.folder(tr('tool_grep'), dir);
    if (d) setDir(d);
  };

  const stop = () => { if (busyId) app.api.tools.grepCancel(busyId); };

  const go = () => run(async () => {
    if (!q.trim()) throw new Error('Enter a search pattern.');
    const id = `grep-${++runIdRef.current}`;
    setBusyId(id); setRes(null);
    try {
      const r = await app.api.tools.grep({
        dir, pattern: q, isRegex, caseSensitive, wholeWord,
        fileGlob: glob.trim() || null, maxResults: 2000
      }, id);
      setRes(r);
    } finally { setBusyId(null); }
  });

  return (
    <div className="dialog tb-dlg wide">
      <Head icon={ITextSearch} title={tr('tool_grep')} />
      <div className="dlg-body">
        {err && <Note kind="error">{err}</Note>}
        <div className="tb-field">
          <label>{tr('folder')}</label>
          <div className="tb-path">
            <input value={dir} onChange={e => setDir(e.target.value)} spellCheck={false} />
            <button className="btn" onClick={pickDir}>{tr('browse')}</button>
          </div>
        </div>
        <div className="tb-field">
          <label>Pattern</label>
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !busyId) go(); }} placeholder="text or /regex/" spellCheck={false} autoFocus />
        </div>
        <div className="tb-opts">
          <label><input type="checkbox" checked={isRegex} onChange={e => setRegex(e.target.checked)} /> Regex</label>
          <label><input type="checkbox" checked={caseSensitive} onChange={e => setCase(e.target.checked)} /> Case sensitive</label>
          <label><input type="checkbox" checked={wholeWord} onChange={e => setWhole(e.target.checked)} /> Whole word</label>
          <input className="tb-glob" value={glob} onChange={e => setGlob(e.target.value)} placeholder="*.txt, *.js" spellCheck={false} />
        </div>
        {busyId && progress && <div className="tb-prog">Scanned {progress.filesScanned || 0} files…</div>}
        {res && (
          <>
            <div className="tb-sumrow">
              <Stat v={res.stats.matches} l="matches" />
              <Stat v={res.stats.filesMatched} l="files" />
              <Stat v={res.stats.filesScanned} l="scanned" />
              <Stat v={res.stats.truncated ? 'YES' : 'no'} l="truncated" />
            </div>
            <div className="tb-list mono">
              {res.matches.slice(0, 300).map((m, i) => (
                <div key={i} className="tb-li" title={m.file}>
                  <span className="dim">{m.file.split(/[\\/]/).pop()}:{m.line}</span> {m.text.slice(0, 160)}
                </div>
              ))}
              {res.matches.length > 300 && <div className="tb-li dim">… +{res.matches.length - 300} more</div>}
              {res.matches.length === 0 && <div className="tb-li dim">No matches.</div>}
            </div>
          </>
        )}
      </div>
      <div className="dlg-foot">
        <button className="btn" onClick={() => app.closeDialog(dialog.id, null)}>{tr('close')}</button>
        {busyId
          ? <button className="btn danger" onClick={stop}>{tr('stop')}</button>
          : <button className="btn primary" disabled={!dir || !q} onClick={go}>{tr('search')}</button>}
      </div>
    </div>
  );
}

export function ReportDialog({ dialog }) {
  const app = useApp();
  const tr = useT();
  const [err, run] = useErr();
  const [dir, setDir] = useState(dialog.props.dir || app.activeTab.path || '');
  const [res, setRes] = useState(null);

  const go = () => run(async () => setRes(await app.api.tools.report(dir)));

  return (
    <div className="dialog tb-dlg wide">
      <Head icon={IChart} title={tr('tool_report')} />
      <div className="dlg-body">
        {err && <Note kind="error">{err}</Note>}
        <div className="tb-field">
          <label>{tr('folder')}</label>
          <div className="tb-path">
            <input value={dir} onChange={e => setDir(e.target.value)} spellCheck={false} />
            <button className="btn" onClick={async () => { const d = await app.api.pick.folder(tr('tool_report'), dir); if (d) setDir(d); }}>{tr('browse')}</button>
          </div>
        </div>
        {res && (
          <>
            <div className="tb-sumrow">
              <Stat v={res.totalFiles} l="files" />
              <Stat v={res.totalDirs} l="folders" />
              <Stat v={res.humanTotalBytes} l="total size" />
              <Stat v={res.emptyDirs} l="empty dirs" />
            </div>
            <div className="tb-cols">
              <div>
                <div className="tb-h">Top types</div>
                <div className="tb-list mono">
                  {res.extensions.map(e => (
                    <div key={e.ext} className="tb-li"><b>.{e.ext || '—'}</b> ×{e.count} <span className="dim">{formatBytes(e.bytes)}</span></div>
                  ))}
                </div>
              </div>
              <div>
                <div className="tb-h">Largest files</div>
                <div className="tb-list mono">
                  {res.largestFiles.map(f => (
                    <div key={f.path} className="tb-li" title={f.path}>{f.path.split(/[\\/]/).pop()} <span className="dim">{formatBytes(f.size)}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="dlg-foot">
        <button className="btn" onClick={() => app.closeDialog(dialog.id, null)}>{tr('close')}</button>
        <button className="btn primary" disabled={!dir} onClick={go}>{tr('run')}</button>
      </div>
    </div>
  );
}

export function SnapshotDialog({ dialog }) {
  const app = useApp();
  const tr = useT();
  const [err, run] = useErr();
  const [dir, setDir] = useState(dialog.props.dir || app.activeTab.path || '');
  const [snaps, setSnaps] = useState(null);
  const [sel, setSel] = useState(null);
  const [diff, setDiff] = useState(null);
  const [busy, setBusy] = useState('');

  const refresh = () => run(async () => {
    setSnaps(await app.api.tools.snapList(dir));
  });

  const create = () => run(async () => {
    setBusy('create');
    try {
      const r = await app.api.tools.snapCreate(dir);
      app.toast('ok', `Snapshot saved: ${r.name} (${r.totalFiles} files)`);
      setSnaps(await app.api.tools.snapList(dir));
    } finally { setBusy(''); }
  });

  const compare = () => run(async () => {
    setBusy('compare');
    try { setDiff(await app.api.tools.snapCompare(sel.path, dir)); }
    finally { setBusy(''); }
  });

  const backup = () => run(async () => {
    setBusy('backup');
    try {
      const r = await app.api.tools.snapBackup(sel.path, dir);
      app.toast('ok', `Backed up ${r.copied.length} file(s)`);
      setDiff(await app.api.tools.snapCompare(sel.path, dir));
    } finally { setBusy(''); }
  });

  return (
    <div className="dialog tb-dlg wide">
      <Head icon={ICamera} title={tr('tool_snap')} />
      <div className="dlg-body">
        {err && <Note kind="error">{err}</Note>}
        <div className="tb-field">
          <label>{tr('folder')}</label>
          <div className="tb-path">
            <input value={dir} onChange={e => setDir(e.target.value)} spellCheck={false} />
            <button className="btn" onClick={async () => { const d = await app.api.pick.folder(tr('tool_snap'), dir); if (d) setDir(d); }}>{tr('browse')}</button>
          </div>
        </div>
        <div className="tb-row">
          <button className="btn primary sm" disabled={busy === 'create'} onClick={create}>{busy === 'create' ? '…' : '+ ' + tr('tool_snap')}</button>
          <button className="btn sm" onClick={refresh}>{tr('refresh')}</button>
        </div>
        {snaps && (
          <div className="tb-list">
            {snaps.length === 0 && <div className="tb-li dim">No snapshots yet.</div>}
            {snaps.map(s => (
              <div key={s.path} className={`tb-li sel-row ${sel && sel.path === s.path ? 'active' : ''}`} onClick={() => { setSel(s); setDiff(null); }}>
                <ICheck size={12} style={{ opacity: sel && sel.path === s.path ? 1 : 0 }} />
                <span>{s.name}</span>
                <span className="dim">{s.totalFiles} files · {formatBytes(s.totalBytes)}</span>
              </div>
            ))}
          </div>
        )}
        {sel && (
          <div className="tb-row">
            <button className="btn sm" disabled={busy === 'compare'} onClick={compare}>{busy === 'compare' ? '…' : 'Compare with folder'}</button>
          </div>
        )}
        {diff && (
          <div className="tb-ok col">
            <div className="tb-sumrow">
              <Stat v={diff.added.length} l="added" />
              <Stat v={diff.modified.length} l="modified" />
              <Stat v={diff.deleted.length} l="deleted" />
              <Stat v={diff.unchangedCount} l="unchanged" />
            </div>
            <div className="tb-list mono small">
              {diff.added.map(p => <div key={'a' + p} className="tb-li add">+ {p}</div>)}
              {diff.modified.map(p => <div key={'m' + p} className="tb-li mod">~ {p}</div>)}
              {diff.deleted.map(p => <div key={'d' + p} className="tb-li del">− {p}</div>)}
            </div>
            <button className="btn sm" disabled={busy === 'backup' || (!diff.added.length && !diff.modified.length)} onClick={backup}>
              {busy === 'backup' ? '…' : `Backup ${diff.added.length + diff.modified.length} changed file(s)`}
            </button>
          </div>
        )}
        <Note>Snapshots are stored in <b>FileUp-Snapshots/</b> inside the folder.</Note>
      </div>
      <div className="dlg-foot">
        <button className="btn" onClick={() => app.closeDialog(dialog.id, null)}>{tr('close')}</button>
      </div>
    </div>
  );
}

export function CleanupDialog({ dialog }) {
  const app = useApp();
  const tr = useT();
  const [err, run] = useErr();
  const [dir, setDir] = useState(dialog.props.dir || app.activeTab.path || '');
  const [res, setRes] = useState(null);
  const [picked, setPicked] = useState(new Set());
  const [busy, setBusy] = useState(false);

  const scan = () => run(async () => {
    setBusy(true);
    try {
      const r = await app.api.tools.junkScan([dir]);
      setRes(r);
      const all = new Set();
      for (const c of Object.keys(r.categories)) r.categories[c].forEach(x => all.add(x.path));
      setPicked(all);
    } finally { setBusy(false); }
  });

  const toggle = (p) => setPicked(prev => {
    const n = new Set(prev);
    n.has(p) ? n.delete(p) : n.add(p);
    return n;
  });

  const clean = () => run(async () => {
    const ok = await app.confirmDialog({ title: 'Clean junk files?', message: `Delete ${picked.size} item(s) permanently?`, danger: true });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await app.api.tools.junkClean([...picked]);
      app.toast('ok', `Removed ${r.removed} item(s) — freed ${formatBytes(r.freedBytes)}`);
      setRes(await app.api.tools.junkScan([dir]));
    } finally { setBusy(false); }
  });

  const CAT_LABEL = { tempFiles: 'Temp / backup files', logFiles: 'Log files', systemJunk: 'System junk (Thumbs.db, .DS_Store…)', emptyDirs: 'Empty folders' };

  return (
    <div className="dialog tb-dlg wide">
      <Head icon={IBroom} title={tr('tool_cleanup')} />
      <div className="dlg-body">
        {err && <Note kind="error">{err}</Note>}
        <div className="tb-field">
          <label>{tr('folder')}</label>
          <div className="tb-path">
            <input value={dir} onChange={e => setDir(e.target.value)} spellCheck={false} />
            <button className="btn" onClick={async () => { const d = await app.api.pick.folder(tr('tool_cleanup'), dir); if (d) setDir(d); }}>{tr('browse')}</button>
          </div>
        </div>
        <div className="tb-row">
          <button className="btn primary sm" disabled={busy} onClick={scan}>{busy ? '…' : tr('scan')}</button>
          {res && <span className="dim">{res.totals.count} item(s) · {res.humanBytes}</span>}
        </div>
        {res && (
          <>
            {Object.entries(res.categories).map(([cat, items]) => items.length > 0 && (
              <div key={cat} className="tb-cat">
                <div className="tb-h">{CAT_LABEL[cat] || cat} <span className="dim">({items.length})</span></div>
                <div className="tb-list mono small">
                  {items.slice(0, 60).map(x => (
                    <label key={x.path} className="tb-li check">
                      <input type="checkbox" checked={picked.has(x.path)} onChange={() => toggle(x.path)} />
                      <span className="cut">{x.path}</span>
                      {x.size ? <span className="dim">{formatBytes(x.size)}</span> : null}
                    </label>
                  ))}
                  {items.length > 60 && <div className="tb-li dim">… +{items.length - 60} more (all included in Clean)</div>}
                </div>
              </div>
            ))}
            {res.totals.count === 0 && <Note>Nothing to clean — this folder is already tidy.</Note>}
          </>
        )}
      </div>
      <div className="dlg-foot">
        <button className="btn" onClick={() => app.closeDialog(dialog.id, null)}>{tr('close')}</button>
        <button className="btn danger" disabled={!res || !picked.size || busy} onClick={clean}>{tr('clean')} ({picked.size})</button>
      </div>
    </div>
  );
}

export function RemoteDialog({ dialog }) {
  const app = useApp();
  const tr = useT();
  const [err, run] = useErr();
  const [protocol, setProtocol] = useState('sftp');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [user, setUser] = useState('');
  const [pw, setPw] = useState('');
  const [sess, setSess] = useState(null);
  const [path, setPath] = useState('.');
  const [entries, setEntries] = useState(null);
  const [busy, setBusy] = useState(false);

  const connect = () => run(async () => {
    if (!host.trim()) throw new Error('Host is required.');
    setBusy(true);
    try {
      const s = await app.api.tools.remoteConnect({
        protocol, host: host.trim(), port: port ? Number(port) : undefined, user: user || 'anonymous', password: pw
      });
      setSess(s);
      const r = await app.api.tools.remoteList(s.id, '.');
      setEntries(r.entries); setPath(r.path);
    } finally { setBusy(false); }
  });

  const nav = (p) => run(async () => {
    setBusy(true);
    try {
      const r = await app.api.tools.remoteList(sess.id, p);
      setEntries(r.entries); setPath(r.path);
    } finally { setBusy(false); }
  });

  const dl = (e) => run(async () => {
    const lp = await app.api.pick.save({ title: tr('download'), defaultPath: e.name });
    if (!lp) return;
    setBusy(true);
    try { await app.api.tools.remoteDownload(sess.id, joinPath(path, e.name), lp); app.toast('ok', `Downloaded: ${e.name}`); }
    finally { setBusy(false); }
  });

  const ul = () => run(async () => {
    const lp = await app.api.pick.paths({ title: tr('upload') });
    if (!lp) return;
    setBusy(true);
    try { await app.api.tools.remoteUpload(sess.id, lp, joinPath(path, lp.split(/[\\/]/).pop())); app.toast('ok', 'Uploaded.'); }
    finally { setBusy(false); }
  });

  const rm = (e) => run(async () => {
    const ok = await app.confirmDialog({ title: 'Delete remote item?', message: `${e.name} will be deleted on the server.`, danger: true });
    if (!ok) return;
    await app.api.tools.remoteRemove(sess.id, joinPath(path, e.name), e.isDir);
    nav(path);
  });

  const mk = () => run(async () => {
    const name = await app.promptDialog({ title: 'New remote folder', label: 'Folder name' });
    if (!name) return;
    await app.api.tools.remoteMkdir(sess.id, joinPath(path, name));
    nav(path);
  });

  const bye = () => run(async () => {
    await app.api.tools.remoteDisconnect(sess.id);
    setSess(null); setEntries(null);
  });

  return (
    <div className="dialog tb-dlg wide">
      <Head icon={ICloud} title={tr('tool_remote')} />
      <div className="dlg-body">
        {err && <Note kind="error">{err}</Note>}
        {!sess ? (
          <>
            <div className="tb-grid2">
              <div className="tb-field">
                <label>Protocol</label>
                <select value={protocol} onChange={e => setProtocol(e.target.value)}>
                  <option value="sftp">SFTP (SSH)</option>
                  <option value="ftp">FTP</option>
                </select>
              </div>
              <div className="tb-field">
                <label>Host</label>
                <input value={host} onChange={e => setHost(e.target.value)} placeholder="example.com" spellCheck={false} autoFocus />
              </div>
              <div className="tb-field">
                <label>Port</label>
                <input value={port} onChange={e => setPort(e.target.value)} placeholder={protocol === 'sftp' ? '22' : '21'} spellCheck={false} />
              </div>
              <div className="tb-field">
                <label>User</label>
                <input value={user} onChange={e => setUser(e.target.value)} spellCheck={false} />
              </div>
            </div>
            <div className="tb-field">
              <label>{tr('password')}</label>
              <input type="password" value={pw} onChange={e => setPw(e.target.value)} spellCheck={false} />
            </div>
          </>
        ) : (
          <>
            <div className="tb-row">
              <button className="btn sm" onClick={() => nav(path === '/' ? '/' : path.replace(/[\\/][^\\/]+$/, '') || '/')}>⬆</button>
              <span className="tb-crumbs mono">{path}</span>
              <button className="btn sm" onClick={() => nav(path)}>{tr('refresh')}</button>
              <button className="btn sm" onClick={mk}>+ {tr('folder')}</button>
              <button className="btn sm" onClick={ul}>{tr('upload')}</button>
              <button className="btn sm danger" onClick={bye}>{tr('disconnect')}</button>
            </div>
            <div className="tb-list mono">
              {entries && entries.length === 0 && <div className="tb-li dim">Empty directory.</div>}
              {entries && entries.map(e => (
                <div key={e.name} className="tb-li rrow" onDoubleClick={() => e.isDir && nav(e.path ? e.path : joinPath(path, e.name))}>
                  <span className="rname" onClick={() => e.isDir && nav(e.path ? e.path : joinPath(path, e.name))}>{e.isDir ? '📁' : '📄'} {e.name}</span>
                  <span className="dim">{e.isDir ? '' : formatBytes(e.size)}</span>
                  {!e.isDir && <button className="btn xs" onClick={() => dl(e)}>{tr('download')}</button>}
                  <button className="btn xs danger" onClick={() => rm(e)}>✕</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="dlg-foot">
        <button className="btn" onClick={() => app.closeDialog(dialog.id, null)}>{tr('close')}</button>
        {!sess && <button className="btn primary" disabled={busy} onClick={connect}>{busy ? '…' : tr('connect')}</button>}
      </div>
    </div>
  );
}

export const TOOL_DIALOGS = {
  archiveCreate: ArchiveCreateDialog,
  archiveExtract: ArchiveExtractDialog,
  split: SplitDialog,
  join: JoinDialog,
  encrypt: (p) => <CryptDialog {...p} mode="encrypt" />,
  decrypt: (p) => <CryptDialog {...p} mode="decrypt" />,
  grep: GrepDialog,
  report: ReportDialog,
  snapshot: SnapshotDialog,
  cleanup: CleanupDialog,
  remote: RemoteDialog
};
