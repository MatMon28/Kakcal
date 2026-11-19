import type { TourScreen, WidgetAction } from '../widgets/widgetContract';

export type TourLang = 'en' | 'it';

export interface TourStep {
  id: string;
  /** What the embedded journal shows for this step. */
  screen: TourScreen;
  /** Widgets get the gallery beside the live app; every other step shows the app alone. */
  kind?: 'phone' | 'widgets' | 'notifications';
  /** Page colours, taken from the app's own tab and card colours. */
  accent: string;
  ink: string;
  short: Record<TourLang, string>;
  title: Record<TourLang, string>;
  body: Record<TourLang, string>;
  points: Record<TourLang, string[]>;
}

export interface TourUi {
  eyebrow: string;
  pageTitle: string;
  pageLede: string;
  pageCount: (n: number, total: number) => string;
  back: string;
  next: string;
  pages: string;
  openApp: string;
  androidProject: string;
  language: string;
  liveApp: string;
  liveAppTitle: string;
  tryIt: string;
  connected: string;
  connecting: string;
  widgetsHeading: string;
  widgetsHint: string;
  widgetLabels: { small: string; extra: string; large: string; medium: string };
  actionsLabel: string;
  smallTitle: string;
  extraTitle: string;
  largeTitle: string;
  smallMeta: string;
  mediumTitle: string;
  mediumMeta: string;
  extraMeta: string;
  largeMeta: string;
  primary: string;
  actions: Record<WidgetAction, string>;
  intake: string;
  burned: string;
  carbs: string;
  protein: string;
  fat: string;
  notifications: {
    heading: string;
    hint: string;
    appName: string;
    water: string;
    meal: string;
    custom: string;
    weight: string;
    log: string;
    sampleCustom: string;
  };
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    screen: 'today',
    accent: '#E2D6FF',
    ink: '#4D3582',
    short: { en: 'Welcome', it: 'Benvenuto' },
    title: { en: 'How Kakcalculator works', it: 'Come funziona Kakcalculator' },
    body: {
      en: 'A private journal for what you eat, how you move and how you feel. Everything stays on this device: there is no account, and the journal works without internet. We will go through each page of the app, then finish with the home-screen widgets.',
      it: 'Un diario privato per ciò che mangi, come ti muovi e come stai. Tutto resta su questo dispositivo: non serve un account e il diario funziona senza internet. Vedremo ogni pagina dell’app e, alla fine, i widget per la schermata Home.',
    },
    points: {
      en: [
        'Swipe left or right on a page to move between Today, Custom, Period and Statistics.',
        'Tap the buttons in the phone to try them. Nothing is saved until you press Save.',
        'Language, theme and layout are in Settings, which opens from the gear icon at the top.',
      ],
      it: [
        'Scorri a sinistra o a destra su una pagina per passare tra Oggi, Personalizzati, Ciclo e Statistiche.',
        'Tocca i pulsanti nel telefono per provarli. Nulla viene salvato finché non premi Salva.',
        'Lingua, tema e layout si trovano nelle Impostazioni, che si apre dall’icona a ingranaggio in alto.',
      ],
    },
  },
  {
    id: 'today',
    screen: 'today',
    accent: '#F6D0D0',
    ink: '#6E2326',
    short: { en: 'Today', it: 'Oggi' },
    title: { en: 'Today', it: 'Oggi' },
    body: {
      en: 'The daily summary. Choose a date with the arrows or the calendar, then read how much you took in and how much you burned. The totals update as you log.',
      it: 'Il riepilogo della giornata. Scegli una data con le frecce o il calendario, poi leggi quanto hai assunto e quanto hai bruciato. I totali si aggiornano mentre registri.',
    },
    points: {
      en: [
        'Intake and Burned sit side by side, with the net balance as a badge.',
        'Carbs, protein and fat show their share of the day’s calories.',
        'The calendar marks days with entries. Back to today returns you at once.',
      ],
      it: [
        'Assunte e Bruciate sono affiancate, con il saldo netto in evidenza.',
        'Carboidrati, proteine e grassi mostrano la loro quota di calorie.',
        'Il calendario segna i giorni con dati. «Torna a oggi» ti riporta subito a oggi.',
      ],
    },
  },
  {
    id: 'meals',
    screen: 'meals',
    accent: '#FAE0B4',
    ink: '#6E4412',
    short: { en: 'Meals', it: 'Pasti' },
    title: { en: 'Meals', it: 'Pasti' },
    body: {
      en: 'Each meal has its own card: breakfast, lunch, dinner and the snack slots. Open a card to see its foods and their portions.',
      it: 'Ogni pasto ha la sua scheda: colazione, pranzo, cena e gli spuntini. Aprila per vedere alimenti e porzioni.',
    },
    points: {
      en: [
        'Compact, Normal and Expanded change how much detail the cards show.',
        'Use + on a card to add food to that meal.',
        'Open a food row to change its amount or remove it.',
      ],
      it: [
        'Compatta, Normale ed Espansa cambiano quanti dettagli mostrano le schede.',
        'Usa + su una scheda per aggiungere cibo a quel pasto.',
        'Apri una riga alimento per cambiarne la quantità o eliminarla.',
      ],
    },
  },
  {
    id: 'food',
    screen: 'food',
    accent: '#C9EFD3',
    ink: '#174A2B',
    short: { en: 'Food', it: 'Cibo' },
    title: { en: 'Add food', it: 'Aggiungi cibo' },
    body: {
      en: 'Choose a meal and search your foods, everyday ingredients and 130,000 Open Food Facts products. Your favourites appear first.',
      it: 'Scegli il pasto e cerca tra i tuoi alimenti, gli ingredienti di base e 130.000 prodotti Open Food Facts. I preferiti compaiono per primi.',
    },
    points: {
      en: [
        'Use a shortcut, a saved meal or a recent item for a quick entry.',
        'Choose a portion, queue several foods and log them together.',
        'Look up a barcode when a product is not in the catalogue.',
      ],
      it: [
        'Usa una scorciatoia, un pasto salvato o un alimento recente per una registrazione rapida.',
        'Scegli la porzione, accoda più alimenti e registrali insieme.',
        'Cerca un codice a barre quando un prodotto non è nel catalogo.',
      ],
    },
  },
  {
    id: 'activity',
    screen: 'activity',
    accent: '#F6D0D0',
    ink: '#702D32',
    short: { en: 'Activity', it: 'Attività' },
    title: { en: 'Activity', it: 'Attività' },
    body: {
      en: 'Log a walk, a run or another activity. The calories are estimated from your profile and the time or distance you enter.',
      it: 'Registra una camminata, una corsa o un’altra attività. Le calorie sono stimate dal tuo profilo e dal tempo o dalla distanza inseriti.',
    },
    points: {
      en: [
        'Walk and Run can be logged by distance or by time.',
        'Other opens a searchable list of about 180 activities with their MET values.',
        'Save your own activities so you can reuse them later.',
      ],
      it: [
        'Camminata e Corsa si registrano per distanza o per tempo.',
        'Altro apre un elenco ricercabile di circa 180 attività con i valori MET.',
        'Salva le tue attività per riusarle in seguito.',
      ],
    },
  },
  {
    id: 'water',
    screen: 'water',
    accent: '#CFE7FE',
    ink: '#183F66',
    short: { en: 'Water', it: 'Acqua' },
    title: { en: 'Water', it: 'Acqua' },
    body: {
      en: 'Add drinks in 250 ml glasses or in any amount. The indicator shows how close you are to today’s goal.',
      it: 'Aggiungi bevande in bicchieri da 250 ml o in una quantità qualsiasi. L’indicatore mostra quanto sei vicino all’obiettivo di oggi.',
    },
    points: {
      en: [
        'Choose a quick amount, or type your own.',
        'Each drink is listed on Today, where you can remove one.',
        'The goal follows your profile and your activity.',
      ],
      it: [
        'Scegli una quantità rapida oppure inseriscine una tua.',
        'Ogni bevuta è elencata in Oggi, dove puoi eliminarne una.',
        'L’obiettivo segue il tuo profilo e la tua attività.',
      ],
    },
  },
  {
    id: 'poop',
    screen: 'poop',
    accent: '#FAE0B4',
    ink: '#7D4E14',
    short: { en: 'Poop', it: 'Cacca' },
    title: { en: 'Poop', it: 'Cacca' },
    body: {
      en: 'Record the size and, if you wish, the Bristol type and a short note. You can hide this tracker in Settings.',
      it: 'Registra la dimensione e, se vuoi, il tipo Bristol e una breve nota. Puoi nascondere questo tracker nelle Impostazioni.',
    },
    points: {
      en: [
        'Choose a size from very little to huge.',
        'Add a Bristol type from 1 to 7 as a reference.',
        'Counts and times appear on Today, and as markers in Statistics.',
      ],
      it: [
        'Scegli una dimensione, da pochissima a enorme.',
        'Aggiungi un tipo Bristol da 1 a 7 come riferimento.',
        'Conteggi e orari compaiono in Oggi e come segnalini nelle Statistiche.',
      ],
    },
  },
  {
    id: 'weight',
    screen: 'weight',
    accent: '#E2D6FF',
    ink: '#49346F',
    short: { en: 'Weight', it: 'Peso' },
    title: { en: 'Weight', it: 'Peso' },
    body: {
      en: 'Log today’s weight in steps of 0.1 kg. Saved readings feed the weight trend and the BMR estimate.',
      it: 'Registra il peso di oggi con passi da 0,1 kg. Le letture salvate alimentano l’andamento del peso e la stima del BMR.',
    },
    points: {
      en: [
        'Use the − and + buttons, the quick ±kg steps, or type a value.',
        'Saving records the weight for the selected day.',
        'The weight trend in Statistics shows the direction over time.',
      ],
      it: [
        'Usa i pulsanti − e +, i passi rapidi ±kg oppure digita un valore.',
        'Salvando, il peso viene registrato per il giorno selezionato.',
        'L’andamento del peso nelle Statistiche mostra la direzione nel tempo.',
      ],
    },
  },
  {
    id: 'overview',
    screen: 'overview',
    accent: '#F7E9AA',
    ink: '#6E5B14',
    short: { en: 'Day overview', it: 'Riepilogo' },
    title: { en: 'Day overview', it: 'Riepilogo del giorno' },
    body: {
      en: 'Tap any date in the calendar to open a summary of that day: energy, macros, poop, activity, weight, water and your custom trackers.',
      it: 'Tocca una data nel calendario per aprire il riepilogo di quel giorno: energia, macronutrienti, cacca, attività, peso, acqua e tracker personalizzati.',
    },
    points: {
      en: [
        '“Open in Today” jumps to that day so you can edit it.',
        'On the Period page, a double tap opens the same summary.',
        'The summary lists only what was logged on that day.',
      ],
      it: [
        '«Apri in Oggi» ti porta a quel giorno per modificarlo.',
        'Nella pagina Ciclo, un doppio tocco apre lo stesso riepilogo.',
        'Il riepilogo mostra solo ciò che è stato registrato quel giorno.',
      ],
    },
  },
  {
    id: 'custom',
    screen: 'custom',
    accent: '#FAE0B4',
    ink: '#6E4412',
    short: { en: 'Custom', it: 'Personalizzati' },
    title: { en: 'Custom', it: 'Personalizzati' },
    body: {
      en: 'Keep the meals and recipes you repeat, together with your own food tools. A saved meal goes into a meal slot with one tap.',
      it: 'Conserva i pasti e le ricette che ripeti, insieme agli strumenti alimentari personali. Un pasto salvato va in un pasto con un solo tocco.',
    },
    points: {
      en: [
        'Meals keep their ingredients and slot. Recipes keep their original quantities.',
        'Search, edit or delete. Deleting asks for confirmation first.',
        'The Foods section adds your own items and looks up barcodes.',
      ],
      it: [
        'I pasti conservano ingredienti e pasto. Le ricette mantengono le quantità originali.',
        'Cerca, modifica o elimina. L’eliminazione chiede prima una conferma.',
        'La sezione Alimenti aggiunge voci personali e cerca i codici a barre.',
      ],
    },
  },
  {
    id: 'period',
    screen: 'period',
    accent: '#F4C6D8',
    ink: '#6E2440',
    short: { en: 'Period', it: 'Ciclo' },
    title: { en: 'Period', it: 'Ciclo' },
    body: {
      en: 'An optional cycle calendar with a daily log for flow, moods, symptoms, notes and pill tracking if you use it. Its estimates are not for contraception or fertility.',
      it: 'Un calendario del ciclo facoltativo con un diario giornaliero per flusso, umore, sintomi, note e, se la usi, la pillola. Le stime non servono a contraccezione o fertilità.',
    },
    points: {
      en: [
        'Shown here for the tour. In the app it appears when Period is turned on in Settings, and it is hidden by default for male profiles.',
        'The dock at the bottom marks a start, an end, a pill or intercourse.',
        'Cycle history and opt-in nutrition charts compare your days.',
      ],
      it: [
        'Mostrata qui per la visita guidata. Nell’app compare quando il Ciclo è attivato nelle Impostazioni, ed è nascosta di default per i profili maschili.',
        'Il pannello in basso segna inizio, fine, pillola o rapporti.',
        'Lo storico dei cicli e i grafici nutrizionali facoltativi confrontano i tuoi giorni.',
      ],
    },
  },
  {
    id: 'statistics',
    screen: 'statistics',
    accent: '#CFE7FE',
    ink: '#1A4670',
    short: { en: 'Statistics', it: 'Statistiche' },
    title: { en: 'Statistics', it: 'Statistiche' },
    body: {
      en: 'Compare the last 7 days, the last 30 days or any custom range: energy and nutrient averages, the weight trend and a daily breakdown.',
      it: 'Confronta gli ultimi 7 giorni, gli ultimi 30 giorni o un intervallo personalizzato: medie di energia e nutrienti, andamento del peso e dettaglio giornaliero.',
    },
    points: {
      en: [
        'Averages count only the days that have entries.',
        'Charts for custom trackers appear once you turn them on.',
        'Tap a day in the breakdown to open its summary.',
      ],
      it: [
        'Le medie contano solo i giorni con registrazioni.',
        'I grafici dei tracker personalizzati compaiono quando li attivi.',
        'Tocca un giorno nel dettaglio per aprirne il riepilogo.',
      ],
    },
  },
  {
    id: 'profile',
    screen: 'profile',
    accent: '#C9EFD3',
    ink: '#174A2B',
    short: { en: 'Profile', it: 'Profilo' },
    title: { en: 'Profile', it: 'Profilo' },
    body: {
      en: 'Weight, height, age and sex set your basal metabolic rate (BMR). The BMR is part of every day’s burned energy.',
      it: 'Peso, altezza, età e sesso determinano il metabolismo basale (BMR), che fa parte delle calorie bruciate ogni giorno.',
    },
    points: {
      en: [
        'The BMR uses the Mifflin–St Jeor formula and updates as you type.',
        'Changing the sex can change which pages are shown by default.',
        'Keep the profile current so the burned estimate stays accurate.',
      ],
      it: [
        'Il BMR usa la formula di Mifflin–St Jeor e si aggiorna mentre digiti.',
        'Cambiare il sesso può cambiare le pagine mostrate di default.',
        'Tieni aggiornato il profilo perché la stima delle calorie bruciate resti accurata.',
      ],
    },
  },
  {
    id: 'settings',
    screen: 'settings',
    accent: '#E2D6FF',
    ink: '#4D3582',
    short: { en: 'Settings', it: 'Impostazioni' },
    title: { en: 'Settings', it: 'Impostazioni' },
    body: {
      en: 'Choose English or Italian, the light, lite dark or dark theme, the Ultra minimal layout, and which shortcuts appear on Today.',
      it: 'Scegli inglese o italiano, il tema chiaro, chiaro scuro o scuro, il layout Ultra minimale e le scorciatoie che compaiono in Oggi.',
    },
    points: {
      en: [
        'Ultra minimal replaces most labels with icons and numbers.',
        'Hide the trackers or the Period page you do not use.',
        'Choose which reminder notifications you receive, and when.',
        'Export or import a JSON backup. Backups are not encrypted, so keep them private.',
      ],
      it: [
        'Ultra minimale sostituisce molte etichette con icone e numeri.',
        'Nascondi i tracker o la pagina Ciclo che non usi.',
        'Scegli quali notifiche di promemoria ricevere e quando.',
        'Esporta o importa un backup JSON. I backup non sono cifrati: conservali in modo privato.',
      ],
    },
  },
  {
    id: 'notifications',
    screen: 'notifications',
    kind: 'notifications',
    accent: '#FAE0B4',
    ink: '#7D4E14',
    short: { en: 'Notifications', it: 'Notifiche' },
    title: { en: 'Notifications', it: 'Notifiche' },
    body: {
      en: 'Gentle reminders that help you keep the journal up to date. Switch on only the ones you want in Settings → Notifications. Your phone delivers them even when the app is closed, and tapping one opens the right screen.',
      it: 'Promemoria discreti che ti aiutano a tenere il diario aggiornato. Attiva solo quelli che vuoi in Impostazioni → Notifiche. Il telefono li consegna anche con l’app chiusa e, toccandone uno, si apre la schermata giusta.',
    },
    points: {
      en: [
        'Water: choose how often (every 30 minutes up to every 4 hours) and the hours of the day.',
        'Meals: a separate reminder for each meal, at the time you pick for it.',
        'Weight, custom buttons and a general “don’t forget to log your data” reminder, each at a time you choose.',
        'Use “Send a test notification” to check delivery. Android asks for permission the first time you switch one on.',
      ],
      it: [
        'Acqua: scegli ogni quanto (da ogni 30 minuti a ogni 4 ore) e le ore della giornata.',
        'Pasti: un promemoria separato per ogni pasto, all’orario che scegli.',
        'Peso, pulsanti personalizzati e un promemoria generale “non dimenticare di registrare i dati”, ciascuno all’orario che preferisci.',
        'Usa “Invia una notifica di prova” per verificare la consegna. Android chiede il permesso la prima volta che ne attivi una.',
      ],
    },
  },
  {
    id: 'widgets',
    screen: 'today',
    kind: 'widgets',
    accent: '#E2D6FF',
    ink: '#49346F',
    short: { en: 'Widgets', it: 'Widget' },
    title: { en: 'Home-screen widgets', it: 'Widget per la schermata Home' },
    body: {
      en: 'Three widgets bring the everyday actions to your home screen. Small and Extra-small are for quick logging. Large shows your day at a glance.',
      it: 'Tre widget portano le azioni quotidiane sulla schermata Home. Piccolo ed Extra-piccolo servono a registrare in fretta; Grande mostra la giornata a colpo d’occhio.',
    },
    points: {
      en: [
        'Small: food, movement, water, poop and weight.',
        'Extra-small: food, water and poop.',
        'Large: intake, burned energy and macros. Tap any icon to open it in the app.',
      ],
      it: [
        'Piccolo: cibo, movimento, acqua, cacca e peso.',
        'Extra-piccolo: cibo, acqua e cacca.',
        'Grande: assunte, bruciate e macronutrienti. Tocca un’icona per aprirla nell’app.',
      ],
    },
  },
];

