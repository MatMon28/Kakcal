import { lazy, type ComponentProps, type ComponentType } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface PreloadableComponent<T extends ComponentType<any>> {
  Component: T;
  preload: () => Promise<void>;
  isLoaded: () => boolean;
}

/**
 * Like `React.lazy`, but stores the resolved default export synchronously once preloaded so subsequent mounts
 * render directly without throwing a Promise or triggering a `<Suspense>` fallback frame.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function preloadableLazy<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
): PreloadableComponent<T> {
  let loaded: T | null = null;
  let promise: Promise<{ default: T }> | null = null;

  const loadOnce = () => {
    if (!promise) {
      promise = loader().then((mod) => {
        loaded = mod.default;
        return mod;
      });
    }
    return promise;
  };

  const LazyFallback = lazy(loadOnce);

  const Component = ((props: ComponentProps<T>) => {
    if (loaded) {
      const Loaded = loaded as ComponentType<ComponentProps<T>>;
      return <Loaded {...props} />;
    }
    const Lazy = LazyFallback as ComponentType<ComponentProps<T>>;
    return <Lazy {...props} />;
  }) as T;

  return {
    Component,
    preload: () => loadOnce().then(() => undefined),
    isLoaded: () => loaded !== null,
  };
}
