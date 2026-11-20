import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { fuzzyMatch, fuzzyScore } from '../../utils/fuzzy';
import { useOffCatalog } from '../../utils/useOffCatalog';
import { catalogueScore } from '../../data/offCatalog';
import { FoodItem } from '../../types';
import {
  UtensilsCrossed,
  Footprints,
  Droplets,
  Scale,
  Sparkles,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Pencil,
  Droplet,
  Minimize2,
  Candy,
  X,
} from 'lucide-react';
import { PoopIcon } from '../common/PoopIcon';
import { TrackerIcon, TRACKER_ICONS } from '../common/TrackerIcon';
import { DataBackup } from '../common/DataBackup';
import { InstallApp } from '../common/InstallApp';
import { DeleteAllData } from '../common/DeleteAllData';
import { Collapsible } from '../common/Collapsible';
import { NotificationSettings } from './NotificationSettings';
import { AdvancedSettings } from './AdvancedSettings';
import { MONO_HUES, SIX_NEW_THEMES } from '../../utils/themes';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    language,
    setLanguage,
    settings,
    updateSettings,
    setActiveTab,
    activeTab,
    allFoods,
    rememberFood,
    t,
  } = useApp();

  const [pickerIdx, setPickerIdx] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [creatingBtn, setCreatingBtn] = useState(false);
  const [newBtnName, setNewBtnName] = useState('');
  const [newBtnType, setNewBtnType] = useState<'quantity' | 'toggle'>('quantity');
  const [newBtnUnit, setNewBtnUnit] = useState('');
  const [newBtnIcon, setNewBtnIcon] = useState('sparkles');
  const [newBtnStats, setNewBtnStats] = useState(true);
  const [editingBtnId, setEditingBtnId] = useState<string | null>(null);
  const widgetShortcutEnabled = settings.customButtons.length > 0 && settings.widgetCustomButton;

  const nameOf = (f: FoodItem) =>
    language === 'it' ? f.name_it : f.name_en || f.name_de;

  const foodById = (id: string) => allFoods.find((x) => x.id === id);

  // Food picker results, same behaviour as the Add Food search (type to find, typos OK)
  const catalogue = useOffCatalog(pickerIdx !== null);
  const pickerResults = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    const local = allFoods
      .map((f) => ({
        f,
        score: fuzzyScore(q, `${f.name_de} ${f.name_it} ${f.name_en} ${f.brand || ''}`),
      }))
      .filter((x) => fuzzyMatch(q, [x.f.name_de, x.f.name_it, x.f.name_en, x.f.brand || '']));
    const known = new Set(local.map(({ f }) => f.id));
    const matches = (catalogue?.search(q, 25) ?? []).filter((f) => !known.has(f.id));
    return [...local, ...matches.map((f) => ({ f, score: catalogueScore(q) }))].sort((a, b) => a.score - b.score)
      .slice(0, 25)
      .map((x) => x.f);
  }, [allFoods, query, catalogue]);

  const seg = (active: boolean) =>
    `pressable flex-1 py-2.5 rounded-xl text-xs font-extrabold text-center border ${
      active
        ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
        : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
    }`;

  const SwitchVisual: React.FC<{ on: boolean }> = ({ on }) => (
    <span
      aria-hidden="true"
      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-150 shrink-0 inline-flex items-center border ${
        on
          ? 'bg-[#C9EFD3] border-[#9ADBB0]'
          : 'bg-[var(--border)] border-[var(--border)]'
      }`}
    >
      <span
        className={`block w-5 h-5 rounded-full transition-transform [transition-duration:420ms] [transition-timing-function:var(--ease-bounce)] shadow-sm ${
          on ? 'translate-x-5 bg-[#1E5E3A]' : 'translate-x-0 bg-[#FBF8F2]'
        }`}
      />
    </span>
  );

  const quickRows = [
    { key: 'food' as const, icon: UtensilsCrossed, cls: 'bg-intake text-intake-ink', label: t.quickAdd.food },
    { key: 'movement' as const, icon: Footprints, cls: 'bg-activity text-activity-ink', label: t.quickAdd.movement },
    { key: 'water' as const, icon: Droplets, cls: 'bg-[#CFE7FE] text-[#183F66]', label: t.quickAdd.water },
    { key: 'poop' as const, icon: null, cls: 'bg-[#FAE0B4] text-[#7D4E14]', label: t.quickAdd.poop },
    { key: 'weight' as const, icon: Scale, cls: 'bg-weight text-weight-ink', label: t.quickAdd.weight },
    { key: 'custom' as const, icon: Sparkles, cls: 'bg-[#F7E9AA] text-[#6E5B14]', label: t.quickAdd.custom },
  ];

  const close = () => {
    setIsSettingsOpen(false);
    setPickerIdx(null);
    setQuery('');
    setCreatingBtn(false);
    setEditingBtnId(null);
  };

  const startEditBtn = (id: string) => {
    const b = settings.customButtons.find((x) => x.id === id);
    if (!b) return;
    setEditingBtnId(id);
    setNewBtnName(b.name);
    setNewBtnType(b.type);
    setNewBtnUnit(b.unit || '');
    setNewBtnIcon(b.icon || 'sparkles');
    setNewBtnStats(b.showStats !== false);
    setCreatingBtn(true);
  };

  const resetBtnForm = () => {
    setCreatingBtn(false);
    setEditingBtnId(null);
    setNewBtnName('');
    setNewBtnUnit('');
    setNewBtnType('quantity');
    setNewBtnIcon('sparkles');
    setNewBtnStats(true);
  };

  const finishBtnForm = () => {
    if (!newBtnName.trim()) return;
    const payload = {
      name: newBtnName.trim(),
      type: newBtnType,
      unit: newBtnType === 'quantity' ? newBtnUnit.trim() || undefined : undefined,
      icon: newBtnIcon,
      showStats: newBtnStats,
    };
    updateSettings({
      customButtons: editingBtnId
        ? settings.customButtons.map((x) => (x.id === editingBtnId ? { ...x, ...payload } : x))
        : [...settings.customButtons, { id: 'cbtn-' + Date.now(), ...payload }],
    });
    resetBtnForm();
  };

  return (
    <Modal isOpen={isSettingsOpen} onClose={close} title={t.settings.title} maxWidth="max-w-md">
      {pickerIdx !== null ? (
        /* ---------- Food picker for a quick-add shortcut ---------- */
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setPickerIdx(null);
              setQuery('');
            }}
            className="pressable inline-flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
          >
            <ArrowLeft size={14} />
            <span>{t.common.back}</span>
          </button>

          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.foodModal.typeToSearch}
              autoFocus
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl pl-9 pr-9 py-2.5 text-sm font-medium text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--muted)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
                aria-label={t.common.clear}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {query.trim().length < 2 ? (
            <p className="text-[11px] font-medium text-[var(--muted)] px-1">
              {t.foodModal.minCharsHint}
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border)] bg-[var(--inset)] border border-[var(--border)] rounded-2xl">
              {pickerResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--muted)]">{t.foodModal.noResults}</div>
              ) : (
                pickerResults.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => {
                      const next = [...settings.quickFoods];
                      rememberFood(food);
                      next[pickerIdx] = food.id;
                      updateSettings({ quickFoods: next });
                      setPickerIdx(null);
                      setQuery('');
                    }}
                    className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--hover)] transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-bold text-[var(--text)] truncate">
                      {nameOf(food)}
                    </span>
                    <span className="text-xs font-extrabold tabular-nums text-[var(--muted)] shrink-0">
                      {food.calories} kcal/100{food.unit}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        /* ---------- Settings main ---------- */
        <div className="space-y-5">
          {/* Language */}
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)] block mb-2">
              {t.settings.language}
            </span>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setLanguage('en')} className={seg(language === 'en')}>
                English (EN)
              </button>
              <button type="button" onClick={() => setLanguage('it')} className={seg(language === 'it')}>
                Italiano (IT)
              </button>
            </div>
          </div>

          <Collapsible title={t.settings.appearance}>
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
                    aria-pressed={settings.theme === theme}
                    onClick={() => updateSettings({ theme })}
                    className={seg(settings.theme === theme)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Home-screen widgets: look (just below Theme; the custom button lives in Custom buttons) */}
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
                  aria-pressed={settings.themeStyle === 'classic'}
                  onClick={() => updateSettings({ themeStyle: 'classic' })}
                  className={`pressable px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${
                    settings.themeStyle === 'classic'
                      ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
                      : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                  }`}
                >
                  {t.settings.classicTheme}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={t.settings.themeStyle}>
                {SIX_NEW_THEMES.map((preset) => {
                  const active = settings.themeStyle === preset.id;
                  const swatches =
                    preset.id === 'mono'
                      ? ['#0f172a', settings.monoHue, '#e2e8f0']
                      : preset.swatches;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      data-theme-preset={preset.id}
                      aria-pressed={active}
                      onClick={() => updateSettings({ themeStyle: preset.id })}
                      className={`pressable flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left border transition-colors ${
                        active
                          ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
                          : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] border-[var(--border)]'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-extrabold leading-tight truncate">
                          {preset.name[language]}
                        </span>
                        <span
                          className={`block text-[10px] font-semibold leading-tight truncate mt-0.5 ${
                            active ? 'opacity-80' : 'text-[var(--muted)]'
                          }`}
                        >
                          {preset.tag[language]}
                        </span>
                      </span>
                      <span className="inline-flex items-center -space-x-1 shrink-0" aria-hidden="true">
                        {swatches.map((hex, idx) => (
                          <span
                            key={idx}
                            className="size-3.5 rounded-full border border-black/20"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {settings.themeStyle === 'mono' && (
              <div className="bg-[var(--inset)] border border-[var(--border)] rounded-xl p-2.5">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)] mb-2">
                  {t.settings.monoHue}
                </span>
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t.settings.monoHue}>
                  {MONO_HUES.map((hue) => {
                    const active = settings.monoHue.toLowerCase() === hue.hex.toLowerCase();
                    return (
                      <button
                        key={hue.id}
                        type="button"
                        title={hue.label[language]}
                        aria-label={hue.label[language]}
                        aria-pressed={active}
                        onClick={() => updateSettings({ monoHue: hue.hex })}
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
            aria-pressed={settings.ultraMinimal}
            aria-label={t.settings.ultraMinimal}
            onClick={() => updateSettings({ ultraMinimal: !settings.ultraMinimal })}
            className="w-full flex items-center justify-between gap-3 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3 py-3 transition-colors text-left"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="size-8 rounded-full bg-[#E2D6FF] text-[#4D3582] flex items-center justify-center shrink-0">
                <Minimize2 size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-extrabold text-[var(--text)]">{t.settings.ultraMinimal}</span>
              </span>
            </span>
            <SwitchVisual on={settings.ultraMinimal} />
          </button>

          </Collapsible>

          <Collapsible title={t.settings.todayAndPages}>
          {/* Quick-add buttons */}
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)] block mb-2">
              {t.settings.quickAdd}
            </span>
            <div className="space-y-1.5">
              {quickRows.map((r) => {
                const Icon = r.icon;
                const isOn = settings.quickAdd[r.key];
                return (
                  <button
                    key={r.key}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() =>
                      updateSettings({
                        quickAdd: { ...settings.quickAdd, [r.key]: !isOn },
                      })
                    }
                    className="w-full min-h-[52px] flex flex-nowrap items-center justify-between gap-2 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-xl px-3 py-2 transition-colors text-left"
                  >
                    <span className="flex items-center gap-1.5 min-w-0 text-xs font-bold text-[var(--text)]">
                      <span className={`size-7 rounded-full flex items-center justify-center shrink-0 ${r.cls}`}>
                        {Icon ? <Icon size={13} /> : <PoopIcon size={13} />}
                      </span>
                      <span className="min-w-0 break-words leading-tight">{r.label}</span>
                    </span>
                    <span className="scale-[0.82] origin-right shrink-0 ml-auto">
                      <SwitchVisual on={isOn} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sugar tracking */}
          <button
            type="button"
            aria-pressed={settings.trackSugar}
            aria-label={t.settings.trackSugar}
            onClick={() => updateSettings({ trackSugar: !settings.trackSugar })}
            className="w-full flex items-center justify-between gap-3 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3 py-3 transition-colors text-left"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="size-8 rounded-full bg-[#F7E9AA] text-[#6E5B14] flex items-center justify-center shrink-0">
                <Candy size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-extrabold text-[var(--text)]">{t.settings.trackSugar}</span>
              </span>
            </span>
            <SwitchVisual on={settings.trackSugar} />
          </button>

          {/* Visibility toggles (kept above food shortcuts) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <button
              type="button"
              aria-pressed={settings.hidePoop}
              onClick={() => updateSettings({ hidePoop: !settings.hidePoop })}
              className="min-h-[54px] flex items-center justify-between gap-2 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-xl px-3 py-2 transition-colors text-left"
            >
              <span className="flex items-center gap-2 text-xs font-bold text-[var(--text)]">
                <span className="size-7 rounded-full bg-[#FAE0B4] text-[#7D4E14] flex items-center justify-center shrink-0">
                  <PoopIcon size={13} />
                </span>
                {t.settings.hidePoop}
              </span>
              <span className="scale-[0.82] origin-right shrink-0">
                <SwitchVisual on={settings.hidePoop} />
              </span>
            </button>

            <button
              type="button"
              aria-pressed={settings.hidePeriod}
              onClick={() => {
                const next = !settings.hidePeriod;
                updateSettings({ hidePeriod: next, hidePeriodCustomized: true });
                if (next && activeTab === 'period') setActiveTab('today');
              }}
              className="min-h-[54px] flex items-center justify-between gap-2 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-xl px-3 py-2 transition-colors text-left"
            >
              <span className="flex items-center gap-2 text-xs font-bold text-[var(--text)]">
                <span className="size-7 rounded-full bg-[#F4C6D8] text-[#6E2440] flex items-center justify-center shrink-0">
                  <Droplet size={13} />
                </span>
                {t.settings.hidePeriod}
              </span>
              <span className="scale-[0.82] origin-right shrink-0">
                <SwitchVisual on={settings.hidePeriod} />
              </span>
            </button>
          </div>

          {/* Quick food shortcuts */}
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)] block mb-1">
              {t.settings.quickFoodsLabel}
            </span>
            <p className="text-[11px] font-medium text-[var(--muted)] mb-2">{t.settings.quickFoodsHint}</p>
            <div className="space-y-1.5">
              {settings.quickFoods.map((id, i) => {
                const f = foodById(id);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPickerIdx(i)}
                    className="pressable w-full flex items-center justify-between gap-2 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3.5 py-2.5 text-left"
                  >
                    <span className="text-sm font-bold text-[var(--text)] truncate">
                      {f ? nameOf(f) : id}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {f && (
                        <span className="text-[11px] font-bold tabular-nums text-[var(--muted)]">
                          {f.calories} kcal/100{f.unit}
                        </span>
                      )}
                      <ChevronRight size={15} className="text-[var(--muted)]" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          </Collapsible>

          <Collapsible title={t.settings.customButtons}>
          <div className="space-y-2">
                <button
                  type="button"
                  aria-pressed={widgetShortcutEnabled}
                  aria-label={t.settings.widgetCustomButton}
                  disabled={settings.customButtons.length === 0}
                  onClick={() => updateSettings({ widgetCustomButton: !settings.widgetCustomButton })}
                  className="w-full flex items-center justify-between gap-3 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3 py-3 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="kc-custom-icon-badge size-8 rounded-full bg-[#F7E9AA] text-[#6E5B14] flex items-center justify-center shrink-0">
                      <Sparkles size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-extrabold text-[var(--text)]">{t.settings.widgetCustomButton}</span>
                    </span>
                  </span>
                  <SwitchVisual on={widgetShortcutEnabled} />
                </button>
          </div>

          {/* Custom buttons */}
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)] block mb-1">
              {t.settings.customButtons}
            </span>
            <p className="text-[11px] font-medium text-[var(--muted)] mb-2">
              {t.settings.customButtonsHint}
            </p>

            <div className="space-y-1.5">
              {settings.customButtons.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-2 bg-[var(--inset)] rounded-2xl px-3 py-2.5"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="kc-custom-icon-badge w-8 h-8 rounded-full bg-[#F7E9AA] text-[#6E5B14] flex items-center justify-center shrink-0">
                        <TrackerIcon icon={b.icon} size={15} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-[var(--text)] truncate">{b.name}</span>
                        <span className="block text-[11px] font-bold text-[var(--muted)] truncate">
                          {b.type === 'toggle'
                            ? t.settings.typeToggle
                            : `${t.settings.typeQuantity}${b.unit ? ' · ' + b.unit : ''}`}
                          {b.showStats === false ? '' : ' · ' + t.settings.showStats}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditBtn(b.id)}
                        className="pressable w-8 h-8 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] flex items-center justify-center"
                        title={t.settings.editCustomBtn}
                        aria-label={t.settings.editCustomBtn}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateSettings({ customButtons: settings.customButtons.filter((x) => x.id !== b.id) })
                        }
                        className="pressable w-8 h-8 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
                        title={t.settings.deleteCustomBtn}
                        aria-label={t.settings.deleteCustomBtn}
                      >
                        <Trash2 size={13} />
                      </button>
                    </span>
                  </div>
                ))}

              <Modal
                isOpen={creatingBtn}
                onClose={resetBtnForm}
                title={editingBtnId ? t.settings.editCustomBtn : t.settings.newCustomBtn}
                maxWidth="max-w-md"
              >
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newBtnName}
                    onChange={(e) => setNewBtnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newBtnName.trim()) finishBtnForm();
                    }}
                    placeholder={t.settings.customNamePlaceholder}
                    aria-label={t.settings.customName}
                    maxLength={40}
                    autoFocus
                    className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--muted)]"
                  />

                  {/* Icon picker */}
                  <div>
                    <span className="block text-[11px] font-bold text-[var(--muted)] mb-1">
                      {t.settings.chooseIcon}
                    </span>
                    <div className="grid grid-cols-6 gap-1.5">
                      {TRACKER_ICONS.map((ic) => (
                        <button
                          key={ic}
                          type="button"
                          onClick={() => setNewBtnIcon(ic)}
                          aria-label={ic}
                          aria-pressed={newBtnIcon === ic}
                          className={`pressable h-9 rounded-xl flex items-center justify-center border ${
                            newBtnIcon === ic
                              ? 'kc-chip-active bg-[#E2D6FF] border-[#C9B8F2] text-[#4D3582]'
                              : 'bg-[var(--inset)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                          }`}
                        >
                          <TrackerIcon icon={ic} size={16} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNewBtnType('quantity')}
                      className={`pressable py-2 rounded-xl text-xs font-extrabold border ${
                        newBtnType === 'quantity'
                          ? 'kc-chip-active bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]'
                          : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
                      }`}
                    >
                      {t.settings.typeQuantity}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewBtnType('toggle')}
                      className={`pressable py-2 rounded-xl text-xs font-extrabold border ${
                        newBtnType === 'toggle'
                          ? 'kc-chip-active bg-[#E2D6FF] text-[#4D3582] border-[#C9B8F2]'
                          : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
                      }`}
                    >
                      {t.settings.typeToggle}
                    </button>
                  </div>

                  {newBtnType === 'quantity' && (
                    <input
                      type="text"
                      value={newBtnUnit}
                      onChange={(e) => setNewBtnUnit(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newBtnName.trim()) finishBtnForm();
                      }}
                      placeholder={t.settings.customUnitPlaceholder}
                      aria-label={t.settings.customUnit}
                      maxLength={12}
                      className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--muted)]"
                    />
                  )}

                  {/* Statistics question */}
                  <button
                    type="button"
                    aria-pressed={newBtnStats}
                    onClick={() => setNewBtnStats((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3 py-2 text-left"
                  >
                    <span className="text-xs font-bold text-[var(--text)]">{t.settings.showStatsQ}</span>
                    <SwitchVisual on={newBtnStats} />
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={resetBtnForm}
                      className="pressable flex-1 py-2.5 rounded-xl bg-[var(--inset)] border border-[var(--border)] text-xs font-extrabold text-[var(--muted)]"
                    >
                      {t.common.cancel}
                    </button>
                    <button
                      type="button"
                      disabled={!newBtnName.trim()}
                      onClick={finishBtnForm}
                      className="kc-primary-btn pressable flex-1 py-2.5 rounded-xl bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] text-xs font-extrabold disabled:opacity-40"
                    >
                      {t.common.save}
                    </button>
                  </div>
                </div>
              </Modal>
              <button
                type="button"
                onClick={() => setCreatingBtn(true)}
                className="pressable w-full py-2.5 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-dashed border-[var(--border)] text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center gap-1.5"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>{t.settings.newCustomBtn}</span>
              </button>
            </div>
          </div>

          </Collapsible>

          {/* Advanced personalisation: goals / limits and body measurements (all opt-in) */}
          <AdvancedSettings />

          {/* Reminders: water, meals, custom buttons, weight, daily log */}
          <NotificationSettings />

          {/* Foods database */}
          <button
            type="button"
            onClick={() => {
              close();
              setActiveTab('database');
            }}
            className="pressable w-full flex items-center justify-between bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3 py-3 text-left"
          >
            <span className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-[#C9EFD3] text-[#174A2B] flex items-center justify-center shrink-0">
                <BookOpen size={15} />
              </span>
              <span>
                <span className="block text-sm font-extrabold text-[var(--text)]">{t.settings.foodsDatabase}</span>
                <span className="block text-[11px] font-medium text-[var(--muted)]">{t.settings.foodsDesc}</span>
              </span>
            </span>
            <ChevronRight size={16} className="text-[var(--muted)] shrink-0" />
          </button>

          {/* JSON backup now lives in Settings, not Statistics */}
          <DataBackup />

          {/* PWA: shown only when the browser can install the app */}
          <InstallApp />

          {/* Danger zone: erase everything (two confirmations) */}
          <DeleteAllData />
        </div>
      )}
    </Modal>
  );
};
