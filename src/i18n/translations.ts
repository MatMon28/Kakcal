import { en } from './translations.en';
import { it } from './translations.it';

/** English / Italian string catalogue. The strings live in `translations.en.ts` and `translations.it.ts`. */
export const translations = { en, it };

export type TranslationKey = typeof translations.en;
