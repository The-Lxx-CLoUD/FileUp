import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IHome, IDesktop, IDocs, IDownload, IMusic, IImage, IVideo, IFolder, IDrive,
  IPin, IClose, IChevron, IPlus
} from '../icons.jsx';
import { basename } from '../lib/fmt.js';
import { useApp } from '../store.jsx';

const QUICK_ICON = {
  Home: IHome, Desktop: IDesktop, Documents: IDocs, Downloads: IDownload,
  Music: IMusic, Pictures: IImage, Videos: IVideo
};

export default function Sidebar() {
  const app = useApp();
  const { cfg, activeTab } = app;
  const [quick, setQuick] = useState([]);
  const [drives, setDrives] = useState([]);
  const [treeRoots, setTreeRoots] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [q, d] = await Promise.all([app.api.fs.quick(), app.api.fs.drives()]);
        if (!alive) return;
        setQuick(q);
        setDrives(d);
        const home = await app.api.fs.home();
        if (alive) setTreeRoots([home, ...d.map(x => x.path)]);
      } catch {  }
    })();
    app.events.on('bookmarks-changed', () => {
      app.api.bookmarks.list().then(b => alive && setBookmarks(b));
    });
    app.api.bookmarks.list().then(b => alive && setBookmarks(b));
    return () => { alive = false; };
  }, []);

  const refreshBookmarks = useCallback(async () => {
    setBookmarks(await app.api.bookmarks.list());
  }, [app.api]);

  useEffect(() => { refreshBookmarks(); }, [refreshBookmarks]);

  const currentPath = activeTab ? activeTab.path : null;
  const width = cfg.sidebarWidth || 248;

  const startResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const move = (ev) => {
      const w = Math.max(180, Math.min(420, startW + ev.clientX - startX));
      app.patchCfg({ sidebarWidth: w });
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const dropTo = (targetPath) => ({
    onDragOver: (e) => {
      if (e.dataTransfer.types.includes('application/x-fileup') || e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drag-over');
      }
    },
    onDragLeave: (e) => e.currentTarget.classList.remove('drag-over'),
    onDrop: (e) => {
      e.currentTarget.classList.remove('drag-over');
      e.preventDefault();
      e.stopPropagation();
      app.handleDrop(e, targetPath);
    }
  });

  return (
    <>
      <aside className="sidebar" style={{ width, flexBasis: width }}>
        <div className="side-section">
          <div className="side-head">Quick Access</div>
          {quick.map((q) => {
            const Ic = QUICK_ICON[q.name] || IFolder;
            return (
              <div
                key={q.path}
                className={`side-item ${currentPath === q.path ? 'active' : ''}`}
                onClick={() => app.navigate(q.path)}
                onContextMenu={(e) => app.openCtx(e, { type: 'sidebar', path: q.path, name: q.name })}
                onDoubleClick={() => app.openTabTo(q.path)}
                title={`${q.path}\nDouble-click: open in new tab`}
                {...dropTo(q.path)}
              >
                <span className="ctx-ic"><Ic size={16} /></span>
                <span className="lbl">{q.name}</span>
              </div>
            );
          })}
        </div>

        <div className="side-section">
          <div className="side-head">
            Bookmarks
            <button
              className="mini-btn"
              title="Bookmark current folder"
              onClick={() => app.bookmarkCurrent()}
            >
              <IPlus size={13} />
            </button>
          </div>
          {bookmarks.length === 0 && (
            <div className="tree-loading" style={{ paddingLeft: 10 }}>No bookmarks yet</div>
          )}
          {bookmarks.map((b) => (
            <div
              key={b.path}
              className={`side-item ${currentPath === b.path ? 'active' : ''}`}
              onClick={() => app.navigate(b.path)}
              onContextMenu={(e) => app.openCtx(e, { type: 'bookmark', path: b.path, name: b.name })}
              title={`${b.path}\nDouble-click: open in new tab`}
              {...dropTo(b.path)}
            >
              <span className="ctx-ic"><IPin size={14} /></span>
              <span className="lbl">{b.name}</span>
              <button
                className="bm-remove"
                title="Remove bookmark"
                onClick={async (e) => { e.stopPropagation(); await app.api.bookmarks.remove(b.path); refreshBookmarks(); }}
              >
                <IClose size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="side-section">
          <div className="side-head">Drives</div>
          {drives.map((d) => {
            const usedPct = d.total ? Math.min(100, Math.round(((d.total - d.free) / d.total) * 100)) : 0;
            const cls = usedPct >= 92 ? 'crit' : usedPct >= 75 ? 'warn' : '';
            return (
              <div
                key={d.path}
                className={`side-item drive-item ${currentPath === d.path ? 'active' : ''}`}
                onClick={() => app.navigate(d.path)}
                title={`${d.path}${d.fs ? ` · ${d.fs}` : ''}`}
                {...dropTo(d.path)}
              >
                <div className="drive-row">
                  <span className="ctx-ic"><IDrive size={16} /></span>
                  <span className="lbl">{d.name}</span>
                </div>
                {d.total > 0 && (
                  <>
                    <div className="drive-bar"><div className={cls} style={{ width: `${usedPct}%` }} /></div>
                    <div className="drive-sub num">
                      {app.fmt.formatBytes(d.free)} free of {app.fmt.formatBytes(d.total)}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="side-section">
          <div className="side-head">Folders</div>
          {treeRoots.map((rootPath) => (
            <TreeNode
              key={rootPath}
              path={rootPath}
              depth={0}
              label={rootPath === treeRoots[0] ? 'Home' : basename(rootPath) || rootPath}
              currentPath={currentPath}
            />
          ))}
        </div>
      </aside>
      <div className="sidebar-resizer" onMouseDown={startResize} />
    </>
  );
}

function TreeNode({ path, depth, label, currentPath }) {
  const app = useApp();
  const [expanded, setExpanded] = useState(depth === 0 && false);
  const [children, setChildren] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exists, setExists] = useState(true);

  useEffect(() => {
    if (!currentPath || expanded) return;
    if (currentPath === path || currentPath.startsWith(path.endsWith('\\') ? path : path + (path.includes('\\') ? '\\' : '/'))) {
      toggle(true);
    }
  }, [currentPath]);

  const toggle = async (forceOpen) => {
    const next = forceOpen !== undefined ? forceOpen : !expanded;
    setExpanded(next);
    if (next && children === null && !loading) {
      setLoading(true);
      try {
        const items = await app.api.fs.list(path, { dirsOnly: true });
        setChildren(items.sort((a, b) => a.name.localeCompare(b.name)));
        setExists(true);
      } catch {
        setExists(false);
        setChildren([]);
      }
      setLoading(false);
    }
  };

  if (!exists) return null;

  const isAncestorActive = currentPath && currentPath.startsWith(path);

  return (
    <>
      <div
        className={`side-item tree-item ${currentPath === path ? 'active' : ''}`}
        style={{ '--depth': depth }}
        onClick={() => app.navigate(path)}
        onDoubleClick={() => app.openTabTo(path)}
        onContextMenu={(e) => app.openCtx(e, { type: 'tree', path, name: label })}
        title={`${path}\nDouble-click: open in new tab`}
        draggable={false}
        {...app.dropTo(path)}
      >
        <span
          className={`tree-caret ${expanded ? 'expanded' : ''} ${children !== null && children.length === 0 ? 'leaf' : ''}`}
          onClick={(e) => { e.stopPropagation(); toggle(); }}
        >
          <IChevron size={11} />
        </span>
        <span className="ctx-ic"><IFolder size={15} /></span>
        <span className="lbl">{label}</span>
      </div>
      {expanded && loading && <div className="tree-loading" style={{ '--depth': depth }}>Loading…</div>}
      {expanded && children && children.map((c) => (
        <TreeNode
          key={c.path}
          path={c.path}
          depth={depth + 1}
          label={c.name}
          currentPath={currentPath}
        />
      ))}
      {isAncestorActive && !currentPath.startsWith(path) ? null : null}
    </>
  );
}
