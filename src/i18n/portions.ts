import { useSettings } from '../context/AppContext';
import type { Language } from '../types';

const portionsText = {
  en: {
    portions: 'Portions',
    weight: 'Weight (g)',
    volume: 'Volume (ml)',
    portionSingular: 'portion',
    portionPlural: 'portions',
    setHint: 'set',
    addCustom: '+ Custom',
    saveAsPortion: '+ Save {amount}{unit} as custom portion',
    saveNewPortion: '+ Save a custom portion',
    formTitle: 'Save custom portion',
    emptyHint: 'No portion set yet — save a custom portion below.',
    weightPlaceholder: '120',
    labelPlaceholder: 'Label (e.g. 1 bowl)',
    saveAndUse: 'Save & use',
    cancel: 'Cancel',
    close: 'Close',
    removePortion: 'Remove custom portion',
    defaultCustomLabel: 'Custom',
    errInvalidWeight: 'Enter a valid amount greater than 0.',
    errNot100: 'Choose a portion different from 100{unit}.',
    portionCountAria: 'Number of portions',
    decreasePortion: 'Decrease portions',
    increasePortion: 'Increase portions',
    customWeightAria: 'Custom portion amount',
    customLabelAria: 'Custom portion label',
  },
  it: {
    portions: 'Porzioni',
    weight: 'Peso (g)',
    volume: 'Volume (ml)',
    portionSingular: 'porzione',
    portionPlural: 'porzioni',
    setHint: 'imposta',
    addCustom: '+ Nuova',
    saveAsPortion: '+ Salva {amount}{unit} come porzione',
    saveNewPortion: '+ Salva porzione personalizzata',
    formTitle: 'Salva porzione personalizzata',
    emptyHint: 'Nessuna porzione salvata — creane una qui sotto.',
    weightPlaceholder: '120',
    labelPlaceholder: 'Nome (es. 1 ciotola)',
    saveAndUse: 'Salva e usa',
    cancel: 'Annulla',
    close: 'Chiudi',
    removePortion: 'Rimuovi porzione personalizzata',
    defaultCustomLabel: 'Personalizzata',
    errInvalidWeight: 'Inserisci una quantità valida maggiore di 0.',
    errNot100: 'Scegli una porzione diversa da 100{unit}.',
    portionCountAria: 'Numero di porzioni',
    decreasePortion: 'Riduci porzioni',
    increasePortion: 'Aumenta porzioni',
    customWeightAria: 'Quantità porzione personalizzata',
    customLabelAria: 'Nome porzione personalizzata',
  },
};

export type PortionsText = typeof portionsText.en;

export function getPortionsText(lang: Language): PortionsText {
  return portionsText[lang];
}

export function usePortionsText(): PortionsText {
  const { language } = useSettings();
  return portionsText[language] ?? portionsText.en;
}
