import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { useFastingText } from '../../i18n/fasting';
import type { FastingMood, FastingNote } from '../../types/fasting';
import { addFastingNote, FASTING_MOODS, updateFastingNote } from '../../utils/fastingStore';

export const MOOD_TONE: Record<FastingMood, string> = {
  calm: 'bg-[#C9EFD3] text-[#17432A]',
  focused: 'bg-[#CFE7FE] text-[#183F66]',
  hungry: 'bg-[#F7E9AA] text-[#5D4911]',
  irritable: 'bg-[#FAE0B4] text-[#7D4E14]',
  angry: 'bg-[#F6D0D0] text-[#702D32]',
  tired: 'bg-[#E2D6FF] text-[#49346F]',
};

interface FastingNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  editingNote?: FastingNote | null;
}

export const FastingNoteModal: React.FC<FastingNoteModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  editingNote,
}) => {
  const ft = useFastingText();
  const [mood, setMood] = useState<FastingMood>('calm');
  const [hunger, setHunger] = useState<number>(2);
  const [text, setText] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingNote) {
      setMood(editingNote.mood);
      setHunger(editingNote.hunger);
      setText(editingNote.text);
    } else {
      setMood('calm');
      setHunger(2);
      setText('');
    }
  }, [isOpen, editingNote]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingNote) {
      updateFastingNote(editingNote.id, { mood, hunger, text });
    } else if (sessionId) {
      addFastingNote({ sessionId, mood, hunger, text });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingNote ? ft.notes.editNote : ft.notes.addTitle}
      maxWidth="max-w-md"
      dockId="fast-note"
      footer={
        <button
          type="submit"
          form="fasting-note-form"
          className="kc-fast-cta pressable w-full py-3 rounded-2xl bg-intake hover:bg-intake-hover text-intake-ink text-sm font-extrabold"
        >
          {ft.notes.save}
        </button>
      }
    >
      <form id="fasting-note-form" onSubmit={handleSave} className="space-y-4">
        <div>
          <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] mb-2">
            {ft.notes.mood}
          </span>
          <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={ft.notes.mood}>
            {FASTING_MOODS.map((m) => {
              const active = mood === m;
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={active}
                  data-fast-mood={active ? m : undefined}
                  onClick={() => setMood(m)}
                  className={`kc-fast-mood-btn pressable rounded-xl px-2.5 py-2 text-xs font-extrabold border transition-colors ${
                    active
                      ? `${MOOD_TONE[m]} border-current`
                      : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                  }`}
                >
                  {ft.moods[m]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
              {ft.notes.hunger}
            </span>
            <span className="text-xs font-extrabold text-[var(--text)] tabular-nums">{hunger} / 5</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5" role="group" aria-label={ft.notes.hunger}>
            {[1, 2, 3, 4, 5].map((level) => {
              const active = hunger === level;
              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={active}
                  data-active={active ? 'true' : undefined}
                  onClick={() => setHunger(level)}
                  className={`kc-fast-chip pressable py-2 rounded-xl text-sm font-extrabold border tabular-nums ${
                    active
                      ? 'bg-[#F7E9AA] text-[#5D4911] border-[#E7D889]'
                      : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                  }`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] mb-1.5">
            {ft.notes.noteLabel}
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={ft.notes.placeholder}
              className="kc-fast-input mt-1.5 w-full rounded-2xl bg-[var(--inset)] border border-[var(--border)] px-3 py-2.5 text-sm font-medium text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] focus-visible:outline-2 focus-visible:outline-[var(--muted)] focus-visible:outline-offset-1 resize-none normal-case tracking-normal"
            />
          </label>
        </div>
      </form>
    </Modal>
  );
};
