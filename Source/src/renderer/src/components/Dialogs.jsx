import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store.jsx';
import { formatBytes, formatDate, typeLabel, basename } from '../lib/fmt.js';
import { makeT } from '../lib/i18n.js';
import { FileTypeIcon, Logo, IInfo, IWarn, ITrash, IShred, IRename, IHash, IDup, ISettings, ISparkle, ICheck, ITelegram } from '../icons.jsx';
import { TOOL_DIALOGS } from './ToolsDialogs.jsx';

export default function DialogHost() {
  const { dialogs } = useApp();
  if (!dialogs.length) return null;
  return (
    <>
      {dialogs.map(d => (
        <DialogShell key={d.id} dialog={d} />
      ))}
    </>
  );
}

function DialogShell({ dialog }) {
  const app = useApp();
  const Comp = {
    prompt: PromptDialog,
    confirm: ConfirmDialog,
    properties: PropertiesDialog,
    batchRename: BatchRenameDialog,
    duplicates: DuplicatesDialog,
    secureDelete: SecureDeleteDialog,
    settings: SettingsDialog,
    about: AboutDialog,
    ...TOOL_DIALOGS
  }[dialog.type] || ConfirmDialog;
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) app.closeDialog(dialog.id, null); }}>
      <Comp dialog={dialog} />
    </div>
  );
}

