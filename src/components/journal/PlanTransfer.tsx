import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, Link, LockKeyhole, Share2, Upload } from 'lucide-react';
import type { MealPlan } from '../../types/journal';
import { useApp } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import { useMealSlots } from '../../utils/mealSlots';
import { addDaysToDateString } from '../../utils/formatters';
import { journalId, savePlanGroup } from '../../utils/journalStore';
import { createPlanLink, createPlanText, saveLocalFile, parsePlanInput } from '../../utils/planSharing';
import { captureIncomingPlan, clearIncomingPlan, peekIncomingPlan } from '../../utils/incomingPlan';
import { Modal } from '../common/Modal';
import { MealSlotIcon } from '../common/mealSlotIcon';
import { journalDate } from './JournalUI';

export function PlanTransfer({ plans, weekStart }: { plans: MealPlan[]; weekStart: string }) {
  const j = useJournalText();
  const { language } = useApp();
  const { options, label } = useMealSlots();
  // The received link lives in memory (see utils/incomingPlan.ts), never in the address bar: settings changes,
  // remounts and Back navigation cannot bring the pop-up back once it has been dealt with.
  const [incoming] = useState(peekIncomingPlan);
  const [open, setOpen] = useState(Boolean(incoming));
  const [mode, setMode] = useState<'share' | 'import'>(incoming ? 'import' : 'share');
  const [input, setInput] = useState(incoming);
  const [scope, setScope] = useState('week');
  const [preview, setPreview] = useState<MealPlan[]>([]);
  const [startDate, setStartDate] = useState('');
  const [planName, setPlanName] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);
  // The icon only opens on a real press on it (or the keyboard). A stray click that lands on it when another pop-up
  // (Settings...) closes on top of it is ignored.
  const pressed = useRef(false);
  const selected = useMemo(() => plans.filter((p) => scope === 'all' || (p.date >= weekStart && p.date <= addDaysToDateString(weekStart, 6))), [plans, scope, weekStart]);
  const [link, setLink] = useState('');
  useEffect(() => {
    let current = true;
    if (!open || mode !== 'share' || !selected.length) { setLink(''); return; }
    createPlanLink(selected).then((value) => { if (current) setLink(value); }, () => { if (current) setLink(''); });
    return () => { current = false; };
  }, [open, mode, selected]);
  // A link that opened the app is previewed straight away.
  useEffect(() => { if (incoming) void inspect(incoming); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const receive = () => {
      if (captureIncomingPlan()) { const text = peekIncomingPlan(); setInput(text); setMode('import'); setOpen(true); void inspect(text); }
    };
    window.addEventListener('hashchange', receive);
    return () => window.removeEventListener('hashchange', receive);
  }, []);
  const close = () => {
    setOpen(false); setStatus(''); setError('');
    clearIncomingPlan();
  };
  const inspect = async (text = input) => {
    try {
      const parsed = (await parsePlanInput(text)).sort((a, b) => a.date.localeCompare(b.date));
      const firstDate = journalDate(parsed[0].date, language);
      const lastDate = journalDate(parsed[parsed.length - 1].date, language);
      const range = firstDate === lastDate ? firstDate : `${firstDate} – ${lastDate}`;
      setPreview(parsed);
      setStartDate(parsed[0].date);
      setPlanName(j(`Imported plan · ${range}`, `Programma importato · ${range}`));
      setError('');
      setStatus('');
    } catch { setPreview([]); setError(j('This is not a valid Kakcal meal-plan link or text export.', 'Link o testo del programma Kakcal non valido.')); }
  };
  const share = async () => {
    setError('');
    try {
      if (typeof navigator.share === 'function') { await navigator.share({ title: 'My Kakcal meal plan', url: link }); setStatus(j('Plan shared.', 'Programma condiviso.')); }
      else { await navigator.clipboard.writeText(link); setStatus(j('Link copied. Ready to send!', 'Link copiato, pronto da inviare!')); }
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') setError(j('Select and copy the link below to share it.', 'Seleziona e copia il link qui sotto.'));
    }
  };
  return <>
    <button type="button" className="library-browse-search" title={j('Share or import meal plans', 'Condividi o importa programmi')} aria-label={j('Share or import meal plans', 'Condividi o importa programmi')} onPointerDown={() => { pressed.current = true; window.setTimeout(() => { pressed.current = false; }, 1500); }} onClick={(event) => { if (event.detail === 0 || pressed.current) setOpen(true); }}><Share2 size={16} /></button>
    {open && <Modal isOpen onClose={close} title={j('Share meal plans', 'Condividi i programmi')} maxWidth="max-w-lg">
      <div className="journal-form plan-transfer">
        <div className="journal-segmented"><button type="button" className={mode === 'share' ? 'is-active' : ''} onClick={() => { setMode('share'); setError(''); setStatus(''); }}><Share2 size={16} />{j('Share a plan', 'Condividi')}</button><button type="button" className={mode === 'import' ? 'is-active' : ''} onClick={() => { setMode('import'); setError(''); setStatus(''); }}><Download size={16} />{j('Import a plan', 'Importa')}</button></div>
        {mode === 'share' ? <>
          <label>{j('Plans to share', 'Programmi da condividere')}<select value={scope} onChange={(e) => setScope(e.target.value)}><option value="week">{j('This selected week', 'La settimana selezionata')}</option><option value="all">{j('All my planned meals', 'Tutti i pasti pianificati')}</option></select></label>
          <p className="plan-transfer-count">{selected.length} {j('planned meals', 'pasti pianificati')}</p>
          <p className="plan-transfer-privacy"><LockKeyhole size={17} />{j('Only these meals and notes are shared. Anyone with your link can read them. Nothing is uploaded to a server.', 'Solo questi pasti e note. Chi ha il link puo leggerli. Nessun caricamento su server.')}</p>
          {link && <><label>{j('Your shareable link', 'Il tuo link')}<textarea rows={2} value={link} readOnly onFocus={(e) => e.target.select()} /></label><button type="button" className="journal-primary-button" onClick={() => void share()}>{typeof navigator.share === 'function' ? <Share2 size={16} /> : <Copy size={16} />}{j('Share link', 'Condividi link')}</button></>}
          {!link && <p>{selected.length ? j('This plan is too large for a reliable mobile link. Use the readable text export below.', 'Programma troppo grande per un link. Usa il testo qui sotto.') : j('Plan a meal first, or choose a different week.', 'Pianifica un pasto o scegli un\'altra settimana.')}</p>}
          <button type="button" className="journal-secondary-button" disabled={!selected.length} onClick={async () => { try { const saved = await saveLocalFile(new Blob([createPlanText(selected)], { type: 'text/plain;charset=utf-8' }), 'kakcal-meal-plan.txt'); if (saved) setStatus(j('Text export saved.', 'Testo esportato.')); } catch { setError(j('Could not save the text file. Update the app or try your browser.', 'Impossibile salvare. Aggiorna la app o prova dal browser.')); } }}><Download size={15} />{j('Save as readable text', 'Salva come testo leggibile')}</button>
        </> : <>
          <label>{j('Paste a meal-plan link or exported text', 'Incolla un link o testo esportato')}<textarea rows={3} value={input} onChange={(e) => { setInput(e.target.value); setPreview([]); setStatus(''); }} placeholder="https://.../#meal-plan=..." /></label>
          <div className="plan-transfer-actions"><button type="button" className="journal-primary-button" disabled={!input.trim()} onClick={() => void inspect()}><Link size={16} />{j('Preview plan', 'Anteprima')}</button><button type="button" className="journal-secondary-button" onClick={() => file.current?.click()}><Upload size={15} />{j('Open text file', 'Apri file di testo')}</button></div>
          <input ref={file} className="sr-only" type="file" accept=".txt,.json,text/plain,application/json" aria-label={j('Import meal plan file', 'Importa file programma')} onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; if (f.size > 1000000) { setError(j('Choose a file smaller than 1 MB.', 'Scegli un file sotto 1 MB.')); return; } try { const text = await f.text(); setInput(text); void inspect(text); } catch { setError(j('Could not read this file.', 'Impossibile leggere il file.')); } }} />
          {preview.length > 0 && <>
            <div className="plan-import-preview">{preview.slice(0, 10).map((p) => <div key={p.id}><MealSlotIcon slot={p.slot} /><span><small>{journalDate(p.date, language)} / {label(p.slot)}</small><strong>{p.title}</strong></span></div>)}{preview.length > 10 && <p>+ {preview.length - 10} {j('more meals', 'altri pasti')}</p>}</div>
            <label>{j('Plan name', 'Nome del programma')}<input type="text" maxLength={80} value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder={j('e.g. Mediterranean week', 'es. Settimana mediterranea')} /></label>
            <label>{j('Start this plan on', 'Inizia il programma il')}<input required aria-label={j('Import starting date', 'Data inizio importazione')} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
            {preview.some((p) => !options.some((slot) => slot.id === p.slot)) && <p>{j('Unrecognized meal categories will be added to Lunch.', 'Categorie non riconosciute verranno aggiunte a Pranzo.')}</p>}
            <p className="plan-transfer-hint">{j('Your existing plans stay exactly as they are. Nothing is logged to Today.', 'I tuoi programmi rimangono intatti. Nessun alimento registrato in Oggi.')}</p>
            <button type="button" className="journal-primary-button" disabled={!startDate} onClick={() => {
              try {
                const offset = Math.round((new Date(`${startDate}T12:00:00Z`).getTime() - new Date(`${preview[0].date}T12:00:00Z`).getTime()) / 86400000);
                const finalName = planName.trim() || j('Imported plan', 'Programma importato');
                savePlanGroup(
                  { id: journalId(), name: finalName, createdAt: new Date().toISOString() },
                  preview.map((p) => ({ ...p, id: journalId(), date: addDaysToDateString(p.date, offset), slot: options.some((slot) => slot.id === p.slot) ? p.slot : 'lunch', read: false, loggedAt: undefined })),
                );
                setStatus(j(`${preview.length} meals imported. Make them your own!`, `${preview.length} pasti importati.`)); setPreview([]); setInput('');
                clearIncomingPlan();
              } catch { setError(j('Could not save. Free some device storage and try again.', 'Spazio insufficiente. Libera memoria e riprova.')); }
            }}><Check size={16} />{j(`Import ${preview.length} meals`, `Importa ${preview.length} pasti`)}</button>
          </>}
        </>}
        {status && <p role="status" className="plan-transfer-success"><Check size={16} />{status}</p>}
        {error && <p role="alert" className="journal-error">{error}</p>}
      </div>
    </Modal>}
  </>;
}