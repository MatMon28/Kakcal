import { useSettings } from '../context/AppContext';

/** Small bilingual additions stay separate from the legacy translation catalogue. */
export function useJournalText() {
  // Narrow subscription: only a language change re-renders the ~40 callers (not every tab change / dialog).
  const { language } = useSettings();
  return (english: string, italian: string) => (language === 'it' ? italian : english);
}
