import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { OPEN_PHOTO_DIARY_EVENT } from './CustomShortcuts';
import {
  ArrowUpRight,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  LockKeyhole,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useNavActions, useSettings, useUiState } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import { useMealSlots } from '../../utils/mealSlots';
import { addDaysToDateString, getTodayDateString } from '../../utils/formatters';
import { addMealPhoto, journalId, removeMealPhoto, saveMealPhoto, useMealJournal, usePhotosForLinked, usePhotosForSlot } from '../../utils/journalStore';
import { classifyStorageError } from '../../storage/status';
import { usePhotoSrc } from '../../storage/photoStore';
import { revealLibraryItem, revealMealSlot } from '../../utils/journalNavigation';
import type { MealSlotId } from '../../types';
import type { MealPhoto } from '../../types/journal';
import { Modal } from '../common/Modal';
import { MealSlotIcon } from '../common/mealSlotIcon';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { JournalEmpty, JournalSearch, JournalSection, journalDate } from './JournalUI';
import { JournalDateField, JournalMealSelect } from './JournalPickers';

export function PhotoDiary({ sectionHidden = false }: { sectionHidden?: boolean }) {
  const { language } = useSettings();
  const { selectedDate } = useUiState();
  const { photos } = useMealJournal();
  const j = useJournalText();
  const [add, setAdd] = useState(false);
  const [browse, setBrowse] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  // The Custom page shortcut button opens the full gallery even when the section is hidden.
  useEffect(() => {
    const open = () => setBrowse(true);
    window.addEventListener(OPEN_PHOTO_DIARY_EVENT, open);
    return () => window.removeEventListener(OPEN_PHOTO_DIARY_EVENT, open);
  }, []);
  // Sorted once per change of the photos, not on every render (the list can hold many photos).
  const ordered = useMemo(
    () => [...photos].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [photos],
  );
  const q = query.trim().toLowerCase();
  const shown = q ? ordered.filter((p) => p.note.toLowerCase().includes(q)) : ordered;
  return (
    <>
      {!sectionHidden && (
        <JournalSection
          tone="red"
          className="journal-photo-diary"
          title={j('Photo diary', 'Diario fotografico')}
          icon={<Camera size={16} strokeWidth={2.2} />}
          count={photos.length}
          searchLabel={j('Search photo diary', 'Cerca nel diario fotografico')}
          query={query}
          setQuery={setQuery}
          createLabel={j('Add a meal photo', 'Aggiungi una foto')}
          onCreate={() => setAdd(true)}
        >
          <div className="journal-photo-grid">
            {shown.slice(0, query.trim() ? 6 : 3).map((photo) => (
              <button
                className="journal-photo-preview"
                key={photo.id}
                type="button"
                onClick={() => setSelected(photo.id)}
              >
                <span>
                  <StoredImage src={photo.src} alt={photo.note} loading="lazy" decoding="async" />
                </span>
                <strong>{photo.note}</strong>
                <small>{journalDate(photo.date, language)}</small>
              </button>
            ))}
            {ordered.length > 0 && !shown.length && (
              <JournalEmpty>{j('No photos match this search.', 'Nessuna foto corrisponde alla ricerca.')}</JournalEmpty>
            )}
            {!ordered.length && (
              <button className="journal-photo-empty" type="button" onClick={() => setAdd(true)}>
                <ImagePlus size={30} />
                <strong>{j('Start with a snapshot', 'Inizia con una foto')}</strong>
                <span>{j('A good meal is more than a number.', 'Un buon pasto e piu di un numero.')}</span>
              </button>
            )}
          </div>
          {shown.length > (q ? 6 : 3) && (
            <button type="button" className="journal-secondary-button journal-see-all" onClick={() => setBrowse(true)}>
              {j('See all photos', 'Vedi tutte le foto')}
              <ArrowUpRight size={14} />
            </button>
          )}
        </JournalSection>
      )}
      {add && <PhotoComposer initialDate={selectedDate} onClose={() => setAdd(false)} />}
      {browse && <PhotoBrowser onClose={() => setBrowse(false)} />}
      {selected && <PhotoViewer photos={ordered} selectedId={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

export function MealPhotoAction({ date, slot }: { date: string; slot: MealSlotId }) {
  const { settings } = useSettings();
  const j = useJournalText();
  const [open, setOpen] = useState(false);
  if (!settings.photoDiaryInToday) return null;
  return (
    <>
      <button
        type="button"
        className="journal-icon-button journal-meal-camera"
        aria-label={j('Photograph this meal', 'Fotografa questo pasto')}
        title={j('Photograph this meal', 'Fotografa questo pasto')}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <Camera size={16} />
      </button>
      {open && <PhotoComposer initialDate={date} initialSlot={slot} onClose={() => setOpen(false)} />}
    </>
  );
}

export function MealPhotos({ date, slot }: { date: string; slot: MealSlotId }) {
  const { settings } = useSettings();
  const matching = usePhotosForSlot(date, slot);
  const [selected, setSelected] = useState<string | null>(null);
  if (!settings.photoDiaryInToday || !matching.length) return null;
  return (
    <>
      <div className="journal-meal-photos">
        {matching.map((p) => (
          <button type="button" key={p.id} onClick={() => setSelected(p.id)}>
            <StoredImage src={p.src} alt="" decoding="async" />
            <span>{p.note}</span>
            <ChevronRight size={14} />
          </button>
        ))}
      </div>
      {selected && <PhotoViewer photos={matching} selectedId={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

export function LibraryPhoto({
  linkedId,
  title,
  slot = 'lunch',
}: {
  linkedId: string;
  title: string;
  slot?: MealSlotId;
}) {
  const { settings, language } = useSettings();
  const { selectedDate } = useUiState();
  const matching = usePhotosForLinked(linkedId);
  const j = useJournalText();
  const [add, setAdd] = useState(false);
  const [view, setView] = useState(false);
  if (settings.hideCustomFields.photos) return null;
  return (
    <div className="journal-library-photo">
      {matching.length ? (
        <button type="button" onClick={() => setView(true)} title={j('View photo', 'Vedi foto')} aria-label={j('View photo', 'Vedi foto')}>
          <StoredImage src={matching[0].src} alt={matching[0].note} decoding="async" />
          <span>
            <Camera size={13} />
            <span className={settings.ultraMinimal ? 'sr-only' : ''}>{j('View photo', 'Vedi foto')}</span>
          </span>
        </button>
      ) : (
        <button type="button" className="journal-attach-photo" onClick={() => setAdd(true)} title={j('Add a photo', 'Aggiungi una foto')} aria-label={j('Add a photo', 'Aggiungi una foto')}>
          <Camera size={13} />
          <span className={settings.ultraMinimal ? 'sr-only' : ''}>{j('Add a photo', 'Aggiungi una foto')}</span>
        </button>
      )}
      {add && (
        <PhotoComposer
          initialDate={selectedDate}
          initialSlot={slot}
          linkedId={linkedId}
          initialNote={`${title}, ${journalDate(selectedDate, language, { day: 'numeric', month: 'short', year: 'numeric' })}`}
          onClose={() => setAdd(false)}
        />
      )}
      {view && <PhotoViewer photos={matching} selectedId={matching[0].id} onClose={() => setView(false)} />}
    </div>
  );
}

/** Module-scope <img> that resolves `idb:` references to the stored blob (item 10: never defined inside a parent). */
function StoredImage({ src, ...rest }: { src: string } & Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'>) {
  const resolved = usePhotoSrc(src);
  return resolved ? <img {...rest} src={resolved} /> : <span className="journal-photo-pending" aria-hidden="true" />;
}

/** Photos are stored as blobs, so there is no 350 kB string budget any more: 1600 px, JPEG, about 1 MB at most. */
const MAX_EDGE = 1600;
const TARGET_BYTES = 1_000_000;

const canvasBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas'))), 'image/jpeg', quality));

async function encodeCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  let quality = 0.85;
  let blob = await canvasBlob(canvas, quality);
  while (blob.size > TARGET_BYTES && quality > 0.5) {
    quality -= 0.1;
    blob = await canvasBlob(canvas, quality);
  }
  return blob;
}

async function imageBlob(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.size > 25 * 1024 * 1024)
    throw new Error('image');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await encodeCanvas(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function PhotoComposer({
  initialDate,
  initialSlot = 'lunch',
  linkedId,
  initialNote = '',
  onClose,
}: {
  initialDate: string;
  initialSlot?: MealSlotId;
  linkedId?: string;
  initialNote?: string;
  onClose: () => void;
}) {
  const { language } = useSettings();
  const { label } = useMealSlots();
  const j = useJournalText();
  const formId = useId();
  const [date, setDate] = useState(initialDate);
  const [slot, setSlot] = useState(initialSlot);
  const [note, setNote] = useState(initialNote);
  // The chosen picture: the blob that will be stored and an object URL for the preview.
  const [picked, setPicked] = useState<{ blob: Blob; url: string } | null>(null);
  const pickedRef = useRef(picked);
  pickedRef.current = picked;
  const src = picked?.url ?? '';
  const setBlob = (blob: Blob | null) => {
    if (pickedRef.current) URL.revokeObjectURL(pickedRef.current.url);
    setPicked(blob ? { blob, url: URL.createObjectURL(blob) } : null);
  };
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nativeCameraRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (pickedRef.current) URL.revokeObjectURL(pickedRef.current.url);
    };
  }, []);
  useEffect(() => {
    if (stream && cameraRef.current) cameraRef.current.srcObject = stream;
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, [stream]);
  const choose = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const result = await imageBlob(file);
      if (mounted.current) setBlob(result);
    } catch {
      if (mounted.current)
        setError(
          j(
            'Choose a supported image under 25 MB (JPG, PNG or WebP).',
            "Scegli un'immagine JPG, PNG o WebP sotto 25 MB.",
          ),
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia || /Android|iPhone|iPad/i.test(navigator.userAgent)) {
      nativeCameraRef.current?.click();
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      if (!mounted.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      setStream(media);
      setError('');
    } catch {
      setError(
        j(
          'Camera access is unavailable. Allow camera permission or choose a photo instead.',
          "Fotocamera non disponibile. Consenti l'accesso o scegli una foto.",
        ),
      );
    }
  };
  const capture = async () => {
    const video = cameraRef.current;
    if (!video?.videoWidth) return;
    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      const blob = await encodeCanvas(canvas);
      if (mounted.current) setBlob(blob);
    } catch {
      if (mounted.current) setError(j('Could not capture the photo. Try again.', 'Impossibile scattare la foto. Riprova.'));
    }
    setStream(null);
  };
  const defaultNote = `${label(slot)}, ${journalDate(date, language, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={j('A meal to remember', 'Un pasto da ricordare')}
      maxWidth="max-w-lg"
      footer={
        // Always visible under the scrolling form, as wide as the pop-up fields.
        <button type="submit" form={formId} className="journal-primary-button journal-footer-button" disabled={busy}>
          <Check size={17} />
          {j('Save photo', 'Salva foto')}
        </button>
      }
    >
      <form
        id={formId}
        className="journal-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (busy) return;
          if (!src) {
            setError(j('Choose or take a photo first.', 'Scegli o scatta prima una foto.'));
            return;
          }
          if (!date) {
            setError(j('Choose a date first.', 'Scegli prima una data.'));
            return;
          }
          const blob = picked?.blob;
          if (!blob) return;
          setBusy(true);
          addMealPhoto(
            { id: journalId(), date, slot, note: note.trim() || defaultNote, linkedId, createdAt: new Date().toISOString() },
            blob,
          ).then(onClose, (failure) => {
            if (!mounted.current) return;
            setBusy(false);
            setError(
              classifyStorageError(failure) === 'quota'
                ? j(
                    'Your device storage is full. Export a backup, then remove older photos and try again.',
                    'Memoria piena. Esporta un backup, rimuovi vecchie foto e riprova.',
                  )
                : j('The photo could not be saved. Try again.', 'Impossibile salvare la foto. Riprova.'),
            );
          });
        }}
      >
        <div className="journal-photo-controls">
          <JournalDateField value={date} onChange={setDate} label={j('Photo date', 'Data foto')} />
          <JournalMealSelect value={slot} onChange={setSlot} />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label={j('Choose meal photo', 'Scegli foto del pasto')}
          onChange={(e) => {
            void choose(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <input
          ref={nativeCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label={j('Take meal photo', 'Scatta foto del pasto')}
          onChange={(e) => {
            void choose(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {stream ? (
          <div className="journal-camera-preview">
            <video ref={cameraRef} autoPlay playsInline muted />
            <div>
              <button type="button" className="journal-secondary-button" onClick={() => setStream(null)}>
                <X size={16} />
                {j('Cancel', 'Annulla')}
              </button>
              <button type="button" className="journal-primary-button" onClick={() => void capture()}>
                <Camera size={17} />
                {j('Capture', 'Scatta')}
              </button>
            </div>
          </div>
        ) : src ? (
          <div className="journal-photo-selected">
            <img src={src} alt={j('Meal photo preview', 'Anteprima foto del pasto')} />
            <button type="button" className="journal-secondary-button" onClick={() => setBlob(null)}>
              {j('Choose another', "Scegli un'altra foto")}
            </button>
          </div>
        ) : (
          <div className="journal-photo-dropzone">
            <span>
              <Camera size={30} />
            </span>
            <h3>
              {busy
                ? j('Getting your photo ready...', 'Preparazione della foto...')
                : j("What's on your plate?", "Cosa c'e nel tuo piatto?")}
            </h3>
            <p>
              {j('A little snapshot of your food story.', 'Un piccolo ricordo della tua storia a tavola.')}
            </p>
            <div>
              <button
                disabled={busy}
                type="button"
                className="journal-primary-button"
                onClick={() => void startCamera()}
              >
                <Camera size={16} />
                {j('Take a photo', 'Scatta una foto')}
              </button>
              <button
                disabled={busy}
                type="button"
                className="journal-secondary-button"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={15} />
                {j('Choose photo', 'Scegli foto')}
              </button>
            </div>
          </div>
        )}
        <label>
          {j('A little note (optional)', 'Una nota (facoltativa)')}
          <textarea
            rows={2}
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
            placeholder={defaultNote}
          />
          <small>
            {j(
              'Leave it blank to use the meal name and date.',
              'Lascia vuoto per usare il nome del pasto e la data.',
            )}
          </small>
        </label>
        {error && (
          <p role="alert" className="journal-error">
            {error}
          </p>
        )}
        <span className="journal-private-label">
          <LockKeyhole size={13} />
          {j('Saved on this device only', 'Salvata solo su questo dispositivo')}
        </span>
      </form>
    </Modal>
  );
}

function PhotoBrowser({ onClose }: { onClose: () => void }) {
  const { photos } = useMealJournal();
  const { options } = useMealSlots();
  const { language } = useSettings();
  const j = useJournalText();
  const [query, setQuery] = useState('');
  const [slot, setSlot] = useState('');
  // Time range: both ends are optional ("from" only = since that day, "to" only = up to that day).
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [limit, setLimit] = useState(24);
  const lo = from && to && from > to ? to : from;
  const hi = from && to && from > to ? from : to;
  const today = getTodayDateString();
  const presets: { id: string; label: string; days: number }[] = [
    { id: '7', label: j('7 days', '7 giorni'), days: 6 },
    { id: '30', label: j('30 days', '30 giorni'), days: 29 },
    { id: '90', label: j('3 months', '3 mesi'), days: 89 },
    { id: '365', label: j('1 year', '1 anno'), days: 364 },
  ];
  const activePreset = presets.find((preset) => to === today && from === addDaysToDateString(today, -preset.days))?.id;
  const matching = useMemo(() => {
    const q = query.toLowerCase();
    return photos
      .filter(
        (p) =>
          (!q || p.note.toLowerCase().includes(q)) &&
          (!slot || p.slot === slot) &&
          (!lo || p.date >= lo) &&
          (!hi || p.date <= hi),
      )
      .sort((a, b) =>
        b.date < a.date ? -1 : b.date > a.date ? 1 : b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0,
      );
  }, [photos, query, slot, lo, hi]);
  const visible = useMemo(() => matching.slice(0, limit), [matching, limit]);
  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={j('Your photo diary', 'Il tuo diario fotografico')}
        maxWidth="max-w-3xl"
      >
        <div className="journal-form">
          {/* Search and date fields are as wide as the pop-up. */}
          <div className="journal-gallery-search">
            <JournalSearch
              value={query}
              onChange={setQuery}
              placeholder={j('Find a photo by its note...', 'Cerca una foto dalla sua nota...')}
            />
          </div>
          {/* Time range: from / to date bars plus quick ranges. */}
          <div className="journal-range" data-photo-range>
            <JournalDateField
              variant="bar"
              value={from}
              onChange={setFrom}
              onClear={() => setFrom('')}
              label={j('Show photos from', 'Mostra foto dal')}
              emptyLabel={j('From: any date', 'Dal: qualsiasi data')}
            />
            <JournalDateField
              variant="bar"
              value={to}
              onChange={setTo}
              onClear={() => setTo('')}
              label={j('Show photos until', 'Mostra foto fino al')}
              emptyLabel={j('To: any date', 'Al: qualsiasi data')}
            />
          </div>
          <div className="journal-slot-picker" role="group" aria-label={j('Quick time ranges', 'Intervalli rapidi')}>
            <button type="button" aria-pressed={!from && !to} className={!from && !to ? 'is-selected' : ''} onClick={() => { setFrom(''); setTo(''); }}>
              {j('All time', 'Sempre')}
            </button>
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={activePreset === preset.id}
                className={activePreset === preset.id ? 'is-selected' : ''}
                onClick={() => { setTo(today); setFrom(addDaysToDateString(today, -preset.days)); }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <p className="journal-result-count" aria-live="polite">
            {j(`${matching.length} of ${photos.length} photos`, `${matching.length} di ${photos.length} foto`)}
          </p>
          <div className="journal-slot-picker"><button type="button" aria-pressed={!slot} className={!slot ? 'is-selected' : ''} onClick={() => setSlot('')}>{j('All meals', 'Tutti i pasti')}</button>{options.map((meal) => <button type="button" key={meal.id} aria-pressed={slot === meal.id} className={slot === meal.id ? 'is-selected' : ''} onClick={() => setSlot(meal.id)}><MealSlotIcon slot={meal.id} size={16} />{meal.label}</button>)}</div>
          <div className="journal-full-photo-grid">
            {visible.map((photo) => (
              <button
                type="button"
                className="journal-photo-preview"
                key={photo.id}
                onClick={() => setSelected(photo.id)}
              >
                <span>
                  <StoredImage src={photo.src} alt={photo.note} loading="lazy" decoding="async" />
                </span>
                <strong>{photo.note}</strong>
                <small>{journalDate(photo.date, language)}</small>
              </button>
            ))}
          </div>
          {matching.length > limit && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                className="journal-secondary-button"
                onClick={() => setLimit((prev) => prev + 24)}
              >
                {j(`Show more (${matching.length - limit} left)`, `Mostra altri (${matching.length - limit} rimasti)`)}
              </button>
            </div>
          )}
          {!matching.length && (
            <JournalEmpty>
              {j(
                'No snapshots here yet. Try another search or add a photo.',
                "Nessuna foto. Prova un'altra ricerca o aggiungi una foto.",
              )}
            </JournalEmpty>
          )}
        </div>
      </Modal>
      {selected && <PhotoViewer photos={matching} selectedId={selected} onClose={() => setSelected(null)} onLeave={onClose} />}
    </>
  );
}

function PhotoViewer({
  photos,
  selectedId,
  onClose,
  onLeave,
}: {
  photos: MealPhoto[];
  selectedId: string;
  onClose: () => void;
  /** Closes the parents of the viewer (e.g. the gallery) when the user jumps to the meal. */
  onLeave?: () => void;
}) {
  const { setSelectedDate } = useUiState();
  const { setActiveTab } = useNavActions();
  const [id, setId] = useState(selectedId);
  const index = photos.findIndex((p) => p.id === id);
  const photo = photos[index];
  const { language } = useSettings();
  const { label } = useMealSlots();
  const j = useJournalText();
  const [note, setNote] = useState(photo?.note || '');
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setNote(photo?.note || '');
    setSaved(false);
  }, [id, photo?.note]);
  useEffect(() => {
    setId(selectedId);
  }, [selectedId]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input,textarea,select')) return;
      if (e.key === 'ArrowRight' && photos[index + 1]) setId(photos[index + 1].id);
      if (e.key === 'ArrowLeft' && photos[index - 1]) setId(photos[index - 1].id);
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [photos, index]);
  if (!photo) return null;
  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={photo.note}
        subtitle={`${label(photo.slot)}, ${journalDate(photo.date, language, { day: 'numeric', month: 'long', year: 'numeric' })}`}
        maxWidth="max-w-2xl"
      >
        <div className="journal-form">
          <div className="journal-lightbox">
            <StoredImage src={photo.src} alt={photo.note} />
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  className="journal-photo-prev"
                  disabled={index <= 0}
                  aria-label={j('Previous photo', 'Foto precedente')}
                  onClick={() => setId(photos[index - 1].id)}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="journal-photo-next"
                  disabled={index >= photos.length - 1}
                  aria-label={j('Next photo', 'Foto successiva')}
                  onClick={() => setId(photos[index + 1].id)}
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>
          <label>
            {j('Photo note', 'Nota della foto')}
            <textarea
              value={note}
              maxLength={1000}
              rows={2}
              onChange={(e) => {
                setNote(e.target.value);
                setSaved(false);
              }}
            />
          </label>
          <button
            type="button"
            className="journal-secondary-button journal-go-to-meal"
            onClick={() => {
              // A picture attached to a saved meal / recipe opens it on Custom; every other picture opens its
              // meal on Today, on the day it was taken.
              if (photo.linkedId) {
                setActiveTab('prebuilt');
                revealLibraryItem(photo.linkedId);
              } else {
                setSelectedDate(photo.date);
                setActiveTab('today');
                revealMealSlot(photo.slot);
              }
              onClose();
              onLeave?.();
            }}
          >
            <ArrowUpRight size={15} />
            {photo.linkedId ? j('Go to the meal or recipe', 'Vai al pasto o ricetta') : j('Go to the meal', 'Vai al pasto')}
          </button>
          {error && (
            <p role="alert" className="journal-error">
              {error}
            </p>
          )}
          <div className="journal-form-actions">
            <button type="button" className="journal-danger-button" onClick={() => setConfirm(true)}>
              <Trash2 size={15} />
              {j('Delete photo', 'Elimina foto')}
            </button>
            <button
              type="button"
              className="journal-primary-button"
              onClick={() => {
                try {
                  saveMealPhoto({
                    ...photo,
                    note: note.trim() || `${label(photo.slot)}, ${journalDate(photo.date, language)}`,
                  });
                  setSaved(true);
                } catch {
                  setError(j('Not enough storage to save this change.', 'Spazio insufficiente per salvare.'));
                }
              }}
            >
              <Check size={16} />
              {saved ? j('Saved', 'Salvato') : j('Save note', 'Salva nota')}
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirm}
        message={j(
          'Delete this photo from your device? This cannot be undone.',
          'Eliminare la foto dal dispositivo? Non puoi annullare questa azione.',
        )}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          removeMealPhoto(photo.id);
          onClose();
        }}
      />
    </>
  );
}
