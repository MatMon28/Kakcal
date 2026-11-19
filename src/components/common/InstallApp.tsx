import React, { useState } from 'react';
import { CheckCircle, Smartphone } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { promptInstall, usePwaInstallState } from '../../utils/pwaInstall';

/**
 * "Install app" card for Settings (PWA). Renders nothing in the Android app and in browsers that
 * cannot install the app (for example before the page is served over HTTPS).
 */
export const InstallApp: React.FC = () => {
  const { t } = useApp();
  const state = usePwaInstallState();
  const [message, setMessage] = useState<string | null>(null);

  if (state === 'hidden') return null;

  const handleInstall = async () => {
    const accepted = await promptInstall();
    setMessage(accepted ? t.pwa.accepted : t.pwa.dismissed);
  };

  const description =
    state === 'installed' ? t.pwa.installed : state === 'ios' ? t.pwa.iosDesc : t.pwa.installDesc;

  return (
    <section aria-label={t.pwa.title} className="bg-[var(--inset)] rounded-2xl p-3 space-y-2.5">
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">{t.pwa.title}</h3>
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-full bg-[#C9EFD3] text-[#174A2B] flex items-center justify-center shrink-0">
          {state === 'installed' ? <CheckCircle size={15} /> : <Smartphone size={15} />}
        </span>
        <p className="flex-1 text-[11px] font-medium text-[var(--muted)]" role="status">
          {message ?? description}
        </p>
        {state === 'available' && (
          <button
            type="button"
            onClick={handleInstall}
            className="pressable py-2.5 px-4 rounded-xl bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold text-xs shrink-0"
          >
            {t.pwa.installBtn}
          </button>
        )}
      </div>
    </section>
  );
};
