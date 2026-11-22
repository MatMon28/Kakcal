import React, { useState } from 'react';
import { CheckCircle, Download, Smartphone } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { promptInstall, usePwaInstallState } from '../../utils/pwaInstall';
import { isAndroidApp } from '../../utils/android';
import { openInstallGuide } from './InstallGuide';
import { Collapsible } from './Collapsible';

/**
 * "Install app" card for Settings. Always available in a browser (iOS and desktop included),
 * because manual installation never fires `beforeinstallprompt`. Opens the full guide with
 * iPhone/iPad, Android (PWA and APK) and desktop steps. Hidden inside the native APK.
 */
export const InstallApp: React.FC = () => {
  const { t, language } = useApp();
  const state = usePwaInstallState();
  const [message, setMessage] = useState<string | null>(null);

  if (isAndroidApp()) return null;

  const ui = language === 'it'
    ? {
        howTo: 'Come installare',
        installedBtn: 'Altri dispositivi',
        manual: 'Guida per iPhone, Android e PC, con APK per Android.',
        accepted: t.pwa.accepted,
      }
    : {
        howTo: 'How to install',
        installedBtn: 'Other devices',
        manual: 'Guide for iPhone, Android and PC, plus the Android APK.',
        accepted: t.pwa.accepted,
      };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    setMessage(accepted ? ui.accepted : t.pwa.dismissed);
  };

  const description =
    state === 'installed' ? t.pwa.installed : state === 'ios' ? t.pwa.iosDesc : ui.manual;

  return (
    <Collapsible title={t.pwa.title}>
      <div className="flex items-start gap-2.5">
        <span className="w-8 h-8 rounded-full bg-[#C9EFD3] text-[#174A2B] flex items-center justify-center shrink-0">
          {state === 'installed' ? <CheckCircle size={15} /> : <Smartphone size={15} />}
        </span>
        <p className="flex-1 text-[11px] font-medium leading-relaxed text-[var(--muted)]" role="status">
          {message ?? description}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => openInstallGuide(undefined, language)}
          className={`pressable flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 ${
            state === 'available'
              ? 'bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)]'
              : 'bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B]'
          }`}
        >
          <Download size={15} />
          <span>{state === 'installed' ? ui.installedBtn : ui.howTo}</span>
          {state !== 'available' && <span className="font-bold opacity-70">· iPhone · Android · PC</span>}
        </button>
        {state === 'available' && (
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="pressable flex-1 py-2.5 px-3 rounded-xl bg-[#1E5E3A] hover:bg-[#174A2B] text-[#EAF7EE] font-extrabold text-xs flex items-center justify-center gap-1.5"
          >
            <Smartphone size={15} />
            <span>{t.pwa.installBtn}</span>
          </button>
        )}
      </div>
    </Collapsible>
  );
};
