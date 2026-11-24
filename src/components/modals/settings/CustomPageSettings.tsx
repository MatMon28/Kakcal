import React from 'react';
import { BookOpen, Camera, CalendarDays, ChefHat, NotebookText, ShoppingCart, UtensilsCrossed } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useJournalText } from '../../../i18n/journal';
import type { CustomFieldId } from '../../../types';
import { SubSection, TONE, ToggleRow } from './SettingsParts';

/**
 * Settings > Custom page. Three sub-sections: the Photo diary feature, the bottom-bar buttons of Custom (every
 * button can be hidden) and the sections of the page (every field can be hidden). "On" always means "shown".
 */
export const CustomPageSettings: React.FC = () => {
  const j = useJournalText();
  const { settings, updateSettings } = useApp();

  const setField = (key: CustomFieldId, shown: boolean) =>
    updateSettings({ hideCustomFields: { ...settings.hideCustomFields, [key]: !shown } });
  const setButton = (key: 'meal' | 'recipe' | 'food', shown: boolean) =>
    updateSettings({ hideCustomButtons: { ...settings.hideCustomButtons, [key]: !shown } });
  const photoOff = !settings.photoDiary;

  const fields: { key: CustomFieldId; icon: React.ReactNode; tone: string; title: string; disabled?: boolean }[] = [
    { key: 'diary', icon: <NotebookText size={14} />, tone: TONE.lilac, title: j('Meal diary', 'Diario dei pasti') },
    { key: 'meals', icon: <UtensilsCrossed size={14} />, tone: TONE.peach, title: j('Meals', 'Pasti') },
    { key: 'recipes', icon: <ChefHat size={14} />, tone: TONE.lilac, title: j('Recipes', 'Ricette') },
    { key: 'planner', icon: <CalendarDays size={14} />, tone: TONE.sky, title: j('Meal planner', 'Pianificatore pasti') },
    { key: 'shopping', icon: <ShoppingCart size={14} />, tone: TONE.mint, title: j('Shopping lists', 'Liste della spesa') },
    { key: 'photos', icon: <Camera size={14} />, tone: TONE.rose, title: j('Photo diary', 'Diario fotografico'), disabled: photoOff },
    { key: 'foods', icon: <BookOpen size={14} />, tone: TONE.mint, title: j('Foods', 'Alimenti') },
  ];

  return (
    <div className="space-y-5">
      <SubSection title={j('Features', 'Funzioni')}>
        <ToggleRow
          icon={<Camera size={14} />}
          tone={TONE.rose}
          title={j('Photo diary', 'Diario fotografico')}
          description={j('Keep a visual memory of your meals. Photos stay on this device.', 'Ricorda i tuoi pasti con una foto. Le foto restano sul dispositivo.')}
          on={settings.photoDiary}
          onToggle={() => updateSettings({ photoDiary: !settings.photoDiary })}
        />
      </SubSection>

      <SubSection
        title={j('Quick buttons', 'Pulsanti rapidi')}
        hint={j('The bottom bar of Custom. Hide the ones you do not use.', 'La barra in basso di Custom. Nascondi quelli che non usi.')}
      >
        <ToggleRow
          icon={<UtensilsCrossed size={14} />}
          tone={TONE.peach}
          title={j('New meal', 'Nuovo pasto')}
          on={!settings.hideCustomButtons.meal}
          onToggle={() => setButton('meal', Boolean(settings.hideCustomButtons.meal))}
        />
        <ToggleRow
          icon={<ChefHat size={14} />}
          tone={TONE.lilac}
          title={j('New recipe', 'Nuova ricetta')}
          on={!settings.hideCustomButtons.recipe}
          onToggle={() => setButton('recipe', Boolean(settings.hideCustomButtons.recipe))}
        />
        <ToggleRow
          icon={<BookOpen size={14} />}
          tone={TONE.mint}
          title={j('New food', 'Nuovo alimento')}
          on={!settings.hideCustomButtons.food}
          onToggle={() => setButton('food', Boolean(settings.hideCustomButtons.food))}
        />
        <ToggleRow
          icon={<CalendarDays size={14} />}
          tone={TONE.sky}
          title={j('Plan meals', 'Pianifica i pasti')}
          on={settings.showPlannerButton}
          onToggle={() => updateSettings({ showPlannerButton: !settings.showPlannerButton })}
        />
        <ToggleRow
          icon={<Camera size={14} />}
          tone={TONE.rose}
          title={j('Photo diary button', 'Pulsante diario fotografico')}
          description={photoOff ? j('Needs the Photo diary feature above.', 'Richiede la funzione Diario fotografico qui sopra.') : undefined}
          on={settings.showPhotoButton && !photoOff}
          disabled={photoOff}
          onToggle={() => updateSettings({ showPhotoButton: !settings.showPhotoButton })}
        />
      </SubSection>

      <SubSection
        title={j('Sections', 'Sezioni')}
        hint={j('The parts of the Custom page. Hide the ones you do not need; your data is kept.', 'Le parti della pagina Custom. Nascondi quelle che non ti servono; i dati restano.')}
      >
        {fields.map((f) => (
          <ToggleRow
            key={f.key}
            icon={f.icon}
            tone={f.tone}
            title={f.title}
            disabled={f.disabled}
            on={!settings.hideCustomFields[f.key] && !f.disabled}
            onToggle={() => setField(f.key, Boolean(settings.hideCustomFields[f.key]))}
          />
        ))}
      </SubSection>
    </div>
  );
};
