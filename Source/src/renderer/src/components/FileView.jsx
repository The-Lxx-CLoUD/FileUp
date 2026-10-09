import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileTypeIcon, IFolder, IFile } from '../icons.jsx';
import { formatBytes, formatDate, typeLabel, matchesQuery, basename } from '../lib/fmt.js';
import { useApp } from '../store.jsx';

const THUMB_CACHE = new Map();

export default function FileView() {
  const app = useApp();
  const t = app.activeTab;
  const containerRef = useRef(null);

  const items = t ? (t.search ? t.search.items : t.items) : [];
  const shown = useMemo(
    () => app.applyFilter(items, t ? t.filter : ''),
    [items, t ? t.filter : '', app]
  );

  const entryByName = useMemo(() => {
    const m = new Map();
    for (const it of shown) m.set(it.name, it);
    return m;
  }, [shown]);

  const clickRow = useCallback((e, entry, index) => {
    if (!t) return;
    if (e.ctrlKey || e.metaKey) {
      const sel = t.sel.includes(entry.name) ? t.sel.filter(n => n !== entry.name) : [...t.sel, entry.name];
      app.setSel(t.id, sel, entry.name);
    } else if (e.shiftKey && t.anchor) {
      const ai = shown.findIndex(x => x.name === t.anchor);
      if (ai !== -1) {
        const [s, b] = ai < index ? [ai, index] : [index, ai];
        app.setSel(t.id, shown.slice(s, b + 1).map(x => x.name), t.anchor);
      }
    } else {
      app.setSel(t.id, [entry.name], entry.name);
    }
  }, [app, t, shown]);

  const onBlankClick = useCallback((e) => {
    if (!t) return;
    if (e.target === e.currentTarget || e.target.classList.contains('files-container')) {
      app.clearSel(t.id);
    }
  }, [app, t]);

  const dragPaths = useCallback(() => {
    return t && t.sel.length ? t.sel.map(n => joinName(t.path, n)) : [];
  }, [t]);

  function joinName(base, name) {
    return base.endsWith('\\') || base.endsWith('/') ? base + name : base + (base.includes('\\') ? '\\' : '/') + name;
  }

  const onDragStart = (e, entry) => {
    if (!t) return;
    let sel = t.sel;
    if (!sel.includes(entry.name)) {
      app.setSel(t.id, [entry.name], entry.name);
      sel = [entry.name];
    }
    const paths = sel.map(n => joinName(t.path, n));
    e.dataTransfer.setData('application/x-fileup', JSON.stringify(paths));
    e.dataTransfer.setData('text/plain', paths.join('\n'));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const dirDrop = (entry) => entry.isDir ? app.dropTo(entry.path) : {};

  const emptySearch = t && t.search && !t.search.running && t.search.items.length === 0;

  if (!t) return null;

  return (
    <div className="file-area">
      <div
        className="files-container"
        ref={containerRef}
        onMouseDown={onBlankClick}
        tabIndex={0}
        onContextMenu={(e) => {
          if (e.target.closest('.dtable tbody tr') || e.target.closest('.gcard')) return;
          app.openCtx(e, { type: 'blank' });
        }}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => app.handleDrop(e, t.search ? t.search.root : t.path)}
      >
        {t.loading ? (
          <div className="empty-state"><div className="spinner" style={{ width: 26, height: 26 }} /></div>
        ) : t.error ? (
          <div className="empty-state">
            <div className="es-ic"><IFolder size={54} /></div>
            <div className="es-title">Cannot open this folder</div>
            <div className="es-sub">{t.error}</div>
            <button className="btn primary" style={{ pointerEvents: 'auto' }} onClick={() => app.refreshTab(t.id)}>Retry</button>
          </div>
        ) : emptySearch ? (
          <div className="empty-state">
            <div className="es-ic"><IFile size={54} /></div>
            <div className="es-title">No results found</div>
            <div className="es-sub">Nothing matches “{t.search.query}” under {basename(t.search.root)}</div>
          </div>
        ) : shown.length === 0 ? (
          <div className="empty-state">
            <div className="es-ic"><IFolder size={54} /></div>
            <div className="es-title">This folder is empty</div>
            <div className="es-sub">Drop files here, or create a new folder / file</div>
          </div>
        ) : app.cfg.viewMode === 'details' ? (
          <DetailsTable
            items={shown}
            t={t}
            clickRow={clickRow}
            onDragStart={onDragStart}
            dirDrop={dirDrop}
            sort={app.cfg.sort}
            onSort={app.setSort}
          />
        ) : (
          <GridView
            items={shown}
            t={t}
            clickRow={clickRow}
            onDragStart={onDragStart}
            dirDrop={dirDrop}
          />
        )}
      </div>

      {app.cfg.previewVisible && <PreviewPanel entryByName={entryByName} dragPaths={dragPaths} />}
    </div>
  );
}

