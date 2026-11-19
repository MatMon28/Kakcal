import type { ReactNode } from 'react';
import { BellRing, ClipboardCheck, Droplets, Scale, Sparkles, UtensilsCrossed } from 'lucide-react';
import { translations } from '../../i18n/translations';
import type { TourScreen } from '../widgets/widgetContract';
import type { TourLang, TourUi } from './tourContent';

interface Props {
  ui: TourUi;
  lang: TourLang;
  onOpen: (screen: TourScreen) => void;
}

/**
 * Notification previews for the guided tour. The titles and texts are the app's real notification strings
 * (src/i18n/translations.ts), so the presentation cannot drift from what the phone shows.
 */
export function NotificationShowcase({ ui, lang, onOpen }: Props) {
  const copy = translations[lang].notifications.messages;
  const meals = translations[lang].mealSlots;
  const text = ui.notifications;

  const cards: { id: string; screen: TourScreen; when: string; title: string; body: string; tone: string; icon: ReactNode }[] = [
    {
      id: 'water', screen: 'water', when: text.water, title: copy.waterTitle, body: copy.water[0],
      tone: 'bg-[#CFE7FE] text-[#183F66]', icon: <Droplets size={16} aria-hidden="true" />,
    },
    {
      id: 'meal', screen: 'food', when: text.meal, title: copy.mealTitle.replace('{meal}', meals.lunch),
      body: copy.mealBody.replace('{meal}', meals.lunch.toLowerCase()),
      tone: 'bg-[#C9EFD3] text-[#174A2B]', icon: <UtensilsCrossed size={16} aria-hidden="true" />,
    },
    {
      id: 'custom', screen: 'tracker', when: text.custom, title: copy.customTitle,
      body: copy.customBody.replace('{names}', text.sampleCustom),
      tone: 'bg-[#E4D9F8] text-[#41296E]', icon: <Sparkles size={16} aria-hidden="true" />,
    },
    {
      id: 'weight', screen: 'weight', when: text.weight, title: copy.weightTitle, body: copy.weightBody,
      tone: 'bg-[#D8E8F8] text-[#1E3F66]', icon: <Scale size={16} aria-hidden="true" />,
    },
    {
      id: 'log', screen: 'today', when: text.log, title: copy.logTitle, body: copy.logBody,
      tone: 'bg-[#FAE0B4] text-[#7D4E14]', icon: <ClipboardCheck size={16} aria-hidden="true" />,
    },
  ];

  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-extrabold">
        <BellRing size={16} aria-hidden="true" />
        {text.heading}
      </h3>
      <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{text.hint}</p>
      <ul data-testid="notification-showcase" className="mt-4 grid gap-2.5 rounded-[28px] bg-[var(--inset)] p-3 sm:grid-cols-2">
        {cards.map((card) => (
          <li key={card.id} className={card.id === 'log' ? 'sm:col-span-2' : undefined}>
            <button
              type="button"
              onClick={() => onOpen(card.screen)}
              className="pressable flex w-full items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left shadow-sm hover:bg-[var(--hover)]"
            >
              <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${card.tone}`}>{card.icon}</span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--muted)]">
                  <span>{text.appName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{card.when}</span>
                </span>
                <span className="mt-0.5 block text-[13px] font-extrabold leading-snug">{card.title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-[var(--muted)]">{card.body}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
