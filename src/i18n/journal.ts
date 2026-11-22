import { useApp } from '../context/AppContext';

/** Small bilingual additions stay separate from the legacy translation catalogue. */
export function useJournalText() {
  const { language } = useApp();
  return (english: string, italian: string) => (language === 'it' ? italian : english);
}