function DetailsTable({ items, t, clickRow, onDragStart, dirDrop, sort, onSort }) {
  const app = useApp();
  const arrow = (by) => sort.by === by ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '';
  return (
    <table className="dtable">
      <thead>
        <tr>
          <th className={sort.by === 'name' ? 'sorted' : ''} onClick={() => onSort('name')}>
            <span className="th-inner">Name{arrow('name')}</span>
          </th>
          <th className="col-size num" onClick={() => onSort('size')}>
            <span className="th-inner">Size{arrow('size')}</span>
          </th>
          <th className="col-type" onClick={() => onSort('type')}>
            <span className="th-inner">Type{arrow('type')}</span>
          </th>
          <th className="col-date" onClick={() => onSort('modified')}>
            <span className="th-inner">Modified{arrow('modified')}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((en, i) => (
          <Row
            key={en.path} entry={en} index={i} t={t}
            clickRow={clickRow} onDragStart={onDragStart} dirDrop={dirDrop}
          />
        ))}
      </tbody>
    </table>
  );
}

function Row({ entry: en, index, t, clickRow, onDragStart, dirDrop }) {
  const app = useApp();
  const selected = t.sel.includes(en.name);
  return (
    <tr
      className={`${selected ? 'selected' : ''} ${en.hidden ? 'hidden-item' : ''}`}
      onClick={(e) => clickRow(e, en, index)}
      onDoubleClick={() => app.openEntry(en)}
      onContextMenu={(e) => {
        if (!t.sel.includes(en.name)) app.setSel(t.id, [en.name], en.name);
        app.openCtx(e, { type: 'entry', entry: en });
      }}
      draggable
      onDragStart={(e) => onDragStart(e, en)}
      {...dirDrop(en)}
    >
      <td>
        <div className="name-cell">
          <FileTypeIcon entry={en} size={20} />
          <span className="fname" title={en.name}>{en.name}</span>
          {!en.canWrite && <span className="lock" title="Read-only">🔒</span>}
        </div>
      </td>
      <td className="num">{en.isDir ? '—' : formatBytes(en.size)}</td>
      <td>{typeLabel(en)}</td>
      <td className="num">{formatDate(en.mtimeMs)}</td>
    </tr>
  );
}

function GridView({ items, t, clickRow, onDragStart, dirDrop }) {
  const app = useApp();
  return (
    <div className="grid-wrap">
      {items.map((en, i) => (
        <GridCard key={en.path} entry={en} index={i} t={t} clickRow={clickRow} onDragStart={onDragStart} dirDrop={dirDrop} />
      ))}
    </div>
  );
}

function GridCard({ entry: en, index, t, clickRow, onDragStart, dirDrop }) {
  const app = useApp();
  const selected = t.sel.includes(en.name);
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif', 'tiff', 'tif', 'ico'].includes(en.ext);
  const [thumb, setThumb] = useState(isImage ? THUMB_CACHE.get(en.path + en.mtimeMs) || null : null);

  useEffect(() => {
    if (!isImage || thumb) return;
    let alive = true;
    const id = setTimeout(async () => {
      const data = await app.api.fs.thumb(en.path, 128);
      if (!alive) return;
      if (data) {
        THUMB_CACHE.set(en.path + en.mtimeMs, data);
        setThumb(data);
      }
    }, 60);
    return () => { alive = false; clearTimeout(id); };
   
  }, [en.path]);

  return (
    <div
      className={`gcard ${selected ? 'selected' : ''} ${en.hidden ? 'hidden-item' : ''}`}
      onClick={(e) => clickRow(e, en, index)}
      onDoubleClick={() => app.openEntry(en)}
      onContextMenu={(e) => {
        if (!t.sel.includes(en.name)) app.setSel(t.id, [en.name], en.name);
        app.openCtx(e, { type: 'entry', entry: en });
      }}
      draggable
      onDragStart={(e) => onDragStart(e, en)}
      {...dirDrop(en)}
    >
      <div className="thumb">
        {thumb ? <img src={thumb} alt="" draggable={false} /> : <FileTypeIcon entry={en} size={48} />}
      </div>
      <div className="gname" title={en.name}>{en.name}</div>
    </div>
  );
}

