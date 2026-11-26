import React from 'react';
import { Download, Share2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useJournalText } from '../../i18n/journal';
import { formatBytes } from '../../utils/planSharing';

interface SaveOrShareModalProps {
  /** File name shown under the title, e.g. `kakcal_report_2026-11-01_2026-11-26.pdf`. */
  filename: string;
  bytes: number;
  onSave: () => void;
  onShare: () => void;
  onClose: () => void;
}

/**
 * Asked after an export file (JSON backup, PDF, Excel, pictures ZIP) has been built, when sharing is possible:
 * save it on the device, or hand it to the share sheet (WhatsApp, email, Drive...). The file already exists, so the
 * Share tap is a fresh user gesture for `navigator.share` in the browser.
 */
export const SaveOrShareModal: React.FC<SaveOrShareModalProps> = ({ filename, bytes, onSave, onShare, onClose }) => {
  const j = useJournalText();
  const option = 'pressable w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left font-extrabold text-sm';
  return (
    <Modal isOpen onClose={onClose} title={j('Save or share?', 'Salvare o condividere?')} subtitle={`${filename} (${formatBytes(bytes)})`} maxWidth="max-w-sm">
      <div className="space-y-2">
        <button type="button" onClick={onShare} className={`${option} bg-[var(--text)] text-[var(--on-text)]`}>
          <Share2 size={18} className="shrink-0" />
          <span className="min-w-0">
            <span className="block">{j('Share…', 'Condividi…')}</span>
            <span className="block text-[11px] font-medium opacity-80">{j('Send it with WhatsApp, email, Drive…', 'Invialo con WhatsApp, email, Drive…')}</span>
          </span>
        </button>
        <button type="button" onClick={onSave} className={`${option} bg-[var(--inset)] border border-[var(--border)] text-[var(--text)]`}>
          <Download size={18} className="shrink-0" />
          <span className="min-w-0">
            <span className="block">{j('Save to device', 'Salva sul dispositivo')}</span>
            <span className="block text-[11px] font-medium text-[var(--muted)]">{j('Keep a copy on this device', 'Conserva una copia su questo dispositivo')}</span>
          </span>
        </button>
      </div>
    </Modal>
  );
};
