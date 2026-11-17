import React from 'react';
import { useApp } from '../../context/AppContext';
import { User, Settings } from 'lucide-react';
import { Tabs } from './Tabs';

export const Header: React.FC = () => {
  const { t, setIsProfileOpen, setIsSettingsOpen } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border)] px-4 sm:px-6 pt-3 pb-1">
      <div className="max-w-4xl mx-auto">
        {/* Profile (left) · app name (top center) · settings (right) */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors"
              title={t.profile.title}
              aria-label={t.profile.title}
            >
              <User size={16} />
            </button>
          </div>

          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-[var(--text)] text-center">
            {t.appName}
          </h1>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors"
              title={t.settings.title}
              aria-label={t.settings.title}
            >
              <Settings size={17} />
            </button>
          </div>
        </div>

        {/* Today / My Meals / Statistics bar */}
        <Tabs />
      </div>
    </header>
  );
};
