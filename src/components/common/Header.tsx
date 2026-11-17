import React from 'react';
import { useApp } from '../../context/AppContext';
import { User, Settings } from 'lucide-react';
import { Tabs } from './Tabs';

export const Header: React.FC = () => {
  const { t, activeTab, setActiveTab, setIsProfileOpen, setIsSettingsOpen } = useApp();

  const handleTitleClick = () => {
    if (activeTab !== 'today') {
      setActiveTab('today');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border)] px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-1">
      <div className="max-w-4xl mx-auto">
        {/* Profile (left) · app name (top center) · settings (right) */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="pressable w-9 h-9 rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
              title={t.profile.title}
              aria-label={t.profile.title}
            >
              <User size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleTitleClick}
            className="text-lg sm:text-xl font-extrabold tracking-tight text-[var(--text)] text-center hover:opacity-80 transition-opacity"
          >
            {t.appName}
          </button>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="pressable w-9 h-9 rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
              title={t.settings.title}
              aria-label={t.settings.title}
            >
              <Settings size={17} />
            </button>
          </div>
        </div>

        {/* Today / Meals / Period / Statistics pill bar */}
        <Tabs />
      </div>
    </header>
  );
};
