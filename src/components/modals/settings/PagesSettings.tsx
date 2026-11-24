import React from 'react';
import { CalendarDays, Droplet, LayoutGrid, Ruler, TrendingUp, User } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useAdvancedText } from '../../../i18n/advanced';
import { useJournalText } from '../../../i18n/journal';
import { setBodyEnabled, useAdvanced } from '../../../utils/advancedStore';
import { SubSection, TONE, ToggleRow } from './SettingsParts';

/**
 * Settings > Pages: hide any page except Today. Custom, Statistics and Period are switched here; Body measurements
 * (the Body page) is switched here too and opens the body profile when it is on. Hidden pages leave the tab bar,
 * the sidebar and the swipe order, and the switch of a page you are on sends you back to Today.
 */
export const PagesSettings: React.FC = () => {
  const j = useJournalText();
  const text = useAdvancedText();
  const { t, settings, updateSettings, activeTab, setActiveTab, setIsSettingsOpen, setIsProfileOpen } = useApp();
  const bodyOn = useAdvanced().body.enabled;

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

  return (
    <div className="space-y-5">
      <SubSection title={j('Pages', 'Pagine')} hint={j('Hide the pages you do not use. Today is always shown.', 'Nascondi le pagine che non usi. Oggi è sempre visibile.')}>
        <ToggleRow
          icon={<CalendarDays size={14} />}
          tone={TONE.sky}
          title={t.nav.today}
          description={j('Always shown.', 'Sempre visibile.')}
          on
          disabled
          onToggle={() => undefined}
        />
        <ToggleRow
          icon={<LayoutGrid size={14} />}
          tone={TONE.mint}
          title={t.nav.prebuilt}
          description={j('Meals, recipes, planner, shopping lists and Foods.', 'Pasti, ricette, pianificatore, liste della spesa e Alimenti.')}
          on={!settings.hideCustomPage}
          onToggle={hideCustom}
        />
        <ToggleRow
          icon={<TrendingUp size={14} />}
          tone={TONE.lilac}
          title={t.nav.history}
          description={j('Charts, averages and the daily breakdown.', 'Grafici, medie e riepilogo giornaliero.')}
          on={!settings.hideStatisticsPage}
          onToggle={hideStatistics}
        />
        <ToggleRow
          icon={<Droplet size={14} />}
          tone={TONE.rose}
          title={t.settings.trackPeriod}
          description={j('Calendar, cycle, pill and symptoms.', 'Calendario, ciclo, pillola e sintomi.')}
          on={!settings.hidePeriod}
          onToggle={togglePeriod}
        />
        <ToggleRow
          icon={<Ruler size={14} />}
          tone={TONE.slate}
          title={text.settings.bodyTitle}
          description={j('Body measurements and their charts.', 'Misure del corpo e i loro grafici.')}
          on={bodyOn}
          onToggle={toggleBody}
        />
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
