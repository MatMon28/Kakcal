import React, { useRef } from 'react';
import { Modal } from '../common/Modal';
import { Link2, ClipboardPaste, Download, Check, AlertTriangle, Loader2, WifiOff, Lock, Search } from 'lucide-react';
import type { ImportErrorInfo, LibraryState } from './usePreBuiltMealsState';
import type { RecipeImportErrorCode } from '../../utils/recipeImport';

type Text = { title: string; hint: string };

/**
 * Every failure gets a title, a reason and a next step, in both languages of the app. `recipeImport.ts`
 * classifies the failure and carries an English message; this table is what the user actually reads.
 */
const ERROR_TEXT: Record<RecipeImportErrorCode, { en: Text; it: Text }> = {
  'invalid-url': {
    en: { title: 'That is not a link', hint: 'Paste the full address from your browser, for example https://www.example.com/recipe.' },
    it: { title: 'Questo non è un link', hint: 'Incolla l\'indirizzo completo dal browser, per esempio https://www.example.com/ricetta.' },
  },
  'unsupported-link': {
    en: { title: 'Only web pages can be read', hint: 'Paste the http or https address of the recipe page.' },
    it: { title: 'Si possono leggere solo pagine web', hint: 'Incolla l\'indirizzo http o https della pagina della ricetta.' },
  },
  network: {
    en: { title: 'Could not reach the page', hint: 'Check your connection and try again. A recipe behind a login cannot be read.' },
    it: { title: 'Impossibile raggiungere la pagina', hint: 'Controlla la connessione e riprova. Una ricetta dietro un login non può essere letta.' },
  },
  timeout: {
    en: { title: 'The page took too long', hint: 'The site may be slow right now. Try again in a moment.' },
    it: { title: 'La pagina ci ha messo troppo tempo', hint: 'Il sito potrebbe essere lento. Riprova tra un momento.' },
  },
  blocked: {
    en: { title: 'This site refused the request', hint: 'Some sites block automatic reading. You can still build the recipe by hand.' },
    it: { title: 'Il sito ha rifiutato la richiesta', hint: 'Alcuni siti bloccano la lettura automatica. Puoi comunque creare la ricetta a mano.' },
  },
  'login-wall': {
    en: { title: 'This recipe needs an account', hint: 'Kakcal cannot sign in to websites. Log in with your browser and copy the recipe by hand.' },
    it: { title: 'Questa ricetta richiede un account', hint: 'Kakcal non può accedere ai siti. Accedi dal browser e copia la ricetta a mano.' },
  },
  'not-html': {
    en: { title: 'That link is not a web page', hint: 'It may be a PDF, a photo or a file. Open the recipe in your browser and copy that address.' },
    it: { title: 'Questo link non è una pagina web', hint: 'Potrebbe essere un PDF, una foto o un file. Apri la ricetta nel browser e copia quell\'indirizzo.' },
  },
  'too-large': {
    en: { title: 'This page is too large', hint: 'Check that the link opens the recipe itself and not a photo gallery or a video.' },
    it: { title: 'Questa pagina è troppo grande', hint: 'Controlla che il link apra la ricetta e non una galleria di foto o un video.' },
  },
  'no-recipe': {
    en: { title: 'No recipe found on this page', hint: 'The link may open an article, a video or the home page. Open the recipe itself and copy that address.' },
    it: { title: 'Nessuna ricetta trovata in questa pagina', hint: 'Il link potrebbe aprire un articolo, un video o la home page. Apri la ricetta e copia quell\'indirizzo.' },
  },
  empty: {
    en: { title: 'The recipe has no ingredients', hint: 'The page declares a recipe but lists nothing. Add it by hand with the recipe builder.' },
    it: { title: 'La ricetta non ha ingredienti', hint: 'La pagina dichiara una ricetta ma non elenca nulla. Creala a mano con il costruttore di ricette.' },
  },
  unknown: {
    en: { title: 'Something went wrong', hint: 'Check the link and your connection, then try again.' },
    it: { title: 'Qualcosa è andato storto', hint: 'Controlla il link e la connessione, poi riprova.' },
  },
};

const iconFor = (code: RecipeImportErrorCode) => {
  if (code === 'network' || code === 'timeout') return <WifiOff size={15} className="shrink-0 mt-0.5" />;
  if (code === 'blocked' || code === 'login-wall') return <Lock size={15} className="shrink-0 mt-0.5" />;
  if (code === 'no-recipe' || code === 'empty' || code === 'not-html') return <Search size={15} className="shrink-0 mt-0.5" />;
  return <AlertTriangle size={15} className="shrink-0 mt-0.5" />;
};

/**
 * "Import from a link": the only screen the import adds. After a successful read the draft is handed
 * to the normal recipe builder, which is where the user checks and edits the ingredients.
 */