function PromptDialog({ dialog }) {
  const app = useApp();
  const { title, label, value = '', okText = 'OK', selectBase } = dialog.props;
  const [val, setVal] = useState(value);
  const [err, setErr] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    if (selectBase) {
      const dot = val.lastIndexOf('.');
      if (dot > 0) el.setSelectionRange(0, dot);
      else el.select();
    } else {
      el.select();
    }
   
  }, []);

  const submit = () => {
    const v = val.trim();
    if (!v) { setErr('Please enter a name.'); return; }
    if (/[\\/:*?"<>|]/.test(v)) { setErr('Name contains invalid characters.'); return; }
    app.closeDialog(dialog.id, v);
  };

  return (
    <div className="dialog">
      <div className="dlg-head">
        <div className="d-ic"><IRename size={17} /></div>
        <div className="dlg-title">{title}</div>
      </div>
      <div className="dlg-body">
        <div className="field">
          <label>{label}</label>
          <input
            ref={inputRef}
            type="text"
            value={val}
            onChange={(e) => { setVal(e.target.value); setErr(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            spellCheck={false}
          />
          {err && <span className="err">{err}</span>}
        </div>
      </div>
      <div className="dlg-foot">
        <button className="btn" onClick={() => app.closeDialog(dialog.id, null)}>Cancel</button>
        <button className="btn primary" onClick={submit}>{okText}</button>
      </div>
    </div>
  );
}

function ConfirmDialog({ dialog }) {
  const app = useApp();
  const { title = 'Are you sure?', message = '', detail, confirmText = 'Confirm', danger } = dialog.props;
  return (
    <div className="dialog">
      <div className="dlg-head">
        <div className={`d-ic ${danger ? 'danger' : ''}`}>{danger ? <IWarn size={17} /> : <IInfo size={17} />}</div>
        <div className="dlg-title">{title}</div>
      </div>
      <div className="dlg-body">
        <div className="dlg-msg">{message}</div>
        {detail && <div className="dlg-msg" style={{ fontSize: 12, color: 'var(--muted)' }}>{detail}</div>}
      </div>
      <div className="dlg-foot">
        <button className="btn" onClick={() => app.closeDialog(dialog.id, false)}>Cancel</button>
        <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={() => app.closeDialog(dialog.id, true)}>{confirmText}</button>
      </div>
    </div>
  );
}


function SecureDeleteDialog({ dialog }) {
  const app = useApp();
  const { entries = [] } = dialog.props;
  const [phase, setPhase] = useState('confirm'); 
  const [result, setResult] = useState(null);
  const [taskId] = useState(() => `shred-${Date.now()}`);

  useEffect(() => {
    const off = app.api.on && app.api.on('task:progress', (p) => {
      if (p.id === taskId && p.done) {  }
    });
    return () => { off && off(); };
    
  }, []);

  const run = async () => {
    setPhase('running');
    try {
      const res = await app.api.fs.shred(entries.map(e => e.path), 3, taskId);
      setResult(res);
      setPhase('done');
      app.refreshPaths(entries.map(e => app.fmt.parentPath(e.path)));
      if (res.done.length) app.toast('success', `${res.done.length} item(s) securely shredded`);
      if (res.errors && res.errors.length) app.toast('error', res.errors[0], 5000);
    } catch (e) {
      setResult({ done: [], errors: [e.message] });
      setPhase('done');
    }
  };

  const totalSize = entries.reduce((a, e) => a + (e.isDir ? 0 : e.size), 0);

  if (phase === 'confirm') {
    return (
      <div className="dialog">
        <div className="dlg-head">
          <div className="d-ic danger"><IShred size={17} /></div>
          <div className="dlg-title">Secure Shred</div>
        </div>
        <div className="dlg-body">
          <div className="dlg-msg">
            Permanently destroy <span className="hl">{entries.length}</span> item(s)
            {totalSize > 0 && <> (<span className="hl num">{formatBytes(totalSize)}</span>)</>}?
          </div>
          <div className="dlg-msg" style={{ fontSize: 12, color: 'var(--muted)' }}>
            Files are overwritten 3 times (random data + zeros), renamed randomly, then deleted.
            <br />⚠ This cannot be undone — items do NOT go to the trash. On SSD storage, wear-leveling may still leave traces; for absolute certainty use full-disk encryption.
          </div>
          <div style={{ maxHeight: 130, overflowY: 'auto', fontSize: 12, color: 'var(--text-dim)', background: 'var(--input)', borderRadius: 9, padding: '8px 11px' }}>
            {entries.slice(0, 30).map(e => <div key={e.path} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dir="ltr">• {e.name}</div>)}
            {entries.length > 30 && <div>… and {entries.length - 30} more</div>}
          </div>
        </div>
        <div className="dlg-foot">
          <button className="btn" onClick={() => app.closeDialog(dialog.id, false)}>Cancel</button>
          <button className="btn danger" onClick={run}><IShred size={14} /> Shred Forever</button>
        </div>
      </div>
    );
  }

  if (phase === 'running') {
    return (
      <div className="dialog">
        <div className="dlg-head">
          <div className="d-ic danger"><IShred size={17} /></div>
          <div className="dlg-title">Shredding…</div>
        </div>
        <div className="dlg-body">
          <div className="dlg-msg">Overwriting files securely. Please keep the app open.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="spinner" style={{ width: 18, height: 18 }} />
            <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>Writing random data + zeros (3 passes)</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dialog">
      <div className="dlg-head">
        <div className="d-ic"><ICheck size={17} /></div>
        <div className="dlg-title">Shred Complete</div>
      </div>
      <div className="dlg-body">
        <div className="dlg-msg">
          <span className="hl">{result && result.done.length}</span> item(s) destroyed.
          {result && result.errors && result.errors.length > 0 && (
            <><br /><span style={{ color: 'var(--danger)' }}>{result.errors.length} failed: {result.errors[0]}</span></>
          )}
        </div>
      </div>
      <div className="dlg-foot">
        <button className="btn primary" onClick={() => app.closeDialog(dialog.id, true)}>Done</button>
      </div>
    </div>
  );
}


function PropertiesDialog({ dialog }) {
  const app = useApp();
  const { path, entry } = dialog.props;
  const [stat, setStat] = useState(null);
  const [dirInfo, setDirInfo] = useState(null);
  const [dirCalc, setDirCalc] = useState(false);
  const [hashes, setHashes] = useState({});
  const [hashBusy, setHashBusy] = useState({});
  const hashProgress = useRef({});
  const [, force] = useState(0);

  useEffect(() => {
    let alive = true;
    app.api.fs.stat(path).then(s => alive && setStat(s)).catch(() => { });
    return () => { alive = false; };
    
  }, [path]);

  const isDir = stat ? stat.isDir : (entry ? entry.isDir : false);

  const calcDir = async () => {
    setDirCalc(true);
    try {
      const res = await app.api.fs.dirSize(path, `dirsize-${Date.now()}`);
      setDirInfo(res);
    } catch { setDirInfo(null); }
    setDirCalc(false);
  };

  const computeHash = async (algo) => {
    if (isDir) return;
    setHashBusy(h => ({ ...h, [algo]: 0 }));
    const id = `hash-${algo}-${Date.now()}`;
    const off = app.api.on && app.api.on('task:progress', (p) => {
      if (p.id === id) { hashProgress.current[algo] = p.frac; force(x => x + 1); }
    });
    try {
      const hex = await app.api.fs.hash(path, algo, id);
      setHashes(h => ({ ...h, [algo]: hex }));
    } catch (e) {
      setHashes(h => ({ ...h, [algo]: `Error: ${e.message}` }));
    }
    off && off();
    setHashBusy(h => ({ ...h, [algo]: false }));
  };

  const copyVal = (v) => { app.api.app.copyText(v); app.toast('info', 'Copied to clipboard'); };

  return (
    <div className="dialog">
      <div className="dlg-head">
        <div className="d-ic"><IInfo size={17} /></div>
        <div className="dlg-title" style={{ wordBreak: 'break-all' }}>Properties — {basename(path)}</div>
      </div>
      <div className="dlg-body">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <FileTypeIcon entry={{ isDir, ext: entry ? entry.ext : path.split('.').pop().toLowerCase() }} size={54} />
          <div style={{ fontSize: 14, fontWeight: 700, wordBreak: 'break-all' }}>{basename(path)}</div>
        </div>

        <div className="props-grid">
          <div className="pp-row"><span className="k">Type</span><span className="v">{isDir ? 'Folder' : typeLabel(entry || { ext: '', isDir: false })}</span></div>
          <div className="pp-row"><span className="k">Location</span><span className="v" title={path} style={{ maxWidth: 320 }}>{app.fmt.parentPath(path)}</span></div>
          {stat && !isDir && <div className="pp-row"><span className="k">Size</span><span className="v num">{formatBytes(stat.size)} ({stat.size.toLocaleString()} bytes)</span></div>}
          {isDir && (
            <div className="pp-row">
              <span className="k">Contents</span>
              <span className="v num">
                {dirCalc ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span className="spinner" /> calculating…</span>
                  : dirInfo ? `${dirInfo.files.toLocaleString()} files, ${dirInfo.folders.toLocaleString()} folders · ${formatBytes(dirInfo.total)}`
                    : <button className="btn" style={{ height: 26, fontSize: 12 }} onClick={calcDir}>Calculate size</button>}
              </span>
            </div>
          )}
          {stat && <>
            <div className="pp-row"><span className="k">Created</span><span className="v num">{formatDate(stat.birthtimeMs)}</span></div>
            <div className="pp-row"><span className="k">Modified</span><span className="v num">{formatDate(stat.mtimeMs)}</span></div>
            <div className="pp-row"><span className="k">Accessed</span><span className="v num">{formatDate(stat.atimeMs)}</span></div>
          </>}
        </div>

        {!isDir && (
          <>
            <div className="section-title"><IHash size={13} /> Checksums</div>
            {['md5', 'sha1', 'sha256'].map(algo => (
              <div className="hash-row" key={algo}>
                <span className="algo">{algo.toUpperCase()}</span>
                {hashes[algo] ? (
                  <>
                    <span className="val" title={hashes[algo]}>{hashes[algo]}</span>
                    <button className="mini-btn" title="Copy" onClick={() => copyVal(hashes[algo])}><ICheck size={13} /></button>
                  </>
                ) : hashBusy[algo] !== undefined && hashBusy[algo] !== false ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1 }}>
                    <div className="inline-progress"><div style={{ width: `${Math.round((hashProgress.current[algo] || 0) * 100)}%` }} /></div>
                    <span className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>{Math.round((hashProgress.current[algo] || 0) * 100)}%</span>
                  </span>
                ) : (
                  <button className="btn" style={{ height: 27, fontSize: 12 }} onClick={() => computeHash(algo)}>Calculate</button>
                )}
              </div>
            ))}
          </>
        )}
      </div>
      <div className="dlg-foot">
        <button className="btn primary" onClick={() => app.closeDialog(dialog.id, true)}>Close</button>
      </div>
    </div>
  );
}

function BatchRenameDialog({ dialog }) {
  const app = useApp();
  const t = app.activeTab;
  const initialEntries = dialog.props.entries || [];
  const names = initialEntries.map(e => e.name);
  const dir = t ? (t.search ? t.search.root : t.path) : '';

  const [mode, setMode] = useState('number');
  const [opts, setOpts] = useState({
    base: 'File', sep: '_', start: 1, pad: 3,
    find: '', replaceWith: '', ignoreCase: true, useRegex: false,
    prefix: '', suffix: '',
    caseMode: 'lower',
    changeExt: false, newExt: ''
  });
  const [plan, setPlan] = useState([]);
  const [applying, setApplying] = useState(false);

  const set = (patch) => setOpts(o => ({ ...o, ...patch }));

  useEffect(() => {
    let alive = true;
    const id = setTimeout(async () => {
      try {
        const p = await app.api.fs.renamePlan(dir, names, { mode, ...opts });
        if (alive) setPlan(p);
      } catch {  }
    }, 200);
    return () => { alive = false; clearTimeout(id); };
    
  }, [mode, opts]);

  const changed = plan.filter(p => p.from !== p.to);
  const errors = plan.filter(p => p.error);
  const errCount = errors.length;

  const apply = async () => {
    setApplying(true);
    try {
      const res = await app.api.fs.renameApply(dir, plan);
      if (res.renamed) app.toast('success', `${res.renamed} file(s) renamed`);
      if (res.errors && res.errors.length) app.toast('error', res.errors[0], 5000);
      app.refreshPaths([dir]);
      app.closeDialog(dialog.id, true);
    } catch (e) {
      app.toast('error', e.message);
      setApplying(false);
    }
  };

  return (
    <div className="dialog wide">
      <div className="dlg-head">
        <div className="d-ic"><IRename size={17} /></div>
        <div className="dlg-title">Batch Rename — {names.length} item(s)</div>
      </div>
      <div className="dlg-body">
        <div className="mode-tabs">
          {[['number', 'Numbering'], ['replace', 'Find & Replace'], ['affix', 'Prefix / Suffix'], ['case', 'Case']].map(([k, label]) => (
            <button key={k} className={`radio-card ${mode === k ? 'active' : ''}`} onClick={() => setMode(k)}>{label}</button>
          ))}
        </div>

        {mode === 'number' && (
          <div className="field-row">
            <div className="field"><label>Base name</label><input type="text" value={opts.base} onChange={e => set({ base: e.target.value })} /></div>
            <div className="field" style={{ maxWidth: 80 }}><label>Separator</label><input type="text" value={opts.sep} onChange={e => set({ sep: e.target.value })} /></div>
            <div className="field" style={{ maxWidth: 90 }}><label>Start at</label><input type="number" value={opts.start} min={0} onChange={e => set({ start: +e.target.value })} /></div>
            <div className="field" style={{ maxWidth: 90 }}><label>Digits</label><input type="number" value={opts.pad} min={1} max={8} onChange={e => set({ pad: +e.target.value })} /></div>
          </div>
        )}
        {mode === 'replace' && (
          <div className="field-row">
            <div className="field"><label>Find</label><input type="text" value={opts.find} onChange={e => set({ find: e.target.value })} placeholder="text to find" /></div>
            <div className="field"><label>Replace with</label><input type="text" value={opts.replaceWith} onChange={e => set({ replaceWith: e.target.value })} placeholder="replacement" /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'flex-end', paddingBottom: 2 }}>
              <span style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 12 }}>
                <span className={`switch ${opts.ignoreCase ? 'on' : ''}`} onClick={() => set({ ignoreCase: !opts.ignoreCase })} /> Ignore case
              </span>
              <span style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 12 }}>
                <span className={`switch ${opts.useRegex ? 'on' : ''}`} onClick={() => set({ useRegex: !opts.useRegex })} /> Regex
              </span>
            </div>
          </div>
        )}
        {mode === 'affix' && (
          <div className="field-row">
            <div className="field"><label>Prefix</label><input type="text" value={opts.prefix} onChange={e => set({ prefix: e.target.value })} placeholder="before name" /></div>
            <div className="field"><label>Suffix</label><input type="text" value={opts.suffix} onChange={e => set({ suffix: e.target.value })} placeholder="after name" /></div>
          </div>
        )}
        {mode === 'case' && (
          <div className="radio-cards">
            {['lower', 'upper', 'title'].map(c => (
              <button key={c} className={`radio-card ${opts.caseMode === c ? 'active' : ''}`} onClick={() => set({ caseMode: c })}>
                {c === 'lower' ? 'lowercase' : c === 'upper' ? 'UPPERCASE' : 'Title Case'}
              </button>
            ))}
          </div>
        )}

        <div className="field-row" style={{ alignItems: 'center' }}>
          <span style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 12.5 }}>
            <span className={`switch ${opts.changeExt ? 'on' : ''}`} onClick={() => set({ changeExt: !opts.changeExt })} />
            Change extension
          </span>
          {opts.changeExt && (
            <div className="field" style={{ maxWidth: 140 }}>
              <input type="text" value={opts.newExt} onChange={e => set({ newExt: e.target.value })} placeholder="e.g. txt" />
            </div>
          )}
        </div>

        <div className="preview-table">
          <table>
            <thead><tr><th>Current</th><th></th><th>New</th></tr></thead>
            <tbody>
              {plan.slice(0, 200).map((p, i) => (
                <tr key={i} className={p.error ? 'has-error' : ''}>
                  <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.from}</td>
                  <td className="arrow">→</td>
                  <td className="new-name">
                    {p.from === p.to ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(unchanged)</span> : p.to}
                    {p.error ? <span style={{ color: 'var(--danger)', fontWeight: 400 }}> — {p.error}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="dlg-foot">
        <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>
          {changed.length} will be renamed{errCount ? <span style={{ color: 'var(--danger)' }}> · {errCount} issue(s)</span> : ''}
        </span>
        <button className="btn" onClick={() => app.closeDialog(dialog.id, null)}>Cancel</button>
        <button className="btn primary" disabled={changed.length === 0 || errCount > 0 || applying} onClick={apply}>
          {applying ? 'Renaming…' : 'Rename All'}
        </button>
      </div>
    </div>
  );
}


function DuplicatesDialog({ dialog }) {
  const app = useApp();
  const { root } = dialog.props;
  const [scanRoot, setScanRoot] = useState(root || '');
  const [minKB, setMinKB] = useState(64);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [running, setRunning] = useState(false);
  const [prog, setProg] = useState(null);
  const [groups, setGroups] = useState([]);
  const [checked, setChecked] = useState({}); 
  const [stats, setStats] = useState(null);
  const taskIdRef = useRef(`dup-${Date.now()}`);

  const start = async () => {
    setRunning(true); setGroups([]); setChecked({}); setStats(null); setProg({ stage: 'scan', scanned: 0 });
    const off = app.api.on && app.api.on('task:progress', (p) => {
      if (p.id === taskIdRef.current) setProg(p);
    });
    try {
      const res = await app.api.fs.dupScan(scanRoot, { showHidden: includeHidden, minSize: Math.max(1, minKB) * 1024 }, taskIdRef.current);
      setGroups(res.groups || []);
      setStats({ scanned: res.scanned, hashed: res.hashed });
      const initChecked = {};
      (res.groups || []).forEach(g => g.files.forEach((f, i) => { initChecked[f.path] = i > 0; }));
      setChecked(initChecked);
    } catch (e) {
      app.toast('error', `Scan failed: ${e.message}`);
    }
    off && off();
    setRunning(false);
  };

  const cancel = () => { app.api.fs.dupCancel(taskIdRef.current); };

  const selectedPaths = Object.keys(checked).filter(p => checked[p]);
  const selectedSize = selectedPaths.reduce((a, p) => {
    for (const g of groups) { const f = g.files.find(x => x.path === p); if (f) return a + f.size; }
    return a;
  }, 0);

  const deleteSelected = async (shred) => {
    if (!selectedPaths.length) return;
    if (shred) {
      const entries = selectedPaths.map(p => ({ path: p, name: basename(p), size: 0, isDir: false }));
      app.closeDialog(dialog.id, null);
      app.openDialog('secureDelete', { entries });
      return;
    }
    const ok = await app.confirmDialog({
      title: 'Move Duplicates to Trash',
      message: `Move ${selectedPaths.length} duplicate file(s) (${formatBytes(selectedSize)}) to trash?`,
      confirmText: 'Move to Trash'
    });
    if (!ok) return;
    const res = await app.api.fs.trash(selectedPaths);
    if (res.ok) app.toast('success', `${selectedPaths.length} duplicate(s) moved to trash`);
    else app.toast('error', res.errors[0], 5000);
   
    setGroups(gs => {
      const next = gs.map(g => ({ ...g, files: g.files.filter(f => !selectedPaths.includes(f.path)) })).filter(g => g.files.length > 1);
      setChecked(() => {
        const c = {};
        next.forEach(g => g.files.forEach((f, i) => { c[f.path] = i > 0; }));
        return c;
      });
      return next;
    });
    app.refreshPaths([scanRoot]);
  };

  const wasted = groups.reduce((a, g) => a + g.size * (g.files.length - 1), 0);

  return (
    <div className="dialog xwide">
      <div className="dlg-head">
        <div className="d-ic"><IDup size={17} /></div>
        <div className="dlg-title">Duplicate File Finder</div>
      </div>
      <div className="dlg-body">
        <div className="dup-toolbar">
          <div className="field" style={{ flex: '2 1 260px' }}>
            <label>Folder to scan</label>
            <input type="text" value={scanRoot} onChange={e => setScanRoot(e.target.value)} disabled={running} dir="ltr" />
          </div>
          <div className="field" style={{ flex: '0 1 110px' }}>
            <label>Min size (KB)</label>
            <input type="number" value={minKB} min={1} onChange={e => setMinKB(+e.target.value)} disabled={running} />
          </div>
          <span style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 12.5, paddingBottom: 8 }}>
            <span className={`switch ${includeHidden ? 'on' : ''}`} onClick={() => !running && setIncludeHidden(!includeHidden)} />
            Hidden
          </span>
          <button className="btn primary" onClick={running ? cancel : start} style={{ marginBottom: 2 }}>
            {running ? 'Cancel Scan' : 'Scan'}
          </button>
        </div>

        {running && prog && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--muted)' }}>
            <span className="spinner" />
            {prog.stage === 'scan' ? `Scanning… ${prog.scanned.toLocaleString()} files` : `Hashing… ${prog.hashed || 0} / ${prog.totalToHash || '?'}`}
          </div>
        )}

        {stats && !running && (
          <div className="dup-summary">
            <div className="stat-card"><div className="v num">{stats.scanned.toLocaleString()}</div><div className="k">Files scanned</div></div>
            <div className="stat-card"><div className="v num">{groups.length}</div><div className="k">Duplicate groups</div></div>
            <div className="stat-card"><div className="v num">{formatBytes(wasted)}</div><div className="k">Reclaimable space</div></div>
          </div>
        )}

        {groups.length > 0 && (
          <div className="dup-groups">
            {groups.map((g, gi) => (
              <div className="dup-group" key={g.hash + gi}>
                <div className="dg-head">
                  <span className="n">{g.files.length} identical files</span>
                  <span className="num">· {formatBytes(g.size)} each</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 10.5 }} title={g.hash}>{g.hash.slice(0, 12)}…</span>
                </div>
                {g.files.map((f, fi) => (
                  <label className="dup-file" key={f.path} title={f.path}>
                    <input
                      type="checkbox"
                      checked={!!checked[f.path]}
                      onChange={(e) => setChecked(c => ({ ...c, [f.path]: e.target.checked }))}
                      disabled={running}
                    />
                    <span className="df-path">{f.path}</span>
                    {fi === 0 && <span className="df-keep">KEEP</span>}
                    <span className="df-size num">{formatBytes(f.size)}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}

        {stats && groups.length === 0 && !running && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '12px 0' }}>No duplicate files found 🎉</div>
        )}
      </div>
      <div className="dlg-foot">
        <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>
          {selectedPaths.length ? `${selectedPaths.length} selected · ${formatBytes(selectedSize)}` : 'First file in each group is kept by default'}
        </span>
        <button className="btn" disabled={!selectedPaths.length} onClick={() => deleteSelected(true)}>Secure Shred…</button>
        <button className="btn danger" disabled={!selectedPaths.length} onClick={() => deleteSelected(false)}>Move to Trash</button>
        <button className="btn" onClick={() => app.closeDialog(dialog.id, null)}>Close</button>
      </div>
    </div>
  );
}

