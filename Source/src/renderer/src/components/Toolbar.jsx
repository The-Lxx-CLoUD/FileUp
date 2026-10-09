import React, { useEffect, useRef, useState } from 'react';
import {
  IBack, IForward, IUp, IRefresh, ISearch, IList, IGrid, ISort, IChevron,
  INewFolder, IPaste, IChevronDown, IEye, IEyeOff, IDup, IClose, ITools
} from '../icons.jsx';
import { segments, basename } from '../lib/fmt.js';
import { useApp } from '../store.jsx';

export default function Toolbar() {
  const app = useApp();
  const t = app.activeTab;
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [sortMenu, setSortMenu] = useState(false);
  const [newMenu, setNewMenu] = useState(false);
  const [toolsMenu, setToolsMenu] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const searchRef = useRef(null);
  const pathInputRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (!e.target.closest('.menu-anchor')) { setSortMenu(false); setNewMenu(false); setToolsMenu(false); }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  if (!t) return null;
  const crumbItems = segments(t.path);
  const inSearch = !!t.search;

  const commitPath = () => {
    const v = editValue.trim();
    setEditing(false);
    if (v && v !== t.path) {
      app.api.fs.stat(v).then(() => app.navigate(v)).catch(() => app.toast('error', `Path not found: ${v}`));
    }
  };

  const startSearchNow = () => {
    const q = (searchRef.current && searchRef.current.value || '').trim();
    if (q) app.startSearch(t.id, q);
  };

  const onSearchKey = (e) => {
    if (e.key === 'Enter') startSearchNow();
    if (e.key === 'Escape') {
      if (inSearch) app.exitSearch(t.id);
      app.setFilter(t.id, '');
      e.target.value = '';
      e.target.blur();
    }
  };

  const sort = app.cfg.sort;
  const sortLabels = { name: 'Name', size: 'Size', type: 'Type', modified: 'Date Modified' };

  const joinP = (dir, name) => {
    const sep = dir && dir.includes('\\') ? '\\' : '/';
    return dir.endsWith(sep) ? dir + name : dir + sep + name;
  };
  const selPaths = () => (t.sel || []).map(n => joinP(t.search ? t.search.root : t.path, n));
  const singleSel = () => (t.sel && t.sel.length === 1) ? selPaths()[0] : '';
  const singleSelFenc = () => {
    const p = singleSel();
    return p && (/\.fenc$/i.test(p) ? p : '');
  };

  return (
    <div className="toolbar">
      <div className="nav-group">
        <button className="icon-btn" disabled={t.hi <= 0} title="Back (Alt+←)" onClick={app.goBack}><IBack size={17} /></button>
        <button className="icon-btn" disabled={t.hi >= t.hist.length - 1} title="Forward (Alt+→)" onClick={app.goForward}><IForward size={17} /></button>
        <button className="icon-btn" disabled={!app.fmt.parentPath(t.path)} title="Up (Alt+↑)" onClick={app.goUp}><IUp size={17} /></button>
        <button className="icon-btn" title="Refresh (F5)" onClick={() => app.refreshTab(t.id)}><IRefresh size={16} /></button>
      </div>

      {editing ? (
        <div className="breadcrumbs">
          <input
            ref={pathInputRef}
            autoFocus
            className="path-editor"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitPath(); if (e.key === 'Escape') setEditing(false); }}
            onBlur={commitPath}
            spellCheck={false}
          />
        </div>
      ) : (
        <div className="breadcrumbs" onDoubleClick={() => { setEditValue(t.path); setEditing(true); }} title="Double-click to edit path">
          <div className="crumbs-scroll">
            {crumbItems.map((c, i) => {
              const last = i === crumbItems.length - 1;
              return (
                <span key={c.path + i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span
                    className={`crumb ${last ? 'last' : ''}`}
                    onClick={() => !last && app.navigate(c.path)}
                    onDragOver={(e) => {
                      if (e.dataTransfer.types.includes('application/x-fileup')) {
                        e.preventDefault(); e.currentTarget.classList.add('drop-target');
                      }
                    }}
                    onDragLeave={(e) => e.currentTarget.classList.remove('drop-target')}
                    onDrop={(e) => { e.currentTarget.classList.remove('drop-target'); app.handleDrop(e, c.path); }}
                  >
                    {c.label}
                  </span>
                  {!last && <span className="sep crumb" style={{ cursor: 'default', padding: '3px 1px' }}><IChevron size={11} /></span>}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="tool-search menu-anchor">
        <span className="search-ic"><ISearch size={15} /></span>
        <input
          id="global-search"
          ref={searchRef}
          type="text"
          data-search-input="1"
          placeholder={inSearch ? 'Searching…' : 'Filter live · Enter for deep search'}
          value={inSearch ? t.search.query : undefined}
          onChange={(e) => { if (!inSearch) app.setFilter(t.id, e.target.value); }}
          onKeyDown={onSearchKey}
          spellCheck={false}
        />
        {inSearch ? (
          <button className="search-clear" title="Exit search (Esc)" onClick={() => { app.exitSearch(t.id); if (searchRef.current) searchRef.current.value = ''; }}>
            <IClose size={13} />
          </button>
        ) : (t.filter ? (
          <button className="search-clear" title="Clear filter" onClick={() => { app.setFilter(t.id, ''); if (searchRef.current) searchRef.current.value = ''; }}>
            <IClose size={13} />
          </button>
        ) : null)}
      </div>

      <div className="tool-sep" />

      <div className="seg menu-anchor" title="View mode (Ctrl+1 / Ctrl+2)">
        <button className={`icon-btn ${app.cfg.viewMode === 'details' ? 'active' : ''}`} onClick={() => app.setViewMode('details')}><IList size={16} /></button>
        <button className={`icon-btn ${app.cfg.viewMode === 'grid' ? 'active' : ''}`} onClick={() => app.setViewMode('grid')}><IGrid size={16} /></button>
      </div>

      <div className="menu-anchor" style={{ position: 'relative' }}>
        <button
          className={`tool-btn ${sortMenu ? 'toggled' : ''}`}
          title="Sort"
          onClick={() => { setSortMenu(!sortMenu); setNewMenu(false); }}
        >
          <ISort size={15} />
          <span className="hide-sm">{sortLabels[sort.by]}</span>
          <IChevronDown size={13} />
        </button>
        {sortMenu && (
          <ContextMenu
            items={[
              ...['name', 'size', 'type', 'modified'].map(k => ({
                label: sortLabels[k], checked: sort.by === k, onClick: () => app.setSort(k)
              })),
              { sep: true },
              { label: `${sort.dir === 'asc' ? 'Ascending' : 'Descending'} — click again to flip`, disabled: true },
              { label: sort.dirsFirst ? '✓ Folders first' : 'Folders first', onClick: () => app.patchCfg({ sort: { ...sort, dirsFirst: !sort.dirsFirst } }) }
            ]}
            onClose={() => setSortMenu(false)}
          />
        )}
      </div>

      <div className="menu-anchor" style={{ position: 'relative' }}>
        <button
          className={`tool-btn ${newMenu ? 'toggled' : ''}`}
          title="Create new"
          onClick={() => { setNewMenu(!newMenu); setSortMenu(false); }}
        >
          <INewFolder size={15} />
          <IChevronDown size={13} />
        </button>
        {newMenu && (
          <ContextMenu
            items={[
              { label: 'Folder', ic: 'newfolder', shortcut: 'Ctrl+Shift+N', onClick: () => app.newFolder(t.path) },
              { label: 'File', ic: 'newfile', onClick: () => app.newFile(t.path) }
            ]}
            onClose={() => setNewMenu(false)}
          />
        )}
      </div>

      <div className="menu-anchor" style={{ position: 'relative' }}>
        <button
          className={`tool-btn ${toolsMenu ? 'toggled' : ''}`}
          title="Tools"
          onClick={() => { setToolsMenu(!toolsMenu); setSortMenu(false); setNewMenu(false); }}
        >
          <ITools size={15} />
          <span className="hide-sm">{app.t('tools')}</span>
          <IChevronDown size={13} />
        </button>

        {toolsMenu && (
          <ContextMenu
            items={[
              { label: app.t('tool_archive_create'), onClick: () => app.openDialog('archiveCreate', { paths: selPaths() }) },
              { label: app.t('tool_archive_extract'), onClick: () => app.openDialog('archiveExtract', {}) },
              { sep: true },
              { label: app.t('tool_split'), onClick: () => app.openDialog('split', { path: singleSel() }) },
              { label: app.t('tool_join'), onClick: () => app.openDialog('join', {}) },
              { label: app.t('tool_encrypt'), onClick: () => app.openDialog('encrypt', { path: singleSel() }) },
              { label: app.t('tool_decrypt'), onClick: () => app.openDialog('decrypt', { path: singleSelFenc() }) },
              { sep: true },
              { label: app.t('tool_grep'), onClick: () => app.openDialog('grep', { dir: t.search ? t.search.root : t.path }) },
              { label: app.t('tool_report'), onClick: () => app.openDialog('report', { dir: t.search ? t.search.root : t.path }) },
              { label: app.t('tool_snap'), onClick: () => app.openDialog('snapshot', { dir: t.search ? t.search.root : t.path }) },
              { label: app.t('tool_cleanup'), onClick: () => app.openDialog('cleanup', { dir: t.search ? t.search.root : t.path }) },
              { sep: true },
              { label: app.t('tool_remote'), onClick: () => app.openDialog('remote', {}) }
            ]}
            onClose={() => setToolsMenu(false)}
          />
        )}
      </div>

      <button
        className="tool-btn"
        disabled={!app.clipboard.paths.length}
        title={app.clipboard.mode === 'cut' ? 'Move here (Ctrl+V)' : 'Paste (Ctrl+V)'}
        onClick={() => app.paste(t.search ? t.search.root : t.path)}
      >
        <IPaste size={15} />
        {app.clipboard.paths.length > 0 && <span className="num">{app.clipboard.paths.length}</span>}
      </button>

      <button
        className={`tool-btn ${app.cfg.showHidden ? 'toggled' : ''}`}
        title="Toggle hidden files (Ctrl+H)"
        onClick={app.toggleHidden}
      >
        {app.cfg.showHidden ? <IEye size={15} /> : <IEyeOff size={15} />}
      </button>

      <button
        className="tool-btn"
        title="Find duplicate files in this folder"
        onClick={() => app.openDialog('duplicates', { root: t.search ? t.search.root : t.path })}
      >
        <IDup size={15} />
      </button>
    </div>
  );
}

function ContextMenu({ items, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 8) el.style.transform = 'translateY(-100%)';
    }
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="ctx-menu" ref={ref} style={{ top: 'calc(100% + 6px)', left: 0 }}>
      {items.map((it, i) => it.sep ? <div key={i} className="ctx-sep" /> : (
        <button
          key={i}
          className={`ctx-item ${it.danger ? 'danger' : ''}`}
          disabled={it.disabled}
          onClick={() => { onClose(); it.onClick && it.onClick(); }}
        >
          {it.checked && <span className="ctx-ic" style={{ width: 14 }}>✓</span>}
          <span className="ctx-label">{it.label}</span>
        </button>
      ))}
    </div>
  );
}
