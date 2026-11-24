import React, { useState } from 'react';
import { Camera, CalendarDays, ChefHat, Droplet, Footprints, NotebookPen, Ruler, Scale, Sparkles, Trash2, UtensilsCrossed, Utensils } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useJournalText } from '../../../i18n/journal';
import { deleteCategory, type DeleteCategory } from '../../../utils/deleteData';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { DeleteAllData } from '../../common/DeleteAllData';
import { PoopIcon } from '../../common/PoopIcon';
import { ActionRow, SubSection, TONE } from './SettingsParts';

interface DeleteRow {
  id: DeleteCategory;
  icon: React.ReactNode;
  tone: string;
  title: string;
  description: string;
  confirm: string;
}

/**
 * Settings > Delete data. Each row erases ONE kind of record for every day / every item and asks first. Settings
 * (custom buttons, quick foods, reminders, theme, goals) are never touched. After a deletion the page reloads, so
 * every screen shows the stored data again. "Delete all data" stays at the bottom.
 */
export const DeleteDataSettings: React.FC = () => {
  const j = useJournalText();
  const { allDayLogs } = useApp();
  const [pending, setPending] = useState<DeleteRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const groups: { title: string; hint: string; rows: DeleteRow[] }[] = [
    {
      title: j('Meals and planning', 'Pasti e pianificazione'),
      hint: j('Saved meals, recipes and plans.', 'Pasti salvati, ricette e piani.'),
      rows: [
        {
          id: 'plans', icon: <CalendarDays size={14} />, tone: TONE.sky,
          title: j('All meal plans', 'Tutti i piani pasto'),
          description: j('Plans, plan names and shopping lists.', 'Piani, nomi dei piani e liste della spesa.'),
          confirm: j('Delete every meal plan and shopping list? This cannot be undone.', 'Eliminare tutti i piani pasto e le liste della spesa? Non si può annullare.'),
        },
        {
          id: 'savedMeals', icon: <UtensilsCrossed size={14} />, tone: TONE.peach,
          title: j('All saved meals', 'Tutti i pasti salvati'),
          description: j('Meals you saved in Custom. Logged food is kept.', 'I pasti salvati in Custom. Gli alimenti registrati restano.'),
          confirm: j('Delete every saved meal? Food already logged in your days is kept. This cannot be undone.', 'Eliminare tutti i pasti salvati? Gli alimenti già registrati restano. Non si può annullare.'),
        },
        {
          id: 'recipes', icon: <ChefHat size={14} />, tone: TONE.lilac,
          title: j('All recipes', 'Tutte le ricette'),
          description: j('Recipes you built. Ordinary own foods stay.', 'Le ricette create. Gli alimenti personali restano.'),
          confirm: j('Delete every recipe? This cannot be undone.', 'Eliminare tutte le ricette? Non si può annullare.'),
        },
      ],
    },
    {
      title: j('Photos and notes', 'Foto e note'),
      hint: j('Pictures and notes written in the diary.', 'Foto e note scritte nel diario.'),
      rows: [
        {
          id: 'photos', icon: <Camera size={14} />, tone: TONE.rose,
          title: j('All photos', 'Tutte le foto'),
          description: j('Photo diary pictures and their notes.', 'Foto del diario e le loro note.'),
          confirm: j('Delete every photo and its note? This cannot be undone.', 'Eliminare tutte le foto e le relative note? Non si può annullare.'),
        },
        {
          id: 'mealNotes', icon: <NotebookPen size={14} />, tone: TONE.lilac,
          title: j('All meal notes', 'Tutte le note dei pasti'),
          description: j('Notes written under each meal.', 'Le note scritte sotto ogni pasto.'),
          confirm: j('Delete every meal note? This cannot be undone.', 'Eliminare tutte le note dei pasti? Non si può annullare.'),
        },
      ],
    },
    {
      title: j('Daily records', 'Registrazioni giornaliere'),
      hint: j('What you logged on each day, for every day.', 'Ciò che hai registrato ogni giorno, per tutti i giorni.'),
      rows: [
        {
          id: 'foodLog', icon: <Utensils size={14} />, tone: TONE.butter,
          title: j('All logged food', 'Tutti gli alimenti registrati'),
          description: j('Every meal entry of every day.', 'Ogni voce dei pasti di ogni giorno.'),
          confirm: j('Delete all food logged on every day? This cannot be undone.', 'Eliminare tutti gli alimenti registrati in ogni giorno? Non si può annullare.'),
        },
        {
          id: 'activities', icon: <Footprints size={14} />, tone: TONE.teal,
          title: j('All activities', 'Tutte le attività'),
          description: j('Walks, runs and other activities.', 'Camminate, corse e altre attività.'),
          confirm: j('Delete every logged activity? This cannot be undone.', 'Eliminare tutte le attività registrate? Non si può annullare.'),
        },
        {
          id: 'water', icon: <Droplet size={14} />, tone: TONE.sky,
          title: j('All water', 'Tutta l’acqua'),
          description: j('Every water entry.', 'Ogni registrazione dell’acqua.'),
          confirm: j('Delete every water entry? This cannot be undone.', 'Eliminare tutte le registrazioni dell’acqua? Non si può annullare.'),
        },
        {
          id: 'weight', icon: <Scale size={14} />, tone: TONE.mint,
          title: j('All weight', 'Tutto il peso'),
          description: j('Every weight entry.', 'Ogni registrazione del peso.'),
          confirm: j('Delete every weight entry? This cannot be undone.', 'Eliminare tutte le registrazioni del peso? Non si può annullare.'),
        },
        {
          id: 'poop', icon: <PoopIcon size={14} />, tone: TONE.peach,
          title: j('All poop records', 'Tutti i registri del poop'),
          description: j('Every poop entry.', 'Ogni registrazione del poop.'),
          confirm: j('Delete every poop entry? This cannot be undone.', 'Eliminare tutte le registrazioni del poop? Non si può annullare.'),
        },
        {
          id: 'customTrackers', icon: <Sparkles size={14} />, tone: TONE.butter,
          title: j('All custom tracker entries', 'Tutte le registrazioni personalizzate'),
          description: j('Values of your custom buttons. The buttons stay.', 'I valori dei tuoi pulsanti personalizzati. I pulsanti restano.'),
          confirm: j('Delete every custom tracker entry? The buttons themselves stay. This cannot be undone.', 'Eliminare tutte le registrazioni personalizzate? I pulsanti restano. Non si può annullare.'),
        },
      ],
    },
    {
      title: j('Body and period', 'Corpo e ciclo'),
      hint: j('Measurements and period records.', 'Misurazioni e registri del ciclo.'),
      rows: [
        {
          id: 'body', icon: <Ruler size={14} />, tone: TONE.slate,
          title: j('All body measurements', 'Tutte le misure del corpo'),
          description: j('Every recorded body measurement.', 'Ogni misura del corpo registrata.'),
          confirm: j('Delete every body measurement? This cannot be undone.', 'Eliminare tutte le misure del corpo? Non si può annullare.'),
        },
        {
          id: 'period', icon: <Droplet size={14} />, tone: TONE.rose,
          title: j('All period records', 'Tutti i registri del ciclo'),
          description: j('Daily period, mood and symptom entries. Cycle settings stay.', 'Registri giornalieri di ciclo, umore e sintomi. Le impostazioni restano.'),
          confirm: j('Delete every period record? Your cycle settings stay. This cannot be undone.', 'Eliminare tutti i registri del ciclo? Le impostazioni restano. Non si può annullare.'),
        },
      ],
    },
  ];

  const confirmDelete = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setError(false);
    try {
      await deleteCategory(pending.id, allDayLogs);
      // Reload: every screen then reads the stored data again.
      window.location.reload();
    } catch {
      setError(true);
      setBusy(false);
      setPending(null);
    }
  };

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <SubSection key={group.title} title={group.title} hint={group.hint}>
          {group.rows.map((row) => (
            <ActionRow
              key={row.id}
              icon={row.icon}
              tone={row.tone}
              title={row.title}
              description={row.description}
              disabled={busy}
              onClick={() => setPending(row)}
              trailing={<Trash2 size={14} className="shrink-0 text-[#C94444]" aria-hidden="true" />}
            />
          ))}
        </SubSection>
      ))}

      {error && (
        <p role="alert" className="text-[11px] font-bold text-[#C94444] px-1">
          {j('The data could not be deleted. Nothing was changed.', 'Non è stato possibile eliminare i dati. Non è cambiato nulla.')}
        </p>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.title}
        message={pending?.confirm ?? ''}
        confirmLabel={j('Delete', 'Elimina')}
        onCancel={() => setPending(null)}
        onConfirm={() => void confirmDelete()}
      />

      {/* Everything at once (two confirmations, see DeleteAllData) */}
      <DeleteAllData />
    </div>
  );
};