function PreviewPanel({ entryByName }) {
  const app = useApp();
  const t = app.activeTab;
  const sel = t.sel || [];
  const [img, setImg] = useState(null);
  const [text, setText] = useState(null);
  const [textLoading, setTextLoading] = useState(false);

  const entry = sel.length === 1 ? entryByName.get(sel[0]) : null;

  useEffect(() => {
    setImg(null); setText(null);
    if (!entry || entry.isDir) return;
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif'].includes(entry.ext);
    if (isImage) {
      let alive = true;
      app.api.fs.previewImage(entry.path).then(d => alive && setImg(d));
      return () => { alive = false; };
    }
    const textExts = new Set(['txt', 'md', 'log', 'json', 'xml', 'yml', 'yaml', 'ini', 'cfg', 'conf', 'env', 'js', 'jsx', 'ts', 'tsx', 'py', 'c', 'cpp', 'h', 'cs', 'java', 'html', 'css', 'sh', 'bat', 'ps1', 'sql', 'toml', 'csv', 'properties', 'desktop', 'gitignore']);
    if (textExts.has(entry.ext) || (!entry.ext && entry.size < 512 * 1024)) {
      if (entry.size < 2 * 1024 * 1024) {
        let alive = true;
        setTextLoading(true);
        app.api.fs.textPreview(entry.path).then(res => {
          if (!alive) return;
          setTextLoading(false);
          if (res && !res.binary) setText(res);
        });
        return () => { alive = false; };
      }
    }
   
  }, [entry && entry.path, entry && entry.mtimeMs]);

  if (sel.length === 0) {
    return (
      <aside className="preview-panel">
        <div className="pp-head">Preview
          <button className="mini-btn" style={{ display: 'inline-flex', padding: 3, borderRadius: 5, color: 'var(--muted)' }} title="Hide preview" onClick={() => app.patchCfg({ previewVisible: false })}>✕</button>
        </div>
        <div className="pp-multi">
          <FileTypeIcon entry={{ isDir: false, ext: '' }} size={52} />
          <div>Select a file to preview</div>
        </div>
      </aside>
    );
  }

  if (sel.length > 1 || !entry) {
    const entries = sel.map(n => entryByName.get(n)).filter(Boolean);
    const totalSize = entries.reduce((a, e) => a + (e.isDir ? 0 : e.size), 0);
    return (
      <aside className="preview-panel">
        <div className="pp-head">Preview</div>
        <div className="pp-multi">
          <div className="big">{sel.length}</div>
          <div>items selected</div>
          <div className="num" style={{ color: 'var(--text-dim)' }}>{formatBytes(totalSize)} total</div>
        </div>
        <div className="pp-actions">
          <button className="tool-btn" onClick={() => app.clipSet(entries.map(e => e.path), 'copy')}><span>Copy</span></button>
          <button className="tool-btn" onClick={() => app.openDialog('confirm', {
            title: 'Move to Trash', message: `Move ${entries.length} item(s) to trash?`, confirmText: 'Move to Trash'
          }).then(ok => ok && app.trashEntries(entries))}>
            <span>Delete</span>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="preview-panel">
      <div className="pp-head">Preview
        <button className="mini-btn" style={{ display: 'inline-flex', padding: 3, borderRadius: 5, color: 'var(--muted)' }} title="Hide preview" onClick={() => app.patchCfg({ previewVisible: false })}>✕</button>
      </div>
      <div className="pp-preview">
        {img ? (
          <img src={img} alt={entry.name} />
        ) : textLoading ? (
          <div className="spinner" />
        ) : text ? (
          <div className="pp-text">{text.text}{text.truncated ? '\n\n… (truncated)' : ''}</div>
        ) : (
          <FileTypeIcon entry={entry} size={72} />
        )}
      </div>
      <div className="pp-name">{entry.name}</div>
      <div className="pp-meta">
        <div className="pp-row"><span className="k">Type</span><span className="v">{typeLabel(entry)}</span></div>
        <div className="pp-row"><span className="k">Size</span><span className="v num">{entry.isDir ? '—' : formatBytes(entry.size)}</span></div>
        <div className="pp-row"><span className="k">Modified</span><span className="v num">{formatDate(entry.mtimeMs)}</span></div>
        <div className="pp-row"><span className="k">Location</span><span className="v" title={t.path} style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.path}</span></div>
      </div>
      <div className="pp-actions">
        <button className="tool-btn primary" onClick={() => app.openEntry(entry)}>Open</button>
        <button className="tool-btn" title="Show in file manager" onClick={() => app.api.fs.reveal(entry.path)}>Reveal</button>
        <button className="tool-btn" onClick={() => app.openDialog('properties', { path: entry.path, entry })}>Details</button>
      </div>
    </aside>
  );
}
