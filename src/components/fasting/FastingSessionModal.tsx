import React, { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useSettings } from '../../context/AppContext';
import { useFastingText } from '../../i18n/fasting';
import type { FastingNote, FastingProtocol, FastingSession } from '../../types/fasting';
import {
  computeFastTiming,
  FASTING_PROTOCOLS,
  formatDurationCompact,
  PROTOCOL_HOURS,
  removePastSession,
  updatePastSession,
} from '../../utils/fastingStore';
import { MOOD_TONE } from './FastingNoteModal';

export function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatSessionTimestamp(iso: string, lang: 'en' | 'it'): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString(lang === 'it' ? 'it-IT' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

interface FastingSessionModalProps {
  session: FastingSession | null;
  notes: FastingNote[];
  onClose: () => void;
}

export const FastingSessionModal: React.FC<FastingSessionModalProps> = ({ session, notes, onClose }) => {
  const { language, t } = useSettings();
  const ft = useFastingText();
  const [editing, setEditing] = useState(false);
  const [protocol, setProtocol] = useState<FastingProtocol>('16:8');
  const [customFastH, setCustomFastH] = useState(16);
  const [customEatH, setCustomEatH] = useState(8);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');

  const sessionNotes = useMemo(
    () => (session ? notes.filter((n) => n.sessionId === session.id).sort((a, b) => a.elapsedMs - b.elapsedMs) : []),
    [session, notes],
  );

  if (!session) return null;

  const timing = computeFastTiming(session);
  const pct = Math.min(100, Math.round(timing.progress * 100));
  const avgHunger = sessionNotes.length
    ? Math.round((sessionNotes.reduce((s, n) => s + n.hunger, 0) / sessionNotes.length) * 10) / 10
    : null;
  const peakHunger = sessionNotes.length ? Math.max(...sessionNotes.map((n) => n.hunger)) : null;

  const beginEdit = () => {
    setProtocol(session.protocol);
    setCustomFastH(session.targetFastingHours);
    setCustomEatH(session.targetEatingHours);
    setStartInput(toLocalDateTimeInput(session.startedAt));
    setEndInput(session.endedAt ? toLocalDateTimeInput(session.endedAt) : '');
    setEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const startMs = Date.parse(startInput);
    const endMs = Date.parse(endInput);
    const preset = protocol === 'custom' ? { fastingHours: customFastH, eatingHours: customEatH } : PROTOCOL_HOURS[protocol];
    updatePastSession(session.id, {
      protocol,
      targetFastingHours: preset.fastingHours,
      targetEatingHours: preset.eatingHours,
      ...(Number.isFinite(startMs) ? { startedAt: new Date(startMs).toISOString() } : {}),
      ...(Number.isFinite(endMs) ? { endedAt: new Date(endMs).toISOString() } : {}),
    });
    setEditing(false);
  };

  const handleDelete = () => {
    removePastSession(session.id);
    onClose();
  };

  const title = ft.history.sessionTitle.replace('{protocol}', ft.protocols[session.protocol]);
  const subtitle = `${formatSessionTimestamp(session.startedAt, language)} · ${
    timing.reached ? ft.history.completed : ft.history.incomplete
  }`;

  // Simple SVG curve for session notes
  const maxHr = Math.max(1, Math.ceil(timing.elapsedMs / 3_600_000), session.targetFastingHours);
  const W = 280;
  const H = 96;
  const PAD_X = 24;
  const PAD_Y = 12;
  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_Y * 2;
  const pts = sessionNotes.map((n) => ({
    x: PAD_X + Math.min(1, n.elapsedMs / (maxHr * 3_600_000)) * plotW,
    y: PAD_Y + (1 - (n.hunger - 1) / 4) * plotH,
    hunger: n.hunger,
  }));
  const poly = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <Modal
      isOpen={Boolean(session)}
      onClose={() => { setEditing(false); onClose(); }}
      onBack={editing ? () => setEditing(false) : undefined}
      title={title}
      subtitle={subtitle}
      maxWidth="max-w-md"
    >
      {editing ? (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] mb-2">
              {ft.timer.protocol}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {FASTING_PROTOCOLS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={protocol === p}
                  data-active={protocol === p ? 'true' : undefined}
                  onClick={() => setProtocol(p)}
                  className={`kc-fast-chip pressable px-3 py-1.5 rounded-full text-xs font-extrabold border ${
                    protocol === p
                      ? 'bg-[#F7E9AA] text-[#5D4911] border-[#E7D889]'
                      : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
                  }`}
                >
                  {ft.protocols[p]}
                </button>
              ))}
            </div>
          </div>

          {protocol === 'custom' && (
            <div className="grid grid-cols-2 gap-2.5">
              <label className="text-xs font-bold text-[var(--muted)] space-y-1">
                <span>{ft.timer.fastingHours}</span>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={customFastH}
                  onChange={(e) => setCustomFastH(Math.max(1, Math.min(168, Number(e.target.value) || 1)))}
                  className="kc-fast-input w-full rounded-xl bg-[var(--inset)] border border-[var(--border)] px-3 py-2 text-sm font-extrabold text-[var(--text)] tabular-nums"
                />
              </label>
              <label className="text-xs font-bold text-[var(--muted)] space-y-1">
                <span>{ft.timer.eatingHours}</span>
                <input
                  type="number"
                  min={1}
                  max={48}
                  value={customEatH}
                  onChange={(e) => setCustomEatH(Math.max(1, Math.min(48, Number(e.target.value) || 1)))}
                  className="kc-fast-input w-full rounded-xl bg-[var(--inset)] border border-[var(--border)] px-3 py-2 text-sm font-extrabold text-[var(--text)] tabular-nums"
                />
              </label>
            </div>
          )}

          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-[var(--muted)] space-y-1">
              <span>{ft.history.start}</span>
              <input
                type="datetime-local"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                className="kc-fast-input w-full rounded-xl bg-[var(--inset)] border border-[var(--border)] px-3 py-2 text-sm font-bold text-[var(--text)]"
              />
            </label>
            <label className="block text-xs font-bold text-[var(--muted)] space-y-1">
              <span>{ft.history.end}</span>
              <input
                type="datetime-local"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                className="kc-fast-input w-full rounded-xl bg-[var(--inset)] border border-[var(--border)] px-3 py-2 text-sm font-bold text-[var(--text)]"
              />
            </label>
          </div>

          <button
            type="submit"
            className="kc-fast-cta pressable w-full py-3 rounded-2xl bg-[#F7E9AA] hover:bg-[#F2E29A] text-[#5D4911] border border-[#E7D889] text-sm font-extrabold"
          >
            {ft.history.saveSession}
          </button>
        </form>
      ) : (
        <div className="space-y-3.5">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={beginEdit}
              className="kc-fast-chip pressable inline-flex items-center gap-1.5 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] px-3 py-1.5 text-xs font-extrabold text-[var(--text)]"
            >
              <Pencil size={13} aria-hidden="true" />
              <span>{ft.history.editSession}</span>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              data-fast-pill="danger"
              className="pressable inline-flex items-center gap-1.5 rounded-full bg-[#F6D0D0] text-[#7A2727] px-3 py-1.5 text-xs font-extrabold"
            >
              <Trash2 size={13} aria-hidden="true" />
              <span>{t.common.delete}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="kc-fast-subbox rounded-2xl bg-[var(--inset)] border border-[var(--border)] px-3 py-2.5">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                {ft.history.start}
              </div>
              <div className="text-xs font-extrabold text-[var(--text)] mt-0.5 tabular-nums">
                {formatSessionTimestamp(session.startedAt, language)}
              </div>
            </div>
            <div className="kc-fast-subbox rounded-2xl bg-[var(--inset)] border border-[var(--border)] px-3 py-2.5">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                {ft.history.end}
              </div>
              <div className="text-xs font-extrabold text-[var(--text)] mt-0.5 tabular-nums">
                {session.endedAt ? formatSessionTimestamp(session.endedAt, language) : '–'}
              </div>
            </div>
          </div>

          <div data-kc-tone="diary" className="rounded-2xl bg-[#F7E9AA] text-[#5D4911] p-3.5 space-y-2">
            <div data-kc-tone-ink className="flex items-baseline justify-between gap-2 text-xs font-extrabold tabular-nums">
              <span>
                {ft.history.targetProgress
                  .replace('{elapsed}', formatDurationCompact(timing.elapsedMs))
                  .replace('{target}', `${session.targetFastingHours}h 00m`)}
              </span>
              <span>{pct}%</span>
            </div>
            <div className="kc-fast-track h-2 w-full rounded-full bg-[#FCF4D6]/85 overflow-hidden">
              <div className="kc-fast-fill h-full rounded-full bg-[#8A6D1B]" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-[11px] font-bold opacity-80">
              {ft.history.eatingWindowLabel.replace('{hours}', String(session.targetEatingHours))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div data-kc-tone="meals" className="rounded-2xl bg-[#FAE0B4] text-[#7D4E14] px-3 py-2.5 text-center">
              <div data-kc-tone-ink className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">
                {ft.history.avgHunger}
              </div>
              <div className="text-lg font-extrabold tabular-nums mt-0.5">
                {avgHunger !== null ? `${avgHunger}/5` : '–'}
              </div>
            </div>
            <div data-kc-tone="diary" className="rounded-2xl bg-[#F7E9AA] text-[#5D4911] px-3 py-2.5 text-center">
              <div data-kc-tone-ink className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">
                {ft.history.peakHunger}
              </div>
              <div className="text-lg font-extrabold tabular-nums mt-0.5">
                {peakHunger !== null ? `${peakHunger}/5` : '–'}
              </div>
            </div>
          </div>

          {pts.length > 0 && (
            <div data-kc-tone="recipes" className="rounded-2xl bg-[#E2D6FF] text-[#49346F] p-3.5">
              <div className="text-xs font-extrabold mb-2" data-kc-tone-ink>
                {ft.history.sessionHungerCurve}
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24 overflow-visible" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((lv) => {
                  const y = PAD_Y + (1 - (lv - 1) / 4) * plotH;
                  return (
                    <g key={lv}>
                      <line x1={PAD_X} x2={W - PAD_X} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.18} strokeDasharray="3 3" />
                      <text x={6} y={y + 3} fontSize="9" fontWeight="700" fill="currentColor" opacity={0.65}>{lv}</text>
                    </g>
                  );
                })}
                {pts.length > 1 && (
                  <polyline fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={poly} />
                )}
                {pts.map((p, idx) => (
                  <circle key={idx} cx={p.x} cy={p.y} r="4" fill="currentColor" stroke="var(--surface)" strokeWidth="1.5" />
                ))}
              </svg>
            </div>
          )}

          {sessionNotes.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                {ft.history.sessionNotes.replace('{count}', String(sessionNotes.length))}
              </div>
              <div className="space-y-1.5">
                {sessionNotes.map((n) => (
                  <div key={n.id} className="kc-fast-row rounded-2xl bg-[var(--inset)] border border-[var(--border)] px-3 py-2 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold">
                      <span data-fast-pill="time" className="px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] tabular-nums">
                        {formatDurationCompact(n.elapsedMs)}
                      </span>
                      <span data-fast-pill="hunger" className="px-2 py-0.5 rounded-full bg-[#FAE0B4] text-[#7D4E14]">
                        {ft.notes.hungerBadge.replace('{value}', String(n.hunger))}
                      </span>
                      <span data-fast-mood={n.mood} className={`px-2 py-0.5 rounded-full ${MOOD_TONE[n.mood]}`}>
                        {ft.moods[n.mood]}
                      </span>
                    </div>
                    {n.text && <p className="text-xs font-medium text-[var(--text)]">{n.text}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
