import { useApp } from '../context/AppContext';
import type { Language } from '../types';

/**
 * English / Italian strings for the advanced layout (pencil toolbar, field controls, Settings > Advanced).
 * Kept apart from `translations.ts` like `advanced.ts`. Use `useLayoutText()`.
 */
const layoutText = {
  en: {
    settings: {
      title: 'Advanced layout',
      desc: 'A pencil on Today, Statistics and Body lets you move (hold a field), resize, remove and add fields',
      restore: 'Restore original layout',
      restoreTitle: 'Restore the original layout?',
      restoreText: 'Order, sizes and removed fields of Today, Statistics and Body go back to the original. Your data and the meal types you added are kept.',
      restoreConfirm: 'Restore',
      restored: 'Original layout restored',
    },
    toolbar: {
      edit: 'Personalise this page',
      done: 'Done',
      add: 'Add',
      reset: 'Reset page',
      editing: 'Personalising',
      hint: 'Touch a field to select it, then pull its sides or corners to resize it. Hold a field to move it anywhere, blank space included.',
      removedTitle: 'Removed fields',
      nothingRemoved: 'No removed fields. Remove a field with ✕ and it shows up here.',
      newMealTitle: 'New meal type',
      newMealPlaceholder: 'e.g. Pre-workout',
      newMealHint: 'It also appears in every meal selection (Add food, Custom meals, Foods).',
      addMeal: 'Add meal type',
      newMeasureTitle: 'New body measure',
      newMeasurePlaceholder: 'e.g. Wrist',
      unit: 'Unit',
      addMeasure: 'Add measure',
      deleteMeal: 'Delete meal type',
      deleteMealTitle: 'Delete this meal type?',
      deleteMealText: 'Delete “{name}”? Food already logged in it stays in your journal and in the totals.',
      resetTitle: 'Reset this page?',
      resetText: 'Order, sizes and removed fields of this page go back to the original.',
      resetConfirm: 'Reset',
    },
    item: {
      resizeWidth: 'Width: pull the left or right side (arrow keys)',
      resizeHeight: 'Height: pull the top or bottom side (arrow keys)',
      resizeBoth: 'Pull to resize',
      resetSize: 'Back to the original size',
      remove: 'Remove field',
    },
    names: {
      intake: 'Intake',
      burned: 'Burned',
      carbs: 'Carbs',
      protein: 'Protein',
      fat: 'Fat',
      layoutSwitch: 'Compact / Normal / Expanded',
      activity: 'Activity',
      water: 'Water',
      poop: 'Poop',
      custom: 'Custom buttons',
      range: 'Period',
      poopStats: 'Poop',
      weight: 'Weight trend',
      daily: 'Daily breakdown',
      avgIntake: 'Average intake',
      avgBurned: 'Average burned',
    },
  },
  it: {
    settings: {
      title: 'Layout avanzato',
      desc: 'Una matita in Oggi, Statistiche e Corpo permette di spostare (tieni premuto un campo), ridimensionare, rimuovere e aggiungere campi',
      restore: 'Ripristina layout originale',
      restoreTitle: 'Ripristinare il layout originale?',
      restoreText: 'Ordine, dimensioni e campi rimossi di Oggi, Statistiche e Corpo tornano all’originale. I tuoi dati e i tipi di pasto aggiunti restano.',
      restoreConfirm: 'Ripristina',
      restored: 'Layout originale ripristinato',
    },
    toolbar: {
      edit: 'Personalizza questa pagina',
      done: 'Fatto',
      add: 'Aggiungi',
      reset: 'Ripristina pagina',
      editing: 'Personalizzazione',
      hint: 'Tocca un campo per selezionarlo, poi tira i lati o gli angoli per ridimensionarlo. Tieni premuto un campo per spostarlo ovunque, anche lasciando spazi vuoti.',
      removedTitle: 'Campi rimossi',
      nothingRemoved: 'Nessun campo rimosso. Rimuovi un campo con ✕ e comparirà qui.',
      newMealTitle: 'Nuovo tipo di pasto',
      newMealPlaceholder: 'es. Pre-allenamento',
      newMealHint: 'Compare anche in ogni selezione dei pasti (Aggiungi cibo, Pasti personalizzati, Alimenti).',
      addMeal: 'Aggiungi tipo di pasto',
      newMeasureTitle: 'Nuova misura corporea',
      newMeasurePlaceholder: 'es. Polso',
      unit: 'Unità',
      addMeasure: 'Aggiungi misura',
      deleteMeal: 'Elimina tipo di pasto',
      deleteMealTitle: 'Eliminare questo tipo di pasto?',
      deleteMealText: 'Eliminare “{name}”? Il cibo già registrato resta nel diario e nei totali.',
      resetTitle: 'Ripristinare questa pagina?',
      resetText: 'Ordine, dimensioni e campi rimossi di questa pagina tornano all’originale.',
      resetConfirm: 'Ripristina',
    },
    item: {
      resizeWidth: 'Larghezza: tira il lato sinistro o destro (tasti freccia)',
      resizeHeight: 'Altezza: tira il lato superiore o inferiore (tasti freccia)',
      resizeBoth: 'Tira per ridimensionare',
      resetSize: 'Torna alla dimensione originale',
      remove: 'Rimuovi campo',
    },
    names: {
      intake: 'Assunte',
      burned: 'Bruciate',
      carbs: 'Carboidrati',
      protein: 'Proteine',
      fat: 'Grassi',
      layoutSwitch: 'Compatto / Normale / Esteso',
      activity: 'Attività',
      water: 'Acqua',
      poop: 'Cacca',
      custom: 'Pulsanti personalizzati',
      range: 'Periodo',
      poopStats: 'Cacca',
      weight: 'Andamento del peso',
      daily: 'Dettaglio giornaliero',
      avgIntake: 'Media assunte',
      avgBurned: 'Media bruciate',
    },
  },
} as const;

export type LayoutText = typeof layoutText.en;

export const getLayoutText = (language: Language): LayoutText => (layoutText[language] ?? layoutText.en) as LayoutText;

export function useLayoutText(): LayoutText {
  return getLayoutText(useApp().language);
}
