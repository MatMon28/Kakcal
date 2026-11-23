import { useRef, useState } from 'react';
import { Check, ChevronDown, Upload } from 'lucide-react';
import { useJournalText } from '../../i18n/journal';
import { TRACKER_ICONS, TrackerIcon } from './TrackerIcon';

export function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const j = useJournalText();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const upload = async (image?: File) => {
    if (!image) return;
    setError('');
    if (!/^image\/(png|jpeg|webp|gif)$/.test(image.type) || image.size > 2 * 1024 * 1024) {
      setError(j('Choose a PNG, JPG, WebP or GIF smaller than 2 MB.', 'Scegli PNG, JPG, WebP o GIF sotto 2 MB.'));
      return;
    }
    const url = URL.createObjectURL(image);
    try {
      const bitmap = new Image();
      bitmap.src = url;
      await bitmap.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 96;
      const scale = 96 / Math.max(bitmap.width, bitmap.height);
      canvas.getContext('2d')!.drawImage(bitmap, (96 - bitmap.width * scale) / 2, (96 - bitmap.height * scale) / 2, bitmap.width * scale, bitmap.height * scale);
      onChange(canvas.toDataURL('image/png'));
      setOpen(false);
    } catch { setError(j('This image could not be opened.', 'Impossibile aprire questa immagine.')); }
    finally { URL.revokeObjectURL(url); }
  };
  return (
    <div className="personal-icon-picker">
      <button type="button" className="personal-icon-trigger" aria-expanded={open} onClick={() => setOpen(!open)}>
        <TrackerIcon icon={value} size={20} /><span>{j('Choose an icon', 'Scegli icona')}</span><ChevronDown size={14} />
      </button>
      {open && <div className="personal-icon-options">
        <div className="personal-icon-grid">
          {TRACKER_ICONS.map((icon) => <button type="button" key={icon} aria-label={icon} aria-pressed={value === icon} className={value === icon ? 'is-selected' : ''} onClick={() => { onChange(icon); setOpen(false); }}>
            <TrackerIcon icon={icon} size={20} />{value === icon && <Check size={9} className="personal-icon-check" />}
          </button>)}
        </div>
        <button type="button" className="journal-secondary-button" onClick={() => file.current?.click()}><Upload size={15} />{j('Upload your own icon', 'Carica la tua icona')}</button>
        <p>{j('PNG, JPG, WebP or GIF. Up to 2 MB. Stays on your device.', 'PNG, JPG, WebP o GIF. Fino a 2 MB. Solo sul dispositivo.')}</p>
      </div>}
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" aria-label={j('Upload personalized icon', 'Carica icona personalizzata')} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
      {error && <p role="alert" className="journal-error">{error}</p>}
    </div>
  );
}