import { useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  CircleHelp,
  Droplet,
  Leaf,
  LockKeyhole,
  PersonStanding,
  Settings,
  Sparkles,
  Sprout,
  Sun,
  User,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import { useAdvanced } from '../../utils/advancedStore';
import { isPeriodShown } from '../../utils/tourPreview';
import type { ActiveTab } from '../../types';
import { Wordmark } from '../common/Brand';
import { Modal } from '../common/Modal';
import { journalDate } from './JournalUI';

export function JournalChrome() {
  const {
    activeTab,
    setActiveTab,
    settings,
    setIsSettingsOpen,
    setIsProfileOpen,
    selectedDate,
    language,
    t,
  } = useApp();
  const bodyEnabled = useAdvanced().body.enabled;
  const j = useJournalText();
  const [help, setHelp] = useState(false);
  const links = [
    { id: 'today', title: t.nav.today, icon: Sun },
    { id: 'prebuilt', title: t.nav.prebuilt, icon: Sparkles },
    ...(isPeriodShown(settings.hidePeriod) ? [{ id: 'period', title: t.nav.period, icon: Droplet }] : []),
    ...(bodyEnabled ? [{ id: 'body', title: t.nav.body, icon: PersonStanding }] : []),
    { id: 'history', title: t.nav.history, icon: ChartNoAxesCombined },
  ];
  return (
    <>
      <aside className="journal-sidebar" aria-label={j('Journal navigation', 'Navigazione diario')}>
        <button
          type="button"
          className="journal-sidebar-brand"
          aria-label="Kakcal - Today"
          onClick={() => setActiveTab('today')}
        >
          <Wordmark />
        </button>
        <p className="journal-nav-caption">{j('YOUR EVERYDAY', 'OGNI GIORNO')}</p>
        <nav>
          {links.map(({ id, title, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={`journal-nav-link ${activeTab === id ? 'is-active' : ''}`}
              aria-current={activeTab === id ? 'page' : undefined}
              onClick={() => setActiveTab(id as ActiveTab)}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{title}</span>
              {activeTab === id && <span className="journal-nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="journal-nav-divider" />
        <p className="journal-nav-caption">{j('YOUR SPACE', 'IL TUO SPAZIO')}</p>
        <nav>
          <button
            type="button"
            className={`journal-nav-link ${activeTab === 'database' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('database')}
          >
            <BookOpen size={19} strokeWidth={1.8} />
            {j('Food database', 'Database alimenti')}
          </button>
          <button type="button" className="journal-nav-link" onClick={() => setIsProfileOpen(true)}>
            <User size={19} strokeWidth={1.8} />
            {j('My profile', 'Il mio profilo')}
          </button>
          <button type="button" className="journal-nav-link" onClick={() => setIsSettingsOpen(true)}>
            <Settings size={19} strokeWidth={1.8} />
            {t.settings.title}
          </button>
        </nav>
        <div className="journal-sidebar-bottom">
          <div className="journal-sidebar-message">
            <Sprout size={39} strokeWidth={1.25} />
            <p>
              {j('Small steps.', 'Piccoli passi.')}
              <br />
              {j('Healthy habits.', 'Sane abitudini.')}
            </p>
            <span>{j('A little better, every day.', "Un po' meglio, ogni giorno.")}</span>
          </div>
          <p className="journal-local-status">
            <span />
            {j('Your journal, just yours.', 'Il tuo diario, solo tuo.')}
            <LockKeyhole size={12} />
          </p>
        </div>
      </aside>
      <div className="journal-desktop-topbar">
        <div>
          <span>{j('My journal', 'Il mio diario')}</span>
          <span className="journal-breadcrumb-divider">/</span>
          <strong>
            {activeTab === 'database'
              ? j('Food database', 'Database alimenti')
              : links.find((l) => l.id === activeTab)?.title}
          </strong>
        </div>
        <div>
          <button className="journal-topbar-date" type="button" onClick={() => setActiveTab('today')}>
            <CalendarDays size={15} />
            {journalDate(selectedDate, language, { weekday: 'short', day: 'numeric', month: 'long' })}
          </button>
          <span className="journal-topbar-divider" />
          <button
            className="journal-topbar-icon"
            type="button"
            aria-label={j('Help with your journal', 'Aiuto per il diario')}
            onClick={() => setHelp(true)}
          >
            <CircleHelp size={19} />
          </button>
          <button
            className="journal-topbar-icon"
            type="button"
            aria-label={t.settings.title}
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings size={19} />
          </button>
          <button
            className="journal-profile-button"
            type="button"
            aria-label={t.profile.title}
            onClick={() => setIsProfileOpen(true)}
          >
            <User size={18} />
          </button>
        </div>
      </div>
      {help && (
        <Modal
          isOpen
          onClose={() => setHelp(false)}
          title={j('A little guide to your space', 'Una piccola guida al tuo spazio')}
          maxWidth="max-w-lg"
        >
          <div className="journal-help-content">
            <Leaf size={28} />
            <p>
              {j(
                'Kakcal is your private, local-first food and wellness journal. There is no account, and your journal stays on this device.',
                'Kakcal e il tuo diario privato di alimentazione e benessere. Nessun account, tutti i dati restano sul dispositivo.',
              )}
            </p>
            <h3>{j('Make it your own', 'Personalizzalo')}</h3>
            <p>
              {j(
                'Save your go-to meals and recipes. Plan specific foods or leave a note for your future self. Explore your meal diary to find favorites and add a little context.',
                'Salva pasti e ricette preferiti. Pianifica alimenti o lascia una nota. Esplora il diario per ritrovare i tuoi preferiti.',
              )}
            </p>
            <p>
              {j(
                'Turn on Photo diary and Meal notes in Today in Settings > Today & pages. Change your style and appearance in Settings > Appearance.',
                'Attiva Diario fotografico e Note dei pasti in Impostazioni > Oggi e pagine. Cambia stile e aspetto in Impostazioni > Aspetto.',
              )}
            </p>
            <p>
              {j(
                'Remember to export a JSON backup from Settings. Clearing browser data can remove your journal.',
                'Ricorda di esportare un backup JSON dalle Impostazioni. Cancellare i dati del browser puo rimuovere il diario.',
              )}
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
