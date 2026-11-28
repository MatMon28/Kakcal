import React, { memo, useState } from 'react';
import { Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useSettings } from '../../../context/AppContext';
import { Modal } from '../../common/Modal';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { IconPicker } from '../../common/IconPicker';
import { TrackerIcon } from '../../common/TrackerIcon';
import { SwitchVisual } from './SettingsParts';

/**
 * Settings > Today > Custom buttons: the user's own quick-add trackers (list, add / edit form, delete) and the
 * switch that puts one of them in the home-screen widgets. Moved here from the old Custom buttons group.
 */
export const CustomButtonsSettings: React.FC = memo(() => {
  const { t, settings, updateSettings } = useSettings();
  const [creatingBtn, setCreatingBtn] = useState(false);
  const [newBtnName, setNewBtnName] = useState('');
  const [newBtnType, setNewBtnType] = useState<'quantity' | 'toggle'>('quantity');
  const [newBtnUnit, setNewBtnUnit] = useState('');
  const [newBtnIcon, setNewBtnIcon] = useState('sparkles');
  const [newBtnStats, setNewBtnStats] = useState(true);
  const [editingBtnId, setEditingBtnId] = useState<string | null>(null);
  const [deletingBtnId, setDeletingBtnId] = useState<string | null>(null);
  const widgetShortcutEnabled = settings.customButtons.length > 0 && settings.widgetCustomButton;

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
    <div className="space-y-3">
      <p className="text-[11px] font-medium text-[var(--muted)]">{t.settings.customButtonsHint}</p>

      <div className="space-y-1.5">
        {settings.customButtons.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-2 bg-[var(--inset)] rounded-2xl px-3 py-2.5">
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
                onClick={() => setDeletingBtnId(b.id)}
                className="pressable w-8 h-8 rounded-full text-[var(--muted)] hover:text-activity-ink hover:bg-activity flex items-center justify-center"
                title={t.settings.deleteCustomBtn}
                aria-label={t.settings.deleteCustomBtn}
              >
                <Trash2 size={13} />
              </button>
            </span>
          </div>
        ))}

        {creatingBtn && (
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

              <IconPicker value={newBtnIcon} onChange={setNewBtnIcon} />

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
                role="switch"
                aria-checked={newBtnStats}
                onClick={() => setNewBtnStats((v) => !v)}
                className="pressable w-full flex items-center justify-between gap-2 bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3 py-2 text-left"
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
                  className="kc-primary-btn pressable flex-1 py-2.5 rounded-xl bg-intake hover:bg-intake-hover text-intake-ink text-xs font-extrabold disabled:opacity-40"
                >
                  {t.common.save}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {deletingBtnId !== null && (
          <ConfirmDialog
            open={deletingBtnId !== null}
            title={t.settings.deleteCustomBtn}
            message={settings.customButtons.find((x) => x.id === deletingBtnId)?.name ?? ''}
            confirmLabel={t.common.delete}
            onCancel={() => setDeletingBtnId(null)}
            onConfirm={() => {
              if (deletingBtnId) {
                updateSettings({ customButtons: settings.customButtons.filter((x) => x.id !== deletingBtnId) });
              }
              setDeletingBtnId(null);
            }}
          />
        )}

        <button
          type="button"
          onClick={() => setCreatingBtn(true)}
          className="pressable w-full py-2.5 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-dashed border-[var(--border)] text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center gap-1.5"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>{t.settings.newCustomBtn}</span>
        </button>
      </div>

      {/* Widget shortcut: below the list and the add button */}
      <button
        type="button"
        role="switch"
        aria-checked={widgetShortcutEnabled}
        aria-label={t.settings.widgetCustomButton}
        disabled={settings.customButtons.length === 0}
        onClick={() => updateSettings({ widgetCustomButton: !settings.widgetCustomButton })}
        className="pressable w-full flex items-center justify-between gap-3 border border-[var(--border)] bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3 py-2.5 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span data-settings-badge className="kc-custom-icon-badge size-8 rounded-full bg-nutrient text-nutrient-ink flex items-center justify-center shrink-0">
            <Sparkles size={15} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-extrabold text-[var(--text)]">{t.settings.widgetCustomButton}</span>
          </span>
        </span>
        <SwitchVisual on={widgetShortcutEnabled} />
      </button>
    </div>
  );
});