export const RecipeImportModal: React.FC<{ s: LibraryState }> = ({ s }) => {
  const { j, isImportOpen, closeImportModal, importUrl, setImportUrl, importBusy, importStage, importError, runImport } = s;
  const inputRef = useRef<HTMLInputElement>(null);

  const stageLabel = importStage === 'fetching'
    ? j('Downloading the page…', 'Scaricando la pagina…')
    : importStage === 'parsing'
      ? j('Reading the recipe…', 'Leggendo la ricetta…')
      : importStage === 'matching'
        ? j('Matching ingredients…', 'Abbinando gli ingredienti…')
        : j('Importing…', 'Importazione…');

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setImportUrl(text.trim());
      inputRef.current?.focus();
    } catch {
      inputRef.current?.focus(); // clipboard permission denied: the user pastes by hand
    }
  };

  const errorText = (error: ImportErrorInfo) => {
    const entry = ERROR_TEXT[error.code];
    // No entry (a code added later): show whatever the importer said rather than nothing.
    if (!entry) return { title: error.message, hint: error.hint };
    return { title: j(entry.en.title, entry.it.title), hint: j(entry.en.hint, entry.it.hint) };
  };

  return (
    <Modal
      dockId="recipe-import"
      isOpen={isImportOpen}
      onClose={() => { if (!importBusy) closeImportModal(); }}
      title={j('Import a recipe from a link', 'Importa una ricetta da un link')}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <p className="text-xs font-medium text-[var(--muted)] leading-relaxed">
          {j(
            'Paste the address of a recipe page. Kakcal reads the recipe data the site publishes, finds each ingredient in your food database and opens it for you to check.',
            'Incolla l\'indirizzo di una pagina di ricetta. Kakcal legge i dati pubblicati dal sito, cerca ogni ingrediente nel tuo database e apre la ricetta per il controllo.',
          )}
        </p>

        <div className="space-y-2">
          <label htmlFor="recipe-import-url" className="block text-[11px] font-extrabold text-[var(--text)]">
            {j('Recipe link', 'Link della ricetta')}
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Link2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                id="recipe-import-url"
                ref={inputRef}
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                value={importUrl}
                disabled={importBusy}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void runImport(); }}
                placeholder="https://example.com/your-recipe"
                aria-invalid={Boolean(importError)}
                aria-describedby={importError ? 'recipe-import-error' : undefined}
                className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl pl-9 pr-3 py-2.5 text-sm font-semibold text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--muted)] disabled:opacity-60"
              />
            </div>
            <button
              type="button"
              onClick={() => void paste()}
              disabled={importBusy}
              className="pressable shrink-0 w-11 h-11 rounded-2xl bg-[var(--inset)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center disabled:opacity-40"
              aria-label={j('Paste from clipboard', 'Incolla dagli appunti')}
              title={j('Paste from clipboard', 'Incolla dagli appunti')}
            >
              <ClipboardPaste size={17} />
            </button>
          </div>
        </div>

        {/* A specific reason and a next step, never just "error". */}
        {importError && (
          <div
            id="recipe-import-error"
            role="alert"
            aria-live="polite"
            className="flex items-start gap-2 rounded-2xl bg-[#F6D0D0] px-3 py-2.5 text-[#8C2D32]"
          >
            {iconFor(importError.code)}
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-extrabold leading-snug">{errorText(importError).title}</p>
              <p className="text-[10px] font-medium leading-relaxed opacity-90">{errorText(importError).hint}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => void runImport()}
          disabled={importBusy || importUrl.trim().length < 4}
          className="kc-primary-btn pressable w-full py-3 bg-[#E2D6FF] hover:bg-[#D4C4FF] text-[#4D3582] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-40"
        >
          {importBusy ? <Loader2 size={17} strokeWidth={2.5} className="animate-spin" /> : <Download size={17} strokeWidth={2.5} />}
          <span>{importBusy ? stageLabel : importError ? j('Try again', 'Riprova') : j('Import recipe', 'Importa ricetta')}</span>
        </button>

        <div className="rounded-2xl bg-[var(--inset)] px-3 py-2.5 space-y-1.5">
          {[
            j('Works with most recipe websites and blogs.', 'Funziona con la maggior parte dei siti e blog di ricette.'),
            j('Nothing is saved until you check the recipe and press Save.', 'Niente viene salvato finché non controlli la ricetta e premi Salva.'),
            j('Pages behind a login or an anti-bot wall cannot be read.', 'Le pagine protette da login o da un blocco anti-bot non possono essere lette.'),
          ].map((line) => (
            <p key={line} className="flex items-start gap-1.5 text-[10px] font-medium text-[var(--muted)] leading-relaxed">
              <Check size={12} className="shrink-0 mt-0.5" />
              <span>{line}</span>
            </p>
          ))}
        </div>
      </div>
    </Modal>
  );
};
