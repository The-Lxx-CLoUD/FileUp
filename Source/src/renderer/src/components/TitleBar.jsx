import React from 'react';
import { Logo, IPlus, IClose, IMinimize, IMaximize, IRestore, ISettings, ISun, IMoon } from '../icons.jsx';
import { useApp } from '../store.jsx';

export default function TitleBar() {
  const app = useApp();
  const { tabs, activeId, cfg } = app;

  return (
    <div className="titlebar">
      <div className="brand">
        <Logo size={24} />
        <div className="brand-name">File<span>Up</span></div>
      </div>

      <div className="tabstrip" role="tablist">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={`tab ${t.id === activeId ? 'active' : ''}`}
            role="tab"
            aria-selected={t.id === activeId}
            onClick={() => app.activateTab(t.id)}
            onAuxClick={(e) => { if (e.button === 1) app.closeTab(t.id); }}
            title={app.tabTitle(t)}
          >
            <span className="tab-title">{app.tabTitle(t)}</span>
            {tabs.length > 1 && (
              <button
                className="tab-close"
                title="Close tab (Ctrl+W)"
                onClick={(e) => { e.stopPropagation(); app.closeTab(t.id); }}
              >
                <IClose size={11} />
              </button>
            )}
          </div>
        ))}
        <button className="tab-new" title="New tab (Ctrl+T)" onClick={() => app.newTab()}>
          <IPlus size={15} />
        </button>
      </div>

      <div className="tb-actions">
        <button
          className="icon-btn"
          title={cfg.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => app.toggleTheme()}
        >
          {cfg.theme === 'dark' ? <ISun size={16} /> : <IMoon size={15} />}
        </button>
        <button className="icon-btn" title="Settings" onClick={() => app.openDialog('settings')}>
          <ISettings size={16} />
        </button>
      </div>

      <div className="win-controls">
        <button className="win-btn" title="Minimize" onClick={() => app.api.win.minimize()}>
          <IMinimize size={13} />
        </button>
        <button className="win-btn" title={app.maximized ? 'Restore' : 'Maximize'} onClick={() => app.api.win.maximizeToggle()}>
          {app.maximized ? <IRestore size={13} /> : <IMaximize size={12} />}
        </button>
        <button className="win-btn close" title="Close" onClick={() => app.api.win.close()}>
          <IClose size={13} />
        </button>
      </div>
    </div>
  );
}
