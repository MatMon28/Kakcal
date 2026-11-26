export type FastingProtocol = '16:8' | '18:6' | '20:4' | 'omad' | 'custom';

export type FastingMood = 'calm' | 'focused' | 'hungry' | 'irritable' | 'angry' | 'tired';

export interface FastingNote {
  id: string;
  sessionId: string;
  /** UTC ISO timestamp when the note was logged. */
  timestamp: string;
  /** Elapsed fasting duration in ms at the time of the note. */
  elapsedMs: number;
  mood: FastingMood;
  /** Hunger level from 1 (not hungry) to 5 (very hungry). */
  hunger: number;
  text: string;
}

export interface FastingSession {
  id: string;
  protocol: FastingProtocol;
  targetFastingHours: number;
  targetEatingHours: number;
  /** UTC ISO timestamp when the fast started. */
  startedAt: string;
  /** UTC ISO timestamp when the fast ended, or null while active. */
  endedAt: string | null;
}

export interface FastingConfig {
  enabled: boolean;
  protocol: FastingProtocol;
  customFastingHours: number;
  customEatingHours: number;
}

export interface FastingData {
  config: FastingConfig;
  activeSession: FastingSession | null;
  sessions: FastingSession[];
  notes: FastingNote[];
}

export interface FastingNotificationSettings {
  startFast: boolean;
  endFast: boolean;
  diary: boolean;
  diaryIntervalHours: number;
}
