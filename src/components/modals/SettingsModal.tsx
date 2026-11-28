import React, { useOptimistic, useTransition } from 'react';
import { LayoutGrid, Languages, Minimize2, Palette, PanelsTopLeft, Sun, Trash2 } from 'lucide-react';
import { useSettings, useUiState } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { DataBackup } from '../common/DataBackup';
import { InstallApp } from '../common/InstallApp';
import { Collapsible } from '../common/Collapsible';
import { NotificationSettings } from './NotificationSettings';
import { AdvancedSettings } from './AdvancedSettings';
import { MONO_HUES, SIX_NEW_THEMES } from '../../utils/themes';
import { useJournalText } from '../../i18n/journal';
import { SwitchVisual, TONE } from './settings/SettingsParts';
import { TodaySettings } from './settings/TodaySettings';
import { CustomPageSettings } from './settings/CustomPageSettings';
import { PagesSettings } from './settings/PagesSettings';
import { GoalsSettings } from './settings/GoalsSettings';
import { DeleteDataSettings } from './settings/DeleteDataSettings';

/**
 * Settings, one collapsible group per area, each with its own colour badge (see `TONE` in settings/SettingsParts.tsx):
 * Language, Appearance, Today, Custom page, Pages, Advanced, Notifications, Backup, Install app, Delete data.
 */
