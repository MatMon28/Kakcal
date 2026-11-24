import { lazy, Suspense, useEffect, useState } from 'react';
import { OPEN_INSTALL_GUIDE, type GuideLanguage, type OpenDetail } from './installGuideEvents';

const InstallGuideHost = lazy(() => import('./InstallGuide'));

/**
 * Mounted by `App.tsx` instead of the real host. It costs one event listener until the guide is first
 * requested; then it loads the dialog chunk and hands the request over as `initial`, so the first tap is not lost.
 */
export function LazyInstallGuideHost({ lang }: { lang?: GuideLanguage }) {
  const [initial, setInitial] = useState<OpenDetail | null>(null);
  useEffect(() => {
    if (initial) return;
    const onOpen = (event: Event) => setInitial((event as CustomEvent<OpenDetail>).detail ?? {});
    window.addEventListener(OPEN_INSTALL_GUIDE, onOpen);
    return () => window.removeEventListener(OPEN_INSTALL_GUIDE, onOpen);
  }, [initial]);
  if (!initial) return null;
  return <Suspense fallback={null}><InstallGuideHost lang={lang} initial={initial} /></Suspense>;
}
