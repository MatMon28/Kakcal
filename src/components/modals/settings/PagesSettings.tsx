import React from 'react';
import { CalendarDays, ChevronDown, ChevronUp, Droplet, LayoutGrid, RotateCcw, Ruler, TrendingUp, User } from 'lucide-react';
import { useApp, useNav, useNavActions } from '../../../context/AppContext';
import { useAdvancedText } from '../../../i18n/advanced';
import { useJournalText } from '../../../i18n/journal';
import type { MainTabId } from '../../../types';
import { setBodyEnabled, useAdvanced } from '../../../utils/advancedStore';
import { DEFAULT_PAGE_ORDER, normalizePageOrder } from '../../../utils/pageVisibility';
import { SubSection, SwitchVisual, TONE } from './SettingsParts';

/**
 * Settings > Pages: hide any page except Today and reorder all main pages (including Today).
 * Hidden pages leave the tab bar and the swipe order, and hiding the active page returns to Today.
 */
export const PagesSettings: React.FC = () => {
  const j = useJournalText();
  const text = useAdvancedText();
  const { activeTab } = useNav();
  const { setActiveTab } = useNavActions();
  const { t, settings, updateSettings, setIsSettingsOpen, setIsProfileOpen } = useApp();
  const bodyOn = useAdvanced().body.enabled;

  const pageOrder = normalizePageOrder(settings.pageOrder);
  const isCustomOrder = pageOrder.some((id, idx) => id !== DEFAULT_PAGE_ORDER[idx]);

  const hideCustom = () => {
    updateSettings({ hideCustomPage: !settings.hideCustomPage });
    if (!settings.hideCustomPage && activeTab === 'prebuilt') setActiveTab('today');
  };
  const hideStatistics = () => {
    updateSettings({ hideStatisticsPage: !settings.hideStatisticsPage });
    if (!settings.hideStatisticsPage && activeTab === 'history') setActiveTab('today');
  };
  const togglePeriod = () => {
    const next = !settings.hidePeriod;
    updateSettings({ hidePeriod: next, hidePeriodCustomized: true });
    if (next && activeTab === 'period') setActiveTab('today');
  };
  const toggleBody = () => {
    setBodyEnabled(!bodyOn);
    if (bodyOn && activeTab === 'body') setActiveTab('today');
  };

  const movePage = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= pageOrder.length) return;
    const next = [...pageOrder];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    updateSettings({ pageOrder: next });
  };

  const rows: Record<MainTabId, {
    icon: React.ReactNode;
    tone: string;
    title: string;
    description: string;
    on: boolean;
    disabled?: boolean;
    onToggle: () => void;
  }> = {
    today: {
      icon: <CalendarDays size={14} />,
      tone: TONE.sky,
      title: t.nav.today,
      description: j('Always shown.', 'Sempre visibile.'),
      on: true,
      disabled: true,
      onToggle: () => undefined,
    },
    prebuilt: {
      icon: <LayoutGrid size={14} />,
      tone: TONE.mint,
      title: t.nav.prebuilt,
      description: j('Meals, recipes, planner, shopping lists and Foods.', 'Pasti, ricette, pianificatore, liste della spesa e Alimenti.'),
      on: !settings.hideCustomPage,
      onToggle: hideCustom,
    },
    history: {
      icon: <TrendingUp size={14} />,
      tone: TONE.lilac,
      title: t.nav.history,
      description: j('Charts, averages and the daily breakdown.', 'Grafici, medie e riepilogo giornaliero.'),
      on: !settings.hideStatisticsPage,
      onToggle: hideStatistics,
    },
    period: {
      icon: <Droplet size={14} />,
      tone: TONE.rose,
      title: t.settings.trackPeriod,
      description: j('Calendar, cycle, pill and symptoms.', 'Calendario, ciclo, pillola e sintomi.'),
      on: !settings.hidePeriod,
      onToggle: togglePeriod,
    },
    body: {
      icon: <Ruler size={14} />,
      tone: TONE.slate,
      title: text.settings.bodyTitle,
      description: j('Body measurements and their charts.', 'Misure del corpo e i loro grafici.'),
      on: bodyOn,
      onToggle: toggleBody,
    },
  };

  return (
    <div className="space-y-5">
      <SubSection
        title={j('Pages', 'Pagine')}
        hint={j('Show, hide or reorder the pages. Today is always shown.', 'Mostra, nascondi o riordina le pagine. Oggi è sempre visibile.')}
      >
        {pageOrder.map((tabId, index) => {
          const row = rows[tabId];
          return (
            <div
              key={tabId}
              data-page-order-row={tabId}
              className="w-full min-h-[52px] flex items-center justify-between gap-2 bg-[var(--inset)] rounded-2xl px-3 py-2.5"
            >
              <button
                type="button"
                role="switch"
                aria-checked={row.on}
                aria-label={row.title}
                disabled={row.disabled}
                onClick={row.onToggle}
                className="pressable flex-1 min-w-0 flex items-center justify-between gap-3 text-left disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span data-settings-badge className={`size-8 rounded-full flex items-center justify-center shrink-0 ${row.tone}`} aria-hidden="true">
                    {row.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-extrabold text-[var(--text)] leading-tight">{row.title}</span>
                    <span className="block text-[11px] font-medium text-[var(--muted)] leading-snug mt-0.5">{row.description}</span>
                  </span>
                </span>
                <SwitchVisual on={row.on} />
              </button>
              <div className="flex flex-col gap-0.5 shrink-0 pl-1.5 border-l border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => movePage(index, -1)}
                  disabled={index === 0}
                  aria-label={j(`Move ${row.title} up`, `Sposta ${row.title} su`)}
                  title={j(`Move ${row.title} up`, `Sposta ${row.title} su`)}
                  className="pressable size-6 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-25 disabled:pointer-events-none"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => movePage(index, 1)}
                  disabled={index === pageOrder.length - 1}
                  aria-label={j(`Move ${row.title} down`, `Sposta ${row.title} giù`)}
                  title={j(`Move ${row.title} down`, `Sposta ${row.title} giù`)}
                  className="pressable size-6 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-25 disabled:pointer-events-none"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {isCustomOrder && (
          <button
            type="button"
            onClick={() => updateSettings({ pageOrder: DEFAULT_PAGE_ORDER })}
            className="pressable w-full py-2 px-3 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] text-[11px] font-extrabold text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={12} />
            <span>{j('Reset page order', 'Ripristina ordine pagine')}</span>
          </button>
        )}
      </SubSection>

      {bodyOn && (
        <button
          type="button"
          onClick={() => {
            setIsSettingsOpen(false);
            setIsProfileOpen(true);
          }}
          className="pressable w-full py-2.5 px-4 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-dashed border-[var(--border)] text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)] text-center"
        >
          <User size={14} className="inline-block align-[-2px] mr-1.5" aria-hidden="true" />
          <span>{text.settings.bodyProfileHint}</span>
        </button>
      )}
    </div>
  );
};
