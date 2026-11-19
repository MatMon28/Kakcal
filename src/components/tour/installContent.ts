import type { InstallPlatform } from '../../utils/pwaInstall';
import type { TourLang } from './tourContent';

export interface InstallPlatformGuide {
  tab: string;
  heading: string;
  intro: string;
  steps: string[];
  /** Optional extra hint under the steps. */
  tip?: string;
}

export interface InstallUi {
  /** Header button that scrolls to the guide. */
  navLabel: string;
  eyebrow: string;
  title: string;
  lede: string;
  platforms: Record<InstallPlatform, InstallPlatformGuide>;
  installNow: string;
  installNowHint: string;
  installedTitle: string;
  installedBody: string;
  openApp: string;
  afterInstall: string;
  /** Android APK block. */
  apk: {
    title: string;
    body: string;
    download: string;
    allReleases: string;
    warningTitle: string;
    warningIntro: string;
    warnings: string[];
    safety: string;
  };
}

export const INSTALL_UI: Record<TourLang, InstallUi> = {
  en: {
    navLabel: 'Install app',
    eyebrow: 'Install',
    title: 'Get Kakcalculator on your device',
    lede: 'Install it once and it opens like any other app, full screen, with its own icon, and it keeps working offline. No account and no store needed.',
    platforms: {
      ios: {
        tab: 'iPhone / iPad',
        heading: 'On iPhone or iPad',
        intro: 'iOS has no install button, but Safari can add the app to your Home Screen in a few taps.',
        steps: [
          'Open this page in Safari (on iOS 16.4 and newer other browsers can do it too).',
          'Tap the Share button (the square with an arrow pointing up) in the toolbar.',
          'Scroll down and tap “Add to Home Screen”. If you do not see it, tap “View More” first.',
          'Keep “Open as Web App” switched on if it is shown, then tap “Add”.',
          'Open Kakcalculator from the new icon on your Home Screen.',
        ],
        tip: 'The Home Screen app keeps its own storage on iOS, so install it before you start logging, or move an existing journal with Settings > Data Backup.',
      },
      android: {
        tab: 'Android',
        heading: 'On Android',
        intro: 'Two ways: install the web app straight from Chrome, or download the APK to also get native home-screen widgets and reminder notifications.',
        steps: [
          'Open this page in Chrome (Edge, Samsung Internet and Brave work too).',
          'Tap the “Install now” button below, or open the ⋮ menu and choose “Install app” (sometimes called “Add to Home screen”).',
          'Confirm with “Install”. The icon appears on your Home Screen and in the app drawer.',
          'Open Kakcalculator from that icon. From now on it always opens the app itself.',
        ],
      },
      desktop: {
        tab: 'Computer',
        heading: 'On Windows, macOS, Linux or ChromeOS',
        intro: 'Chrome and Edge install the app as its own window, with a desktop or Start menu shortcut.',
        steps: [
          'Open this page in Chrome or Edge.',
          'Click the “Install now” button below, or the install icon (a screen with a small arrow) at the right end of the address bar.',
          'Otherwise open the browser menu: in Chrome choose “Cast, save and share” > “Install page as app…”, in Edge choose “Apps” > “Install this site as an app”.',
          'Confirm with “Install”. The app opens in its own window and can be pinned to the taskbar or Dock.',
          'Safari on macOS 14 or newer: File > “Add to Dock…”. Firefox cannot install web apps.',
        ],
      },
    },
    installNow: 'Install now',
    installNowHint: 'Your browser is ready to install the app.',
    installedTitle: 'Kakcalculator is installed',
    installedBody: 'Open it from your Home Screen, app drawer or desktop. It will always start directly in the app, without this page.',
    openApp: 'Open the app',
    afterInstall: 'After installing, Kakcalculator always opens straight into the app. This guide only shows to new visitors.',
    apk: {
      title: 'Android: download the APK as well',
      body: 'The APK is the full Android app. Compared with the web version it adds the four home-screen widgets and optional reminder notifications, and it starts from files on the phone.',
      download: 'Download APK',
      allReleases: 'All releases',
      warningTitle: 'Android may say the file could be harmful',
      warningIntro: 'That is expected. The APK does not come from the Google Play Store, and Android and Google Play Protect warn about every app installed this way. You may see:',
      warnings: [
        '“This type of file can harm your device” when the browser finishes the download. Tap “Download anyway” or “OK”.',
        '“For your security, your phone is not allowed to install unknown apps from this source”. Tap “Settings” and allow your browser (or Files app) to install unknown apps. You can switch it off again afterwards.',
        '“Blocked by Play Protect” or “App not scanned”. Tap “More details”, then “Install anyway”.',
      ],
      safety: 'Only install the APK from this page or from the official GitHub releases of the project. Kakcalculator has no account and no backend, and your data stays on your phone.',
    },
  },
  it: {
    navLabel: 'Installa l’app',
    eyebrow: 'Installazione',
    title: 'Porta Kakcalculator sul tuo dispositivo',
    lede: 'Installala una volta e si apre come qualsiasi altra app: a schermo intero, con la sua icona, e funziona anche offline. Nessun account e nessuno store.',
    platforms: {
      ios: {
        tab: 'iPhone / iPad',
        heading: 'Su iPhone o iPad',
        intro: 'iOS non ha un pulsante di installazione, ma Safari può aggiungere l’app alla schermata Home in pochi tocchi.',
        steps: [
          'Apri questa pagina in Safari (da iOS 16.4 in poi funzionano anche altri browser).',
          'Tocca il pulsante Condividi (il quadrato con la freccia verso l’alto) nella barra degli strumenti.',
          'Scorri e tocca “Aggiungi alla schermata Home”. Se non la vedi, tocca prima “Mostra altro”.',
          'Lascia attivo “Apri come app web” se compare, poi tocca “Aggiungi”.',
          'Apri Kakcalculator dalla nuova icona nella schermata Home.',
        ],
        tip: 'Su iOS l’app nella schermata Home ha un archivio separato: installala prima di iniziare a registrare, oppure sposta un diario esistente con Impostazioni > Backup dati.',
      },
      android: {
        tab: 'Android',
        heading: 'Su Android',
        intro: 'Due modi: installa l’app web direttamente da Chrome, oppure scarica l’APK per avere anche i widget nativi e le notifiche di promemoria.',
        steps: [
          'Apri questa pagina in Chrome (vanno bene anche Edge, Samsung Internet e Brave).',
          'Tocca “Installa ora” qui sotto, oppure apri il menu ⋮ e scegli “Installa app” (a volte “Aggiungi a schermata Home”).',
          'Conferma con “Installa”. L’icona compare nella schermata Home e nell’elenco delle app.',
          'Apri Kakcalculator da quell’icona. Da ora si apre sempre direttamente l’app.',
        ],
      },
      desktop: {
        tab: 'Computer',
        heading: 'Su Windows, macOS, Linux o ChromeOS',
        intro: 'Chrome ed Edge installano l’app come finestra a sé, con un collegamento sul desktop o nel menu Start.',
        steps: [
          'Apri questa pagina in Chrome o in Edge.',
          'Clicca “Installa ora” qui sotto, oppure l’icona di installazione (uno schermo con una piccola freccia) a destra della barra degli indirizzi.',
          'In alternativa apri il menu del browser: in Chrome scegli “Trasmetti, salva e condividi” > “Installa pagina come app…”, in Edge scegli “App” > “Installa questo sito come app”.',
          'Conferma con “Installa”. L’app si apre in una finestra propria e si può fissare alla barra delle applicazioni o al Dock.',
          'Safari su macOS 14 o successivo: File > “Aggiungi al Dock…”. Firefox non può installare app web.',
        ],
      },
    },
    installNow: 'Installa ora',
    installNowHint: 'Il tuo browser è pronto a installare l’app.',
    installedTitle: 'Kakcalculator è installata',
    installedBody: 'Aprila dalla schermata Home, dall’elenco delle app o dal desktop. Partirà sempre direttamente dall’app, senza questa pagina.',
    openApp: 'Apri l’app',
    afterInstall: 'Dopo l’installazione Kakcalculator si apre sempre direttamente nell’app. Questa guida compare solo ai nuovi visitatori.',
    apk: {
      title: 'Android: scarica anche l’APK',
      body: 'L’APK è l’app Android completa. Rispetto alla versione web aggiunge i quattro widget per la schermata Home e i promemoria opzionali, e parte dai file presenti sul telefono.',
      download: 'Scarica l’APK',
      allReleases: 'Tutte le versioni',
      warningTitle: 'Android può dire che il file potrebbe essere dannoso',
      warningIntro: 'È normale. L’APK non arriva dal Google Play Store e Android e Google Play Protect avvisano per ogni app installata in questo modo. Potresti vedere:',
      warnings: [
        '“Questo tipo di file può danneggiare il dispositivo” al termine del download. Tocca “Scarica comunque” oppure “OK”.',
        '“Per la tua sicurezza, il telefono non può installare app sconosciute da questa fonte”. Tocca “Impostazioni” e consenti al browser (o all’app File) di installare app sconosciute. Puoi disattivarlo di nuovo dopo.',
        '“Bloccata da Play Protect” oppure “App non analizzata”. Tocca “Maggiori dettagli”, poi “Installa comunque”.',
      ],
      safety: 'Installa l’APK solo da questa pagina o dalle release GitHub ufficiali del progetto. Kakcalculator non ha account né backend e i tuoi dati restano sul telefono.',
    },
  },
};