function LangRow() {
  const app = useApp();
  const tr = makeT(app.cfg.lang || 'en');
  return (
    <div className="switch-row">
      <div><div className="sw-label">{tr('language')}</div><div className="sw-desc">{tr('language_desc')}</div></div>
      <div className="radio-cards">
        <button className={`radio-card ${(app.cfg.lang || 'en') === 'en' ? 'active' : ''}`} onClick={() => app.patchCfg({ lang: 'en' })}>English</button>
        <button className={`radio-card ${app.cfg.lang === 'fa' ? 'active' : ''}`} onClick={() => app.patchCfg({ lang: 'fa' })}>فارسی</button>
      </div>
    </div>
  );
}

function SettingsDialog({ dialog }) {
  const app = useApp();
  const { cfg } = app;
  const Row = ({ title, desc, children }) => (
    <div className="switch-row">
      <div><div className="sw-label">{title}</div>{desc && <div className="sw-desc">{desc}</div>}</div>
      {children}
    </div>
  );
  return (
    <div className="dialog">
      <div className="dlg-head">
        <div className="d-ic"><ISettings size={17} /></div>
        <div className="dlg-title">Settings</div>
      </div>
      <div className="dlg-body">
        <div className="settings-rows">
          <Row title="Theme" desc="Switch between dark and light appearance">
            <div className="radio-cards">
              <button className={`radio-card ${cfg.theme === 'dark' ? 'active' : ''}`} onClick={() => app.patchCfg({ theme: 'dark' })}>🌙 Dark</button>
              <button className={`radio-card ${cfg.theme === 'light' ? 'active' : ''}`} onClick={() => app.patchCfg({ theme: 'light' })}>☀️ Light</button>
            </div>
          </Row>
          <Row title="Default view" desc="How folders open by default">
            <div className="radio-cards">
              <button className={`radio-card ${cfg.viewMode === 'details' ? 'active' : ''}`} onClick={() => app.patchCfg({ viewMode: 'details' })}>Details</button>
              <button className={`radio-card ${cfg.viewMode === 'grid' ? 'active' : ''}`} onClick={() => app.patchCfg({ viewMode: 'grid' })}>Grid</button>
            </div>
          </Row>
          <Row title="Show hidden files" desc="Show dotfiles and system-hidden entries">
            <span className={`switch ${cfg.showHidden ? 'on' : ''}`} onClick={() => app.toggleHidden()} />
          </Row>
          <Row title="Confirm before deleting" desc="Ask before moving items to the trash">
            <span className={`switch ${cfg.confirmDelete ? 'on' : ''}`} onClick={() => app.patchCfg({ confirmDelete: !cfg.confirmDelete })} />
          </Row>
          <Row title="Preview panel" desc="Show the file preview sidebar">
            <span className={`switch ${cfg.previewVisible ? 'on' : ''}`} onClick={() => app.patchCfg({ previewVisible: !cfg.previewVisible })} />
          </Row>
          <LangRow />
        </div>
      </div>
      <div className="dlg-foot">
        <button className="btn primary" onClick={() => app.closeDialog(dialog.id, true)}>Done</button>
      </div>
    </div>
  );
}

