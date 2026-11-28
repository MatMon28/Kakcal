import React, { useEffect, useState } from 'react';
import { Check, LayoutDashboard, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useAdvancedText } from '../../i18n/advanced';
import { useLayoutText } from '../../i18n/layout';
import { resetLayout, setLayoutEnabled, useLayout } from '../../utils/layoutStore';
import { Collapsible } from '../common/Collapsible';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { SwitchVisual } from '../common/Switch';
import { TONE } from './settings/SettingsParts';

/**
 * Settings > Advanced: Advanced layout and Restore original layout.
 */
export const AdvancedSettings: React.FC = () => {
  const text = useAdvancedText();
  const layoutText = useLayoutText().settings;
  const layout = useLayout();
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (!restored) return undefined;
    const timer = window.setTimeout(() => setRestored(false), 2500);
    return () => window.clearTimeout(timer);
  }, [restored]);

  return (
    <Collapsible title={text.settings.title} icon={<SlidersHorizontal size={15} />} tone={TONE.sand}>
      {/* ---------- Advanced layout ---------- */}
      <div className="space-y-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={layout.enabled}
          onClick={() => setLayoutEnabled(!layout.enabled)}
          className="pressable w-full flex items-center justify-between gap-3 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3 py-3 transition-colors text-left"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span data-settings-badge className="size-8 rounded-full bg-weight text-weight-ink flex items-center justify-center shrink-0">
              <LayoutDashboard size={15} />
            </span>
            <span className="block text-xs font-extrabold text-[var(--text)]">{layoutText.title}</span>
          </span>
          <SwitchVisual on={layout.enabled} />
        </button>

        <button
          type="button"
          onClick={() => setConfirmRestore(true)}
          data-restore-layout
          className="pressable w-full py-2.5 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-dashed border-[var(--border)] text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center gap-1.5"
        >
          {restored ? <Check size={14} /> : <RotateCcw size={14} />}
          <span>{restored ? layoutText.restored : layoutText.restore}</span>
        </button>
        <ConfirmDialog
          open={confirmRestore}
          title={layoutText.restoreTitle}
          message={layoutText.restoreText}
          confirmLabel={layoutText.restoreConfirm}
          onCancel={() => setConfirmRestore(false)}
          onConfirm={() => { resetLayout(); setConfirmRestore(false); setRestored(true); }}
        />
      </div>
    </Collapsible>
  );
};