export const SettingsModal: React.FC = () => {
  const j = useJournalText();
  const { isSettingsOpen, setIsSettingsOpen } = useUiState();
  const {
    language,
    setLanguage,
    settings,
    updateSettings,
    t,
  } = useSettings();
  const [, startTransition] = useTransition();
  const [optimisticAppearance, setOptimisticAppearance] = useOptimistic(
    {
      theme: settings.theme,
      themeStyle: settings.themeStyle,
      monoHue: settings.monoHue,
      ultraMinimal: settings.ultraMinimal,
    },
    (state, patch: Partial<Pick<typeof settings, 'theme' | 'themeStyle' | 'monoHue' | 'ultraMinimal'>>) => ({
      ...state,
      ...patch,
    }),
  );

  if (!isSettingsOpen) return null;

  const updateAppearance = (patch: Partial<Pick<typeof settings, 'theme' | 'themeStyle' | 'monoHue' | 'ultraMinimal'>>) => {
    startTransition(() => {
      setOptimisticAppearance(patch);
      updateSettings(patch);
    });
  };

  const seg = (active: boolean) =>
    `pressable flex-1 py-2.5 rounded-xl text-xs font-extrabold text-center border ${
      active
        ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
        : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
    }`;

  return (
    <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title={t.settings.title} maxWidth="max-w-md">
      <div className="space-y-5">
        <Collapsible title={t.settings.language} icon={<Languages size={15} />} tone={TONE.sky}>
          <div className="flex gap-1.5" role="group" aria-label={t.settings.language}>
            <button type="button" onClick={() => setLanguage('en')} className={seg(language === 'en')}>
              English (EN)
            </button>
            <button type="button" onClick={() => setLanguage('it')} className={seg(language === 'it')}>
              Italiano (IT)
            </button>
          </div>
        </Collapsible>

        <Collapsible title={t.settings.appearance} icon={<Palette size={15} />} tone={TONE.lilac}>
          {/* Theme */}
          <div className="space-y-3">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)] block mb-2">
                {t.settings.theme}
              </span>
              <div className="flex gap-1.5" role="group" aria-label={t.settings.theme}>
                {([
                  ['light', t.settings.light],
                  ['lite-dark', t.settings.liteDark],
                  ['dark', t.settings.dark],
                ] as const).map(([theme, label]) => (
                  <button
                    key={theme}
                    type="button"
                    aria-pressed={optimisticAppearance.theme === theme}
                    onClick={() => updateAppearance({ theme })}
                    className={seg(optimisticAppearance.theme === theme)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Home-screen widgets: look (just below Theme; the custom button lives in Today > Custom buttons) */}
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)] block mb-2">
                {t.settings.widgets}
              </span>
              <div className="flex gap-1.5" role="group" aria-label={t.settings.widgetStyle}>
                {([
                  ['light', t.settings.widgetLight],
                  ['dark', t.settings.widgetDark],
                ] as const).map(([style, label]) => (
                  <button
                    key={style}
                    type="button"
                    aria-pressed={settings.widgetStyle === style}
                    onClick={() => updateSettings({ widgetStyle: style })}
                    className={seg(settings.widgetStyle === style)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 6 New Themes + Classic */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">
                  {t.settings.themeStyle}
                </span>
                <button
                  type="button"
                  aria-pressed={optimisticAppearance.themeStyle === 'classic'}
                  onClick={() => updateAppearance({ themeStyle: 'classic' })}
                  className={`pressable px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${
                    optimisticAppearance.themeStyle === 'classic'
                      ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
                      : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                  }`}
                >
                  {t.settings.classicTheme}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={t.settings.themeStyle}>
                {SIX_NEW_THEMES.map((preset) => {
                  const active = optimisticAppearance.themeStyle === preset.id;
                  const swatches =
                    preset.id === 'mono'
                      ? ['#0f172a', optimisticAppearance.monoHue, '#e2e8f0']
                      : preset.swatches;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      data-theme-preset={preset.id}
                      aria-pressed={active}
                      onClick={() => updateAppearance({ themeStyle: preset.id })}
                      className={`pressable flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left border transition-colors ${
                        active
                          ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
                          : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] border-[var(--border)]'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-extrabold leading-tight truncate">{preset.name[language]}</span>
                      </span>
                      <span className="inline-flex items-center -space-x-1 shrink-0" aria-hidden="true">
                        {swatches.map((hex, idx) => (
                          <span key={idx} className="size-3.5 rounded-full border border-black/20" style={{ backgroundColor: hex }} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {optimisticAppearance.themeStyle === 'mono' && (
              <div className="bg-[var(--inset)] border border-[var(--border)] rounded-xl p-2.5">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)] mb-2">
                  {t.settings.monoHue}
                </span>
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t.settings.monoHue}>
                  {MONO_HUES.map((hue) => {
                    const active = optimisticAppearance.monoHue.toLowerCase() === hue.hex.toLowerCase();
                    return (
                      <button
                        key={hue.id}
                        type="button"
                        title={hue.label[language]}
                        aria-label={hue.label[language]}
                        aria-pressed={active}
                        onClick={() => updateAppearance({ monoHue: hue.hex })}
                        className={`pressable size-6 rounded-full border-2 transition-transform ${
                          active ? 'scale-115 border-[var(--text)] ring-2 ring-[var(--surface)]' : 'border-transparent hover:scale-110'
                        }`}
                        style={{ backgroundColor: hue.hex }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={optimisticAppearance.ultraMinimal}
            aria-label={t.settings.ultraMinimal}
            onClick={() => updateAppearance({ ultraMinimal: !optimisticAppearance.ultraMinimal })}
            className="pressable w-full flex items-center justify-between gap-3 border border-[var(--border)] bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3 py-2.5 transition-colors text-left"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span data-settings-badge className={`size-8 rounded-full flex items-center justify-center shrink-0 ${TONE.lilac}`} aria-hidden="true">
                <Minimize2 size={14} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-extrabold text-[var(--text)]">{t.settings.ultraMinimal}</span>
              </span>
            </span>
            <SwitchVisual on={optimisticAppearance.ultraMinimal} />
          </button>
        </Collapsible>

        <Collapsible title={j('Today', 'Oggi')} icon={<Sun size={15} />} tone={TONE.butter}>
          <TodaySettings />
        </Collapsible>

        <Collapsible title={j('Custom page', 'Pagina Custom')} icon={<LayoutGrid size={15} />} tone={TONE.mint}>
          <CustomPageSettings />
        </Collapsible>

        <Collapsible title={j('Pages', 'Pagine')} icon={<PanelsTopLeft size={15} />} tone={TONE.peach}>
          <PagesSettings />
        </Collapsible>

        {/* Goals & limits */}
        <GoalsSettings />

        {/* Advanced personalisation: advanced layout (opt-in) */}
        <AdvancedSettings />

        {/* Reminders: water, meals, custom buttons, weight, daily log */}
        <NotificationSettings />

        {/* JSON backup lives in Settings, not Statistics */}
        <DataBackup />

        {/* PWA: shown only when the browser can install the app */}
        <InstallApp />

        {/* Delete specific records (each asks first) and, at the bottom, everything (two confirmations) */}
        <Collapsible title={j('Delete data', 'Elimina dati')} icon={<Trash2 size={15} />} tone={TONE.red}>
          <DeleteDataSettings />
        </Collapsible>
      </div>
    </Modal>
  );
};
