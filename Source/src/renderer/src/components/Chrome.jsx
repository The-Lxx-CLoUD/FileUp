import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../store.jsx';
import { formatBytes } from '../lib/fmt.js';
import { ISearch, ICheck, IWarn, IInfo, IClose } from '../icons.jsx';

export function StatusBar() {
  const app = useApp();
  const t = app.activeTab;
  const [disk, setDisk] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!t) return;
    const id = setTimeout(() => {
      app.api.fs.statfs(t.path).then(d => alive && setDisk(d)).catch(() => { });
    }, 250);
    return () => { alive = false; clearTimeout(id); };
    
  }, [t && t.path]);

  if (!t) return null;
  const items = t.search ? t.search.items : t.items;
  const shown = app.applyFilter(items, t.filter).length;
  const hiddenCount = t.search ? 0 : Math.max(0, items.filter(i => i.hidden).length);

  let selInfo = null;
  if (t.sel.length) {
    const entries = t.sel.map(n => (t.search ? t.search.items : t.items).find(i => i.name === n)).filter(Boolean);
    const total = entries.reduce((a, e) => a + (e.isDir ? 0 : e.size), 0);
    selInfo = `${t.sel.length} selected · ${formatBytes(total)}`;
  }

  const runningSearch = t.search && t.search.running;

  return (
    <div className="statusbar">
      <span className="sb-item">{runningSearch
        ? <span className="sb-task"><span className="spinner" /> Searching “{t.search.query}”… {t.search.found || 0} found</span>
        : <>{shown} items{hiddenCount > 0 ? ` (${hiddenCount} hidden shown)` : ''}</>}
      </span>
      {selInfo && <span className="sb-item sb-accent num">{selInfo}</span>}
      <span className="grow" />
      {disk && disk.total > 0 && (
        <span className="sb-item num">{formatBytes(disk.free)} free of {formatBytes(disk.total)}</span>
      )}
    </div>
  );
}

export function ContextMenuHost() {
  const app = useApp();
  const { ctx } = app;
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!ctx) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let x = ctx.x, y = ctx.y;
    if (x + r.width > window.innerWidth - 8) x = window.innerWidth - r.width - 8;
    if (y + r.height > window.innerHeight - 8) y = window.innerHeight - r.height - 8;
    setPos({ x, y });
  }, [ctx]);

  if (!ctx) return null;

  const items = buildMenuItems(ctx.target, app);
  if (!items.length) return null;

  return (
    <>
      <div className="ctx-overlay" onMouseDown={app.closeCtx} onContextMenu={(e) => { e.preventDefault(); app.closeCtx(); }} />
      <div
        className="ctx-menu"
        ref={ref}
        style={{ left: pos ? pos.x : ctx.x, top: pos ? pos.y : ctx.y, visibility: pos ? 'visible' : 'hidden' }}
      >
        {items.map((it, i) => it.sep ? <div key={i} className="ctx-sep" /> : (
          <button
            key={i}
            className={`ctx-item ${it.danger ? 'danger' : ''}`}
            disabled={it.disabled}
            onClick={() => { app.closeCtx(); try { it.onClick && it.onClick(); } catch (e) { app.toast('error', e.message); } }}
          >
            {it.checked ? <span className="ctx-ic" style={{ width: 16 }}>✓</span> : null}
            <span className="ctx-label">{it.label}</span>
            {it.shortcut && <span className="ctx-sc">{it.shortcut}</span>}
          </button>
        ))}
      </div>
    </>
  );
}

