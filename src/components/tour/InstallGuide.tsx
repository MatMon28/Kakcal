import { useMemo, useState } from 'react';
import { CheckCircle2, Download, Monitor, ShieldAlert, Smartphone, TabletSmartphone } from 'lucide-react';
import { APK_URL, RELEASES_URL } from '../../config/install';
import {
  detectPlatform,
  promptInstall,
  usePwaInstallState,
  type InstallPlatform,
} from '../../utils/pwaInstall';
import { INSTALL_UI } from './installContent';
import type { TourLang } from './tourContent';

const PLATFORMS: InstallPlatform[] = ['ios', 'android', 'desktop'];
const PLATFORM_ICON = { ios: TabletSmartphone, android: Smartphone, desktop: Monitor } as const;

interface InstallGuideProps {
  lang: TourLang;
  /** URL of the journal, opened by the "Open the app" button once the app is installed. */
  appUrl: string;
}

/**
 * How to install Kakcalculator as a PWA on iOS, Android (plus the APK and its security warnings) and
 * desktop. Shown on the tour page; the tab matching the visitor's device is selected first.
 * Once the app is installed it turns into a short confirmation.
 */
export function InstallGuide({ lang, appUrl }: InstallGuideProps) {
  const ui = INSTALL_UI[lang];
  const state = usePwaInstallState();
  const detected = useMemo(detectPlatform, []);
  const [platform, setPlatform] = useState<InstallPlatform>(detected);
  const guide = ui.platforms[platform];
  const [outcome, setOutcome] = useState<'accepted' | 'dismissed' | null>(null);

  const installNow = async () => setOutcome((await promptInstall()) ? 'accepted' : 'dismissed');
  const showInstallButton = state === 'available' && platform !== 'ios';

  return (
    <section
      id="install"
      aria-labelledby="install-title"
      className="mb-12 scroll-mt-24 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-8"
    >
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">{ui.eyebrow}</p>
      <h2 id="install-title" className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{ui.title}</h2>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)]">{ui.lede}</p>

      {state === 'installed' ? (
        <div role="status" className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-[#C9EFD3] p-4 text-[#174A2B]">
          <CheckCircle2 size={22} className="shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">{ui.installedTitle}</p>
            <p className="text-xs font-medium">{ui.installedBody}</p>
          </div>
          <a href={appUrl} className="inline-flex min-h-10 items-center rounded-full bg-[#174A2B] px-4 text-xs font-extrabold text-white">
            {ui.openApp}
          </a>
        </div>
      ) : null}

      <div role="tablist" aria-label={ui.title} className="mt-6 inline-flex max-w-full flex-wrap gap-1 rounded-2xl bg-[var(--inset)] p-1">
        {PLATFORMS.map((id) => {
          const Icon = PLATFORM_ICON[id];
          const active = platform === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => { setPlatform(id); setOutcome(null); }}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-extrabold transition-colors ${
                active ? 'bg-[var(--text)] text-[var(--on-text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              {ui.platforms[id].tab}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="mt-5">
        <h3 className="text-lg font-extrabold">{guide.heading}</h3>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{guide.intro}</p>

        <ol className="mt-4 max-w-2xl space-y-3">
          {guide.steps.map((step, position) => (
            <li key={step} className="flex gap-3 text-[15px] leading-relaxed">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--text)] text-xs font-extrabold text-[var(--on-text)]" aria-hidden="true">
                {position + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        {guide.tip ? <p className="mt-4 max-w-2xl text-xs font-semibold leading-relaxed text-[var(--muted)]">{guide.tip}</p> : null}

        {showInstallButton ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={installNow}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[var(--text)] px-5 text-sm font-extrabold text-[var(--on-text)]"
            >
              <Download size={16} aria-hidden="true" />
              {ui.installNow}
            </button>
            <span className="text-xs font-semibold text-[var(--muted)]" role="status">
              {outcome === 'accepted' ? '…' : ui.installNowHint}
            </span>
          </div>
        ) : null}

        {platform === 'android' ? (
          <div className="mt-7 rounded-2xl border border-[var(--border)] bg-[var(--inset)] p-4 sm:p-5">
            <h4 className="text-base font-extrabold">{ui.apk.title}</h4>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{ui.apk.body}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href={APK_URL}
                download
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[var(--text)] px-5 text-sm font-extrabold text-[var(--on-text)]"
              >
                <Download size={16} aria-hidden="true" />
                {ui.apk.download}
              </a>
              <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="text-xs font-extrabold text-[var(--muted)] underline underline-offset-2 hover:text-[var(--text)]">
                {ui.apk.allReleases}
              </a>
            </div>

            <div className="mt-5 rounded-xl border border-[#E8B04A] bg-[#FFF3D6] p-4 text-[#5B3A00]">
              <p className="flex items-center gap-2 text-sm font-extrabold">
                <ShieldAlert size={18} className="shrink-0" aria-hidden="true" />
                {ui.apk.warningTitle}
              </p>
              <p className="mt-2 text-xs font-medium leading-relaxed">{ui.apk.warningIntro}</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs font-medium leading-relaxed">
                {ui.apk.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
              <p className="mt-3 text-xs font-bold leading-relaxed">{ui.apk.safety}</p>
            </div>
          </div>
        ) : null}
      </div>

      <p className="mt-6 text-xs font-semibold text-[var(--muted)]">{ui.afterInstall}</p>
    </section>
  );
}
