import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './lib/api.js';
import * as fmt from './lib/fmt.js';
import * as i18n from './lib/i18n.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

let tabSeq = 1;
const nextTabId = () => `t${tabSeq++}`;
let dlgSeq = 1;

function makeTab(path) {
  return {
    id: nextTabId(),
    path,
    hist: [path],
    hi: 0,
    items: [],
    loading: true,
    error: null,
    filter: '',
    search: null,     
    sel: [],          
    anchor: null
  };
}

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [cfg, setCfg] = useState({
    theme: 'dark', viewMode: 'details', sort: { by: 'name', dir: 'asc', dirsFirst: true },
    showHidden: false, confirmDelete: true, previewVisible: true, sidebarWidth: 248, bookmarks: [],
    lang: 'en'
  });
  const [tabs, setTabs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [clipboard, setClipboard] = useState({ paths: [], mode: null });
  const [maximized, setMaximized] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [dialogs, setDialogs] = useState([]);   
  const [ctx, setCtx] = useState(null);         
  const [progress, setProgress] = useState({}); 
  const [tick, setTick] = useState(0);          

  const cfgRef = useRef(cfg); cfgRef.current = cfg;
  const tabsRef = useRef(tabs); tabsRef.current = tabs;
  const searchIds = useRef(new Map());
  const homeRef = useRef('/');

  const activeTab = tabs.find(t => t.id === activeId) || null;

  const emitRef = useRef({ listeners: {} });
  const events = useMemo(() => ({
    on: (name, cb) => {
      (emitRef.current.listeners[name] = emitRef.current.listeners[name] || []).push(cb);
    },
    emit: (name) => {
      (emitRef.current.listeners[name] || []).forEach(cb => { try { cb(); } catch { } });
    }
  }), []);

  const toast = useCallback((type, msg, ms = 3600) => {
    const id = `tt${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    setToasts(ts => [...ts.slice(-5), { id, type, msg }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), ms);
  }, []);

  const patchCfg = useCallback((patch) => {
    setCfg(c => ({ ...c, ...patch }));
    api.settings.patch(patch).catch(() => { });
  }, []);

  const toggleTheme = useCallback(() => {
    patchCfg({ theme: cfgRef.current.theme === 'dark' ? 'light' : 'dark' });
  }, [patchCfg]);

  const sortItems = useCallback((items, sort) => {
    const s = sort || cfgRef.current.sort;
    const dir = s.dir === 'desc' ? -1 : 1;
    const keyFn = {
      name: (x) => x.name.toLowerCase(),
      size: (x) => (x.isDir ? 0 : x.size),
      type: (x) => (x.isDir ? '' : x.ext || ''),
      modified: (x) => x.mtimeMs || 0
    }[s.by] || ((x) => x.name.toLowerCase());
    const arr = [...items];
    arr.sort((a, b) => {
      const ka = keyFn(a), kb = keyFn(b);
      let r = 0;
      if (typeof ka === 'string') r = ka.localeCompare(kb, undefined, { numeric: true, sensitivity: 'base' });
      else r = ka - kb;
      if (r === 0) r = a.name.toLowerCase().localeCompare(b.name.toLowerCase(), undefined, { numeric: true });
      return r * dir;
    });
    if (s.dirsFirst) arr.sort((a, b) => (a.isDir === b.isDir) ? 0 : (a.isDir ? -1 : 1));
    return arr;
  }, []);

  const loadListing = useCallback(async (tabId, path) => {
    setTabs(ts => ts.map(t => t.id === tabId ? { ...t, loading: true, error: null } : t));
    try {
      let items = await api.fs.list(path, { showHidden: cfgRef.current.showHidden });
      items = sortItems(items, cfgRef.current.sort);
      setTabs(ts => ts.map(t => t.id === tabId
        ? (t.path === path ? { ...t, items, loading: false, error: null, sel: [], anchor: null } : t)
        : t));
    } catch (e) {
      setTabs(ts => ts.map(t => t.id === tabId && t.path === path
        ? { ...t, items: [], loading: false, error: e.message, sel: [], anchor: null } : t));
    }
  }, [sortItems]);

  const refreshTab = useCallback((tabId) => {
    const t = tabsRef.current.find(x => x.id === tabId);
    if (!t) return;
    if (t.search) return; 
    loadListing(tabId, t.path);
  }, [loadListing]);

  const refreshPaths = useCallback((paths) => {
    const set = new Set(paths.map(p => p.replace(/[\\/]+$/, '')));
    setTabs(ts => ts.map(t => {
      if (set.has(t.path.replace(/[\\/]+$/, '')) && !t.search) {
        loadListing(t.id, t.path);
      }
      return t;
    }));
  }, [loadListing]);

  const navigate = useCallback((path, opts = {}) => {
    const { tabId = activeId, push = true } = opts;
    if (!path || !tabId) return;
    setTabs(ts => ts.map(t => {
      if (t.id !== tabId) return t;
      if (push && t.path !== path) {
        const hist = [...t.hist.slice(0, t.hi + 1), path];
        return { ...t, path, hist, hi: hist.length - 1, search: null, filter: '', sel: [], anchor: null };
      }
      return { ...t, path, search: null, filter: '', sel: [], anchor: null };
    }));
    loadListing(tabId, path);
    api.settings.patch({ lastPath: path }).catch(() => { });
  }, [activeId, loadListing]);

  const goBack = useCallback(() => {
    const t = tabsRef.current.find(x => x.id === activeId);
    if (!t || t.hi <= 0) return;
    const hi = t.hi - 1;
    const path = t.hist[hi];
    setTabs(ts => ts.map(x => x.id === t.id ? { ...x, hi, path, search: null, filter: '', sel: [], anchor: null } : x));
    loadListing(t.id, path);
  }, [activeId, loadListing]);

  const goForward = useCallback(() => {
    const t = tabsRef.current.find(x => x.id === activeId);
    if (!t || t.hi >= t.hist.length - 1) return;
    const hi = t.hi + 1;
    const path = t.hist[hi];
    setTabs(ts => ts.map(x => x.id === t.id ? { ...x, hi, path, search: null, filter: '', sel: [], anchor: null } : x));
    loadListing(t.id, path);
  }, [activeId, loadListing]);

  const goUp = useCallback(() => {
    const t = tabsRef.current.find(x => x.id === activeId);
    if (!t) return;
    const parent = fmt.parentPath(t.path);
    if (parent) navigate(parent, { tabId: activeId });
  }, [activeId, navigate]);

  const newTab = useCallback((path) => {
    const p = path || cfgRef.current.lastPath || homeRef.current;
    const t = makeTab(p);
    setTabs(ts => [...ts, t]);
    setActiveId(t.id);
    loadListing(t.id, p);
    return t.id;
  }, [loadListing]);

  const openTabTo = useCallback((path) => { newTab(path); }, [newTab]);

  const closeTab = useCallback((id) => {
    setTabs(ts => {
      const idx = ts.findIndex(t => t.id === id);
      if (idx === -1) return ts;
      const rest = ts.filter(t => t.id !== id);
      if (rest.length === 0) {
        const t = makeTab(homeRef.current);
        setActiveId(t.id);
        loadListing(t.id, t.path);
        return [t];
      }
      if (id === activeId) {
        const next = rest[Math.min(idx, rest.length - 1)];
        setActiveId(next.id);
      }
      return rest;
    });
    const sid = searchIds.current.get(id);
    if (sid) { api.fs.searchCancel(sid).catch(() => { }); searchIds.current.delete(id); }
  }, [activeId, loadListing]);

  const activateTab = useCallback((id) => setActiveId(id), []);

  const tabTitle = useCallback((t) => {
    if (!t) return '';
    if (t.search) return `Search: ${t.search.query}`;
    const name = fmt.basename(t.path);
    return name || t.path;
  }, []);

  const setSel = useCallback((tabId, names, anchor = null) => {
    setTabs(ts => ts.map(t => t.id === tabId ? { ...t, sel: names, anchor } : t));
  }, []);

  const clearSel = useCallback((tabId) => {
    setTabs(ts => ts.map(t => t.id === tabId ? { ...t, sel: [], anchor: null } : t));
  }, []);

  const selectAll = useCallback((tabId) => {
    const t = tabsRef.current.find(x => x.id === tabId);
    if (!t) return;
    const items = t.search ? t.search.items : t.items;
    const filtered = applyFilter(items, t.filter);
    setSel(tabId, filtered.map(i => i.name));
  }, [setSel]);

  const openEntry = useCallback(async (entry) => {
    if (!entry) return;
    if (entry.isDir) { navigate(entry.path); return; }
    try { await api.fs.open(entry.path); }
    catch (e) { toast('error', `Cannot open: ${e.message}`); }
  }, [navigate, toast]);

  const doCopy = useCallback(async (paths, dest) => {
    try {
      const res = await api.fs.copy(paths, dest);
      reportTransfer(res, 'Copied');
      refreshPaths([...paths.map(p => fmt.parentPath(p)), dest]);
    } catch (e) { toast('error', e.message); }
    
  }, [refreshPaths, toast]);

  const doMove = useCallback(async (paths, dest) => {
    try {
      const res = await api.fs.move(paths, dest);
      reportTransfer(res, 'Moved');
      refreshPaths([...paths.map(p => fmt.parentPath(p)), dest]);
    } catch (e) { toast('error', e.message); }
    
  }, [refreshPaths, toast]);

  function reportTransfer(res, verb) {
    if (!res) return;
    const parts = [];
    if (res.copied) parts.push(`${res.copied} ${verb.toLowerCase()}`);
    if (res.renamed) parts.push(`${res.renamed} renamed`);
    if (res.skipped) parts.push(`${res.skipped} skipped`);
    if (parts.length) toast('success', `${parts.join(', ')}`);
    if (res.errors && res.errors.length) toast('error', `${res.errors.length} item(s) failed: ${res.errors[0]}`, 5000);
  }

  const clipSet = useCallback((paths, mode) => {
    api.fs.clipSet(paths, mode);
    setClipboard({ paths, mode });
    if (paths.length) toast('info', `${paths.length} item(s) ready to ${mode === 'cut' ? 'move' : 'copy'}`, 1800);
  }, [toast]);

  const paste = useCallback(async (dest) => {
    const { paths, mode } = clipboard;
    if (!paths || paths.length === 0) return;
    if (mode === 'cut') {
      await doMove(paths, dest);
      api.fs.clipSet([], null);
      setClipboard({ paths: [], mode: null });
    } else {
      await doCopy(paths, dest);
    }
  }, [clipboard, doCopy, doMove]);

  const trashEntries = useCallback(async (entries) => {
    const paths = entries.map(e => e.path);
    try {
      const res = await api.fs.trash(paths);
      if (res.ok) toast('success', `${paths.length} item(s) moved to trash`);
      else toast('error', res.errors[0] || 'Failed to move to trash', 5000);
      refreshPaths(paths.map(p => fmt.parentPath(p)));
    } catch (e) { toast('error', e.message); }
  }, [refreshPaths, toast]);

  const deleteForeverEntries = useCallback(async (entries) => {
    const paths = entries.map(e => e.path);
    try {
      const res = await api.fs.deleteForever(paths);
      if (res.ok) toast('success', `${paths.length} item(s) permanently deleted`);
      else toast('error', res.errors[0] || 'Delete failed', 5000);
      refreshPaths(paths.map(p => fmt.parentPath(p)));
    } catch (e) { toast('error', e.message); }
  }, [refreshPaths, toast]);

  const newFolder = useCallback(async (dir) => {
    const name = await promptDialog({ title: 'New Folder', label: 'Folder name', value: 'New Folder', okText: 'Create' });
    if (name === null) return;
    try {
      await api.fs.mkdir(dir, name);
      toast('success', `Folder "${name}" created`);
      refreshPaths([dir]);
    } catch (e) { toast('error', e.message); }
  }, [toast, refreshPaths]);

  const newFile = useCallback(async (dir) => {
    const name = await promptDialog({ title: 'New File', label: 'File name', value: 'New File.txt', okText: 'Create' });
    if (name === null) return;
    try {
      await api.fs.createFile(dir, name);
      toast('success', `File "${name}" created`);
      refreshPaths([dir]);
    } catch (e) { toast('error', e.message); }
  }, [toast, refreshPaths]);

  const renameEntry = useCallback(async (entry) => {
    const name = await promptDialog({ title: 'Rename', label: 'New name', value: entry.name, okText: 'Rename', selectBase: true });
    if (name === null || name === entry.name) return;
    try {
      await api.fs.rename(entry.path, name);
      toast('success', 'Renamed');
      refreshPaths([fmt.parentPath(entry.path)]);
    } catch (e) { toast('error', e.message); }
  }, [toast, refreshPaths]);

  const setFilter = useCallback((tabId, text) => {
    setTabs(ts => ts.map(t => t.id === tabId ? { ...t, filter: text } : t));
  }, []);

  const startSearch = useCallback(async (tabId, query) => {
    const t = tabsRef.current.find(x => x.id === tabId);
    if (!t || !query.trim()) return;
    const id = `search-${tabId}-${Date.now()}`;
    searchIds.current.set(tabId, id);
    setTabs(ts => ts.map(x => x.id === tabId
      ? { ...x, search: { query, root: x.path, items: [], running: true, found: 0 }, sel: [], anchor: null } : x));
    try {
      const res = await api.fs.search(t.path, query.trim(), { showHidden: cfgRef.current.showHidden }, id);
      setTabs(ts => ts.map(x => x.id === tabId && x.search
        ? { ...x, search: { ...x.search, items: sortItems(res.items, cfgRef.current.sort), running: false, found: res.count } }
        : x));
    } catch (e) {
      setTabs(ts => ts.map(x => x.id === tabId ? { ...x, search: x.search ? { ...x.search, running: false } : null } : x));
      toast('error', `Search failed: ${e.message}`);
    } finally {
      searchIds.current.delete(tabId);
    }
  }, [sortItems, toast]);

  const cancelSearch = useCallback((tabId) => {
    const id = searchIds.current.get(tabId);
    if (id) api.fs.searchCancel(id).catch(() => { });
  }, []);

  const exitSearch = useCallback((tabId) => {
    cancelSearch(tabId);
    setTabs(ts => ts.map(t => t.id === tabId ? { ...t, search: null } : t));
  }, [cancelSearch]);

  const openDialog = useCallback((type, props = {}) => {
    return new Promise((resolve) => {
      const id = `d${dlgSeq++}`;
      setDialogs(ds => [...ds, { id, type, props, resolve }]);
    });
  }, []);

  const closeDialog = useCallback((id, result) => {
    setDialogs(ds => {
      const d = ds.find(x => x.id === id);
      if (d) { try { d.resolve(result); } catch { } }
      return ds.filter(x => x.id !== id);
    });
  }, []);

  const promptDialog = useCallback((props) => openDialog('prompt', props), [openDialog]);
  const confirmDialog = useCallback((props) => openDialog('confirm', props), [openDialog]);
  useEffect(() => {
    if (typeof window !== 'undefined') window.__smokeDialog = (type, props) => openDialog(type, props || {});
  }, [openDialog]);

  const openCtx = useCallback((e, target) => {
    e.preventDefault();
    e.stopPropagation();
    setCtx({ x: e.clientX, y: e.clientY, target });
  }, []);
  const closeCtx = useCallback(() => setCtx(null), []);

  const bookmarkCurrent = useCallback(async () => {
    const t = tabsRef.current.find(x => x.id === activeId);
    if (!t) return;
    await api.bookmarks.add(t.path);
    events.emit('bookmarks-changed');
    toast('success', 'Folder bookmarked');
  }, [activeId, events, toast]);

  const handleDrop = useCallback((e, dest) => {
    e.preventDefault();
    e.stopPropagation();
    (async () => {
      try {
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const paths = [...e.dataTransfer.files].map(f => api.pathForFile(f)).filter(Boolean);
          if (paths.length) { await doCopy(paths, dest); toast('info', `Dropped ${paths.length} item(s)`); }
          return;
        }
        const raw = e.dataTransfer.getData('application/x-fileup');
        if (raw) {
          const paths = JSON.parse(raw);
          if (paths && paths.length) {
            const inside = paths.some(p => dest === p || dest.startsWith(p.replace(/[\\/]+$/, '') + (p.includes('\\') ? '\\' : '/')));
            if (inside) { toast('info', 'Cannot drop into itself'); return; }
            await doMove(paths, dest);
          }
        }
      } catch (err) { toast('error', err.message); }
    })();
  }, [doCopy, doMove, toast]);

  const dropTo = useCallback((targetPath) => ({
    onDragOver: (e) => {
      if (e.dataTransfer.types.includes('application/x-fileup') || e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drag-over');
      }
    },
    onDragLeave: (e) => { e.currentTarget.classList.remove('drag-over'); },
    onDrop: (e) => { e.currentTarget.classList.remove('drag-over'); handleDrop(e, targetPath); }
  }), [handleDrop]);

  const toggleHidden = useCallback(() => {
    const next = !cfgRef.current.showHidden;
    patchCfg({ showHidden: next });
    setTabs(ts => ts.map(t => { if (!t.search) loadListing(t.id, t.path); return t; }));
  }, [patchCfg, loadListing]);

  const setSort = useCallback((by) => {
    const cur = cfgRef.current.sort;
    const next = { ...cur, by, dir: cur.by === by && cur.dir === 'asc' ? 'desc' : 'asc' };
    patchCfg({ sort: next });
    setTabs(ts => ts.map(t => {
      if (t.search) return { ...t, search: { ...t.search, items: sortItems(t.search.items, next) } };
      return { ...t, items: sortItems(t.items, next) };
    }));
  }, [patchCfg, sortItems]);

  const setViewMode = useCallback((mode) => patchCfg({ viewMode: mode }), [patchCfg]);

  useEffect(() => {
    (async () => {
      try {
        const saved = await api.settings.get();
        setCfg(c => ({ ...c, ...saved }));
        const home = await api.fs.home();
        homeRef.current = home;
        const clip0 = await api.fs.clipGet();
        setClipboard(clip0 || { paths: [], mode: null });
        let start = saved.lastPath;
        if (start) {
          try { await api.fs.stat(start); } catch { start = home; }
        }
        const t = makeTab(start || home);
        setTabs([t]);
        setActiveId(t.id);
        loadListing(t.id, t.path);
        setReady(true);
      } catch (e) {
        setReady(true);
      }
    })();
    
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = cfg.theme;
  }, [cfg.theme]);

  useEffect(() => {
    const off = api.on && api.on('win:maximized', (v) => setMaximized(!!v));
    api.win && api.win.isMaximized && api.win.isMaximized().then(setMaximized).catch(() => { });
    return () => { off && off(); };
  }, []);

  useEffect(() => {
    const off = api.on && api.on('task:progress', (p) => {
      setProgress(prev => ({ ...prev, [p.id]: p }));
     
      if (p.kind === 'search' && p.found !== undefined) {
        const tabId = p.id.replace(/^search-/, '').replace(/-\d+$/, '');
        setTabs(ts => ts.map(t => t.id === tabId && t.search ? { ...t, search: { ...t.search, found: p.found } } : t));
      }
    });
    return () => { off && off(); };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable;
      if (dialogs.length > 0) {
        if (e.key === 'Escape') {
          const top = dialogs[dialogs.length - 1];
          closeDialog(top.id, null);
        }
        return;
      }
      if (ctx) { if (e.key === 'Escape') closeCtx(); return; }
      if (e.key === 'Escape' && inInput) { e.target.blur(); return; }
      if (inInput) {
        if (e.key === 'Enter' && e.target.dataset.searchInput === '1') {
          const q = e.target.value.trim();
          if (q) startSearch(activeId, q);
        }
        return;
      }
      const t = tabsRef.current.find(x => x.id === activeId);
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 't') { e.preventDefault(); newTab(); return; }
      if (mod && e.key.toLowerCase() === 'w') { e.preventDefault(); if (t) closeTab(t.id); return; }
      if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); document.getElementById('global-search')?.focus(); return; }
      if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); selectAll(activeId); return; }
      if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); if (t && t.sel.length) clipSet(t.sel.map(n => joinName(t, n)), 'copy'); return; }
      if (mod && e.key.toLowerCase() === 'x') { e.preventDefault(); if (t && t.sel.length) clipSet(t.sel.map(n => joinName(t, n)), 'cut'); return; }
      if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); if (t) paste(t.search ? t.search.root : t.path); return; }
      if (mod && e.key.toLowerCase() === 'h') { e.preventDefault(); toggleHidden(); return; }
      if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); patchCfg({ sidebarVisible: false }); return; }
      if (mod && e.key === '1') { e.preventDefault(); setViewMode('details'); return; }
      if (mod && e.key === '2') { e.preventDefault(); setViewMode('grid'); return; }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'n') { e.preventDefault(); if (t) newFolder(t.path); return; }
      if (e.key === 'F2') { e.preventDefault(); if (t && t.sel.length === 1) { const en = findEntry(t, t.sel[0]); en && renameEntry(en); } return; }
      if (e.key === 'F5') { e.preventDefault(); refreshTab(activeId); return; }
      if (e.key === 'Delete') {
        if (!t || !t.sel.length) return;
        e.preventDefault();
        const entries = t.sel.map(n => findEntry(t, n)).filter(Boolean);
        if (e.shiftKey) {
          openDialog('secureDelete', { entries });
        } else if (cfgRef.current.confirmDelete) {
          openDialog('confirm', {
            title: 'Move to Trash',
            message: `Move ${entries.length} item(s) to trash?`,
            confirmText: 'Move to Trash'
          }).then(ok => ok && trashEntries(entries));
        } else trashEntries(entries);
        return;
      }
      if (e.key === 'Enter') { if (t && t.sel.length === 1) { const en = findEntry(t, t.sel[0]); en && openEntry(en); } return; }
      if (e.key === 'Backspace' || (e.altKey && e.key === 'ArrowUp')) { e.preventDefault(); goUp(); return; }
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); goBack(); return; }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); goForward(); return; }
      if (e.key === 'Escape') { if (t && t.search) exitSearch(t.id); else if (t && t.sel.length) clearSel(t.id); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, ctx, dialogs, closeDialog, closeCtx, newTab, closeTab, selectAll, clipSet, paste, toggleHidden,
    patchCfg, setViewMode, newFolder, renameEntry, refreshTab, openDialog, trashEntries, openEntry, goUp, goBack,
    goForward, startSearch, exitSearch, clearSel]);

  function joinName(tab, name) {
    return tab.path.endsWith('\\') || tab.path.endsWith('/') ? tab.path + name : tab.path + (tab.path.includes('\\') ? '\\' : '/') + name;
  }
  function findEntry(tab, name) {
    const items = tab.search ? tab.search.items : tab.items;
    return items.find(i => i.name === name);
  }

  function applyFilter(items, filter) {
    if (!filter) return items;
    return items.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()));
  }

  const value = {
    api, fmt, events, ready,
    cfg, patchCfg, toggleTheme,
    lang: cfg.lang || 'en',
    t: (key, vars) => i18n.t(cfg.lang || 'en', key, vars),
    tabs, activeId, activeTab, tick, forceTick: () => setTick(x => x + 1),
    navigate, goBack, goForward, goUp, refreshTab, refreshPaths,
    newTab, openTabTo, closeTab, activateTab, tabTitle,
    setSel, clearSel, selectAll,
    openEntry, doCopy, doMove, clipSet, paste, clipboard,
    trashEntries, deleteForeverEntries, newFolder, newFile, renameEntry,
    setFilter, startSearch, cancelSearch, exitSearch,
    dialogs, openDialog, closeDialog, promptDialog, confirmDialog,
    ctx, openCtx, closeCtx,
    toasts, toast,
    progress, setProgress,
    maximized,
    bookmarkCurrent,
    handleDrop, dropTo,
    sortItems, setSort, setViewMode, toggleHidden,
    applyFilter
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