function buildMenuItems(target, app) {
  const t = app.activeTab;
  const curPath = t ? (t.search ? t.search.root : t.path) : null;

  if (target.type === 'entry') {
    const en = target.entry;
    const isDir = en.isDir;
    return [
      { label: isDir ? 'Open' : 'Open', onClick: () => app.openEntry(en), shortcut: 'Enter' },
      ...(isDir ? [{ label: 'Open in New Tab', onClick: () => app.openTabTo(en.path) }] : []),
      { label: 'Reveal in System', onClick: () => app.api.fs.reveal(en.path) },
      ...(isDir ? [{ label: 'Open in Terminal', onClick: () => app.api.fs.terminal(en.path).catch(e => app.toast('error', e.message)) }] : []),
      { sep: true },
      { label: 'Cut', onClick: () => app.clipSet([en.path], 'cut'), shortcut: 'Ctrl+X' },
      { label: 'Copy', onClick: () => app.clipSet([en.path], 'copy'), shortcut: 'Ctrl+C' },
      ...(isDir ? [{ label: 'Paste Into', disabled: !app.clipboard.paths.length, onClick: () => app.paste(en.path), shortcut: 'Ctrl+V' }] : []),
      { sep: true },
      { label: 'Rename…', onClick: () => app.renameEntry(en), shortcut: 'F2', disabled: !en.canWrite },
      { label: 'Move to Trash', onClick: () => app.trashEntries([en]), shortcut: 'Del', disabled: !en.canWrite },
      { label: 'Secure Shred…', danger: true, onClick: () => app.openDialog('secureDelete', { entries: [en] }), disabled: !en.canWrite },
      { sep: true },
      ...(isDir ? [{ label: 'Bookmark Folder', onClick: async () => { await app.api.bookmarks.add(en.path); app.events.emit('bookmarks-changed'); app.toast('success', 'Folder bookmarked'); } }] : []),
      { label: 'Copy Path', onClick: () => { app.api.app.copyText(en.path); app.toast('info', 'Path copied'); } },
      { label: 'Find Duplicates Here', disabled: !isDir, onClick: () => app.openDialog('duplicates', { root: en.path }) },
      { sep: true },
      { label: 'Properties', onClick: () => app.openDialog('properties', { path: en.path, entry: en }), shortcut: 'Ctrl+P' }
    ];
  }

  if (target.type === 'blank') {
    return [
      { label: 'New Folder', onClick: () => curPath && app.newFolder(curPath), shortcut: 'Ctrl+Shift+N' },
      { label: 'New File', onClick: () => curPath && app.newFile(curPath) },
      { sep: true },
      { label: 'Paste', disabled: !app.clipboard.paths.length, onClick: () => curPath && app.paste(curPath), shortcut: 'Ctrl+V' },
      { label: 'Select All', onClick: () => curPath && app.selectAll(t.id), shortcut: 'Ctrl+A' },
      { sep: true },
      { label: app.cfg.showHidden ? '✓ Show Hidden Files' : 'Show Hidden Files', onClick: app.toggleHidden, shortcut: 'Ctrl+H' },
      { label: 'Refresh', onClick: () => app.refreshTab(t.id), shortcut: 'F5' },
      { sep: true },
      { label: 'Open in Terminal', onClick: () => curPath && app.api.fs.terminal(curPath).catch(e => app.toast('error', e.message)) },
      { label: 'Find Duplicates Here', onClick: () => curPath && app.openDialog('duplicates', { root: curPath }) },
      { label: 'Bookmark This Folder', onClick: app.bookmarkCurrent },
      { label: 'Folder Properties', onClick: () => curPath && app.openDialog('properties', { path: curPath }) }
    ];
  }

  if (target.type === 'sidebar' || target.type === 'tree' || target.type === 'bookmark') {
    const p = target.path;
    const isBm = target.type === 'bookmark';
    return [
      { label: 'Open', onClick: () => app.navigate(p) },
      { label: 'Open in New Tab', onClick: () => app.openTabTo(p) },
      { sep: true },
      { label: isBm ? 'Remove Bookmark' : 'Bookmark Folder', onClick: async () => {
        if (isBm) { await app.api.bookmarks.remove(p); app.toast('info', 'Bookmark removed'); }
        else { await app.api.bookmarks.add(p); app.toast('success', 'Folder bookmarked'); }
        app.events.emit('bookmarks-changed');
      } },
      { label: 'Open in Terminal', onClick: () => app.api.fs.terminal(p).catch(e => app.toast('error', e.message)) },
      { label: 'Copy Path', onClick: () => { app.api.app.copyText(p); app.toast('info', 'Path copied'); } },
      { sep: true },
      { label: 'Find Duplicates Here', onClick: () => app.openDialog('duplicates', { root: p }) },
      { label: 'Properties', onClick: () => app.openDialog('properties', { path: p }) }
    ];
  }
  return [];
}

export function ToastHost() {
  const { toasts } = useApp();
  return (
    <div className="toasts">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="t-ic">{t.type === 'success' ? <ICheck size={16} /> : t.type === 'error' ? <IWarn size={16} /> : <IInfo size={16} />}</span>
          <span className="t-msg">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

export function ProgressHost() {
  const app = useApp();
  const { progress } = app;
  const entries = Object.values(progress).filter(p => p.kind === 'shred' && !p.done);
  if (!entries.length) return null;
  const p = entries[entries.length - 1];
  const pct = Math.round((p.frac || 0) * 100);
  return (
    <div className="progress-card">
      <div className="pc-title"><span className="spinner" /> Secure Shred</div>
      <div className="pc-bar"><div style={{ width: `${pct}%` }} /></div>
      <div className="pc-row">
        <span className="num">{pct}%{p.total ? ` · file ${p.index}/${p.total}` : ''}</span>
        <span className="pc-cancel" onClick={() => app.toast('info', 'Shredding is fast — finishing current file')}>Overwriting…</span>
      </div>
    </div>
  );
}