export const TOUR_UI: Record<TourLang, TourUi> = {
  en: {
    eyebrow: 'Guided tour',
    pageTitle: 'See how Kakcalculator works',
    pageLede: 'The real app runs beside each explanation. Move through the pages in order, and finish with the home-screen widgets.',
    pageCount: (n, total) => `Page ${n} of ${total}`,
    back: 'Back',
    next: 'Next',
    pages: 'Pages',
    openApp: 'Open full app',
    androidProject: 'Android project',
    language: 'Language',
    liveApp: 'Live app',
    liveAppTitle: 'Live Kakcalculator app',
    tryIt: 'Tap anything in the phone to try it. Nothing is saved until you press Save.',
    connected: 'Connected to your journal',
    connecting: 'Connecting to your journal',
    widgetsHeading: 'Widget collection',
    widgetsHint: 'Tap an icon to open that action in the app.',
    widgetLabels: { small: 'Small widget', extra: 'Extra-small widget', large: 'Large widget', medium: 'Medium widget' },
    actionsLabel: 'actions',
    smallTitle: 'Small',
    extraTitle: 'Extra-small',
    largeTitle: 'Large',
    smallMeta: '5 actions',
    mediumTitle: 'Medium widget',
    mediumMeta: 'Compact',
    extraMeta: '3 actions',
    largeMeta: 'Intake, burned, macros and 5 actions',
    primary: 'Primary',
    actions: { food: 'Food', movement: 'Movement', water: 'Water', poop: 'Poop', weight: 'Weight', custom: 'Custom' },
    intake: 'Intake',
    burned: 'Burned',
    carbs: 'Carbs',
    protein: 'Protein',
    fat: 'Fat',
    notifications: {
      heading: 'Notification preview',
      hint: 'Tap a card to open the screen it leads to.',
      appName: 'Kakcalculator',
      water: 'Every 2 h',
      meal: '13:00',
      custom: '19:00',
      weight: '07:30',
      log: '21:00',
      sampleCustom: 'Magnesium, Vitamin D',
    },
  },
  it: {
    eyebrow: 'Visita guidata',
    pageTitle: 'Scopri come funziona Kakcalculator',
    pageLede: 'L’app vera gira accanto a ogni spiegazione. Scorri le pagine in ordine e concludi con i widget per la schermata Home.',
    pageCount: (n, total) => `Pagina ${n} di ${total}`,
    back: 'Indietro',
    next: 'Avanti',
    pages: 'Pagine',
    openApp: 'Apri l’app completa',
    androidProject: 'Progetto Android',
    language: 'Lingua',
    liveApp: 'App dal vivo',
    liveAppTitle: 'App Kakcalculator dal vivo',
    tryIt: 'Tocca qualsiasi cosa nel telefono per provarla. Nulla viene salvato finché non premi Salva.',
    connected: 'Collegato al tuo diario',
    connecting: 'Collegamento al diario',
    widgetsHeading: 'Raccolta widget',
    widgetsHint: 'Tocca un’icona per aprire quell’azione nell’app.',
    widgetLabels: { small: 'Widget piccolo', extra: 'Widget extra-piccolo', large: 'Widget grande', medium: 'Widget medio' },
    actionsLabel: 'azioni',
    smallTitle: 'Piccolo',
    extraTitle: 'Extra-piccolo',
    largeTitle: 'Grande',
    smallMeta: '5 azioni',
    mediumTitle: 'Widget medio',
    mediumMeta: 'Compatto',
    extraMeta: '3 azioni',
    largeMeta: 'Assunte, bruciate, macro e 5 azioni',
    primary: 'Principale',
    actions: { food: 'Cibo', movement: 'Attività', water: 'Acqua', poop: 'Cacca', weight: 'Peso', custom: 'Personalizzato' },
    intake: 'Assunte',
    burned: 'Bruciate',
    carbs: 'Carboidrati',
    protein: 'Proteine',
    fat: 'Grassi',
    notifications: {
      heading: 'Anteprima delle notifiche',
      hint: 'Tocca una scheda per aprire la schermata a cui porta.',
      appName: 'Kakcalculator',
      water: 'Ogni 2 h',
      meal: '13:00',
      custom: '19:00',
      weight: '07:30',
      log: '21:00',
      sampleCustom: 'Magnesio, Vitamina D',
    },
  },
};
