import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { fuzzyMatch, fuzzyScore } from '../../utils/fuzzy';
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
} from 'lucide-react';
import { PoopIcon } from '../common/PoopIcon';
import { TrackerIcon, TRACKER_ICONS } from '../common/TrackerIcon';
import { Droplet } from 'lucide-react';

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

  const nameOf = (f: FoodItem) =>
    language === 'it' ? f.name_it : f.name_en || f.name_de;

  const foodById = (id: string) => allFoods.find((x) => x.id === id);

  // Food picker results, same behaviour as the Add Food search (type to find, typos OK)
  const pickerResults = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    return allFoods
      .map((f) => ({
        f,
        score: fuzzyScore(q, `${f.name_de} ${f.name_it} ${f.name_en} ${f.brand || ''}`),
      }))
      .filter((x) => fuzzyMatch(q, [x.f.name_de, x.f.name_it, x.f.name_en, x.f.brand || '']))
      .sort((a, b) => a.score - b.score)
      .slice(0, 25)
      .map((x) => x.f);
  }, [allFoods, query]);

  const seg = (active: boolean) =>
    `flex-1 py-2 rounded-xl text-xs font-extrabold text-center transition-colors ${
      active ? 'bg-[var(--text)] text-[var(--surface)]' : 'bg-[var(--inset)] text-[var(--muted)]'
    }`;

  const Toggle: React.FC<{ on: boolean; onClick: () => void }> = ({ on, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${on ? 'bg-[#C9EFD3]' : 'bg-[var(--inset)]'}`}
      aria-pressed={on}
    >
      <span
        className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );

  const quickRows = [
    { key: 'food' as const, icon: UtensilsCrossed, cls: 'bg-[#C9EFD3] text-[#174A2B]', label: t.quickAdd.food },
    { key: 'movement' as const, icon: Footprints, cls: 'bg-[#E2D6FF] text-[#4D3582]', label: t.quickAdd.movement },
    { key: 'water' as const, icon: Droplets, cls: 'bg-[#CFE7FE] text-[#183F66]', label: t.quickAdd.water },
    { key: 'poop' as const, icon: null, cls: 'bg-[#FAE0B4] text-[#7D4E14]', label: t.quickAdd.poop },
    { key: 'weight' as const, icon: Scale, cls: 'bg-[#F6D0D0] text-[#7A2727]', label: t.quickAdd.weight },
    { key: 'custom' as const, icon: Sparkles, cls: 'bg-[#E2D6FF] text-[#4D3582]', label: t.quickAdd.custom },
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
    setCreatingBtn(false);
    setEditingBtnId(null);
    setNewBtnName('');
    setNewBtnUnit('');
    setNewBtnType('quantity');
    setNewBtnIcon('sparkles');
    setNewBtnStats(true);
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
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
          >
            <ArrowLeft size={14} />
            <span>{t.common.back}</span>
          </button>

          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.foodModal.searchPlaceholder}
              autoFocus
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl pl-9 pr-3 py-2.5 text-sm font-medium text-[var(--text)] placeholder-[var(--muted)] focus:outline-none"
            />
          </div>

          {query.trim().length >= 2 && (
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
                      next[pickerIdx] = food.id;
                      updateSettings({ quickFoods: next });
                      setPickerIdx(null);
                      setQuery('');
                    }}
                    className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--border)] transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-bold text-[var(--text)] truncate">
                      {nameOf(food)}
                    </span>
                    <span className="text-xs font-extrabold text-[var(--muted)] shrink-0">
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
                EN
              </button>
              <button type="button" onClick={() => setLanguage('it')} className={seg(language === 'it')}>
                IT
              </button>
            </div>
          </div>

          {/* Theme */}
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)] block mb-2">
              {t.settings.theme}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'light' })}
                className={seg(settings.theme === 'light')}
              >
                {t.settings.light}
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'dark' })}
                className={seg(settings.theme === 'dark')}
              >
                {t.settings.dark}
              </button>
            </div>
          </div>

          {/* Quick-add buttons */}
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)] block mb-2">
              {t.settings.quickAdd}
            </span>
            <div className="space-y-1.5">
              {quickRows.map((r) => {
                const Icon = r.icon;
                return (
                  <div
                    key={r.key}
                    className="flex items-center justify-between bg-[var(--inset)] rounded-2xl px-3 py-2.5"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-bold text-[var(--text)]">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center ${r.cls}`}>
                        {Icon ? <Icon size={15} /> : <PoopIcon size={15} />}
                      </span>
                      {r.label}
                    </span>
                    <Toggle
                      on={settings.quickAdd[r.key]}
                      onClick={() =>
                        updateSettings({
                          quickAdd: { ...settings.quickAdd, [r.key]: !settings.quickAdd[r.key] },
                        })
                      }
                    />
                  </div>
                );
              })}
            </div>
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
                    className="w-full flex items-center justify-between bg-[var(--inset)] hover:bg-[var(--border)] rounded-2xl px-3 py-2.5 transition-colors"
                  >
                    <span className="text-sm font-bold text-[var(--text)] truncate">
                      {f ? nameOf(f) : id}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {f && (
                        <span className="text-[11px] font-bold text-[var(--muted)]">
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

          {/* Custom buttons */}
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)] block mb-1">
              {t.settings.customButtons}
            </span>
            <p className="text-[11px] font-medium text-[var(--muted)] mb-2">
              {t.settings.customButtonsHint}
            </p>

            <div className="space-y-1.5">
              {!creatingBtn &&
                settings.customButtons.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-2 bg-[var(--inset)] rounded-2xl px-3 py-2.5"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-[var(--surface)] text-[var(--text)] flex items-center justify-center shrink-0">
                        <TrackerIcon icon={b.icon} size={15} />
                      </span>
                      <span className="text-sm font-bold text-[var(--text)] truncate">{b.name}</span>
                      <span className="text-[11px] font-bold text-[var(--muted)] shrink-0">
                        {b.type === 'toggle' ? t.settings.typeToggle : `${t.settings.typeQuantity}${b.unit ? ' · ' + b.unit : ''}`}
                        {b.showStats === false ? '' : ' · ' + t.settings.showStats}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditBtn(b.id)}
                        className="w-7 h-7 rounded-full text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors"
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
                        className="w-7 h-7 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0]/60 flex items-center justify-center transition-colors"
                        title={t.settings.deleteCustomBtn}
                        aria-label={t.settings.deleteCustomBtn}
                      >
                        <Trash2 size={13} />
                      </button>
                    </span>
                  </div>
                ))}

              {creatingBtn ? (
                <div className="bg-[var(--inset)] rounded-2xl p-3 space-y-2.5">
                  <input
                    type="text"
                    value={newBtnName}
                    onChange={(e) => setNewBtnName(e.target.value)}
                    placeholder={t.settings.customNamePlaceholder}
                    maxLength={40}
                    autoFocus
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold text-[var(--text)] placeholder-[var(--muted)] focus:outline-none"
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
                          className={`h-9 rounded-xl flex items-center justify-center border transition-colors ${
                            newBtnIcon === ic
                              ? 'bg-[var(--surface)] border-[var(--text)] text-[var(--text)]'
                              : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
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
                      className={`py-2 rounded-xl text-xs font-extrabold border ${
                        newBtnType === 'quantity'
                          ? 'bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]'
                          : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--border)]'
                      }`}
                    >
                      {t.settings.typeQuantity}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewBtnType('toggle')}
                      className={`py-2 rounded-xl text-xs font-extrabold border ${
                        newBtnType === 'toggle'
                          ? 'bg-[#E2D6FF] text-[#4D3582] border-[#C9B8F2]'
                          : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--border)]'
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
                      placeholder={t.settings.customUnitPlaceholder}
                      maxLength={12}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text)] placeholder-[var(--muted)] focus:outline-none"
                    />
                  )}

                  {/* Statistics question */}
                  <label className="flex items-center justify-between bg-[var(--surface)] rounded-xl px-3 py-2 cursor-pointer">
                    <span className="text-xs font-bold text-[var(--text)]">{t.settings.showStatsQ}</span>
                    <input
                      type="checkbox"
                      checked={newBtnStats}
                      onChange={(e) => setNewBtnStats(e.target.checked)}
                      className="w-4 h-4 accent-[#7C5CBF]"
                    />
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingBtn(false);
                        setEditingBtnId(null);
                      }}
                      className="flex-1 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-extrabold text-[var(--muted)]"
                    >
                      {t.common.cancel}
                    </button>
                    <button
                      type="button"
                      disabled={!newBtnName.trim()}
                      onClick={finishBtnForm}
                      className="flex-1 py-2 rounded-xl bg-[#C9EFD3] text-[#174A2B] text-xs font-extrabold disabled:opacity-40"
                    >
                      {t.common.save}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreatingBtn(true)}
                  className="w-full py-2.5 rounded-2xl bg-[var(--surface)] border border-dashed border-[var(--border)] text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>{t.settings.newCustomBtn}</span>
                </button>
              )}
            </div>
          </div>

          {/* Hide poop fields */}
          <div className="flex items-center justify-between bg-[var(--inset)] rounded-2xl px-3 py-2.5">
            <span className="flex items-center gap-2.5 text-sm font-bold text-[var(--text)]">
              <span className="w-8 h-8 rounded-full bg-[#FAE0B4] text-[#7D4E14] flex items-center justify-center">
                <PoopIcon size={15} />
              </span>
              {t.settings.hidePoop}
            </span>
            <Toggle on={settings.hidePoop} onClick={() => updateSettings({ hidePoop: !settings.hidePoop })} />
          </div>

          {/* Hide Period page */}
          <div className="flex items-center justify-between bg-[var(--inset)] rounded-2xl px-3 py-2.5">
            <span className="flex items-center gap-2.5 text-sm font-bold text-[var(--text)]">
              <span className="w-8 h-8 rounded-full bg-[#F4C6D8] text-[#6E2440] flex items-center justify-center">
                <Droplet size={15} />
              </span>
              {t.settings.hidePeriod}
            </span>
            <Toggle
              on={settings.hidePeriod}
              onClick={() => {
                const next = !settings.hidePeriod;
                updateSettings({ hidePeriod: next });
                if (next && activeTab === 'period') setActiveTab('today');
              }}
            />
          </div>

          {/* Foods database */}
          <button
            type="button"
            onClick={() => {
              close();
              setActiveTab('database');
            }}
            className="w-full flex items-center justify-between bg-[var(--inset)] hover:bg-[var(--border)] rounded-2xl px-3 py-3 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-[#C9EFD3] text-[#174A2B] flex items-center justify-center">
                <BookOpen size={15} />
              </span>
              <span className="text-left">
                <span className="block text-sm font-extrabold text-[var(--text)]">{t.settings.foodsDatabase}</span>
                <span className="block text-[11px] font-medium text-[var(--muted)]">{t.settings.foodsDesc}</span>
              </span>
            </span>
            <ChevronRight size={16} className="text-[var(--muted)]" />
          </button>
        </div>
      )}
    </Modal>
  );
};