function AboutDialog({ dialog }) {
  const app = useApp();
  const tr = makeT(app.cfg.lang || 'en');
  const [info, setInfo] = useState(null);
  useEffect(() => { app.api.app.infoFull().then(setInfo).catch(() => app.api.app.info().then(setInfo).catch(() => { })); }, [app.api]);
  return (
    <div className="dialog">
      <div className="dlg-head">
        <div className="dlg-title">About</div>
      </div>
      <div className="dlg-body">
        <div className="about">
          <div className="logo-big"><Logo size={64} /></div>
          <div className="an">File<span>Up</span></div>
          <div className="av">Version {info ? info.version : '3.0.1'}{info && info.edition ? ` — ${info.edition}` : ''}</div>
          <div className="dev">{tr('about_dev')} <b>TheLxxCLoUD</b></div>
          <a
            className="tg-link"
            href="https://t.me/lxxcloud"
            onClick={(e) => { e.preventDefault(); try { window.open('https://t.me/lxxcloud', '_blank'); } catch { } }}
            title="https://t.me/lxxcloud"
          >
            <ITelegram size={14} /> {tr('about_tg')}: @lxxcloud
          </a>
          <span className="badge"><ISparkle size={12} /> Fast · Modern · Cross-Platform</span>
          <div className="meta">
            A professional file manager for Windows &amp; Linux.<br />
            {info && <>Electron {info.electron} · Node {info.node} · React 18<br />{info.hostname} — {info.user}<br /></>}
            © 2026 TheLxxCLoUD. MIT License.
          </div>
        </div>
      </div>
      <div className="dlg-foot">
        <button className="btn primary" onClick={() => app.closeDialog(dialog.id, true)}>Close</button>
      </div>
    </div>
  );
}
