import * as shell from './parts/shell';
import * as settings from './parts/settings';
import * as today from './parts/today';
import * as modals from './parts/modals';
import * as period from './parts/period';
import * as library from './parts/library';

/** English / Italian string catalogue, composed from domain parts in `src/i18n/parts/`. */
export const translations = {
  en: { ...shell.en, ...settings.en, ...today.en, ...modals.en, ...period.en, ...library.en },
  it: { ...shell.it, ...settings.it, ...today.it, ...modals.it, ...period.it, ...library.it },
};

export type TranslationKey = typeof translations.en;
