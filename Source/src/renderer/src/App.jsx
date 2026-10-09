import React, { useEffect } from 'react';
import { AppProvider, useApp } from './store.jsx';
import TitleBar from './components/TitleBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Toolbar from './components/Toolbar.jsx';
import FileView from './components/FileView.jsx';
import { StatusBar, ContextMenuHost, ToastHost, ProgressHost } from './components/Chrome.jsx';
import DialogHost from './components/Dialogs.jsx';
import { ISearch, IClose } from './icons.jsx';
import { isRtl } from './lib/i18n.js';

function Shell() {
  const app = useApp();
  const t = app.activeTab;

  useEffect(() => {
    const rtl = isRtl(app.lang);
    document.documentElement.lang = app.lang;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', rtl);
  }, [app.lang]);

  if (!app.ready) {
    return (
      <div className="app" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div className="spinner" style={{ width: 30, height: 30 }} />
          <div style={{ color: 'var(--muted)' }}>Loading FileUp…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <TitleBar />

      {}
      {t && t.search && (
        <div className="search-banner">
          <ISearch size={14} />
          <span>Deep search results for “<b>{t.search.query}</b>” in {t.search.root}</span>
          {t.search.running
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="spinner" /> {t.search.found || 0} found…</span>
            : <span className="num">{t.search.items.length} result(s)</span>}
          <button className="sb-clear" onClick={() => app.exitSearch(t.id)}><IClose size={11} /> Clear</button>
        </div>
      )}

      <div className="app-body">
        <Sidebar />
        <div className="main-col">
          <Toolbar />
          <FileView />
          <StatusBar />
        </div>
      </div>

      <ContextMenuHost />
      <DialogHost />
      <ToastHost />
      <ProgressHost />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
