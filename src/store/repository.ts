// Persistence boundary. The app only talks to `Repository`; swapping
// LocalStorageRepository for a SupabaseRepository leaves pages untouched.
import type { GameState } from '../domain/types';
import { initialState, emptyProgress, DEFAULT_SETTINGS } from '../services/game';

export interface Repository {
  load(): GameState;
  /** Persist only the slices that changed. */
  save(next: GameState, prev: GameState | null): void;
  reset(): void;
  exportAll(): string;
  importAll(json: string): GameState;
}

const PREFIX = 'lvl100:';
const VERSION = 1;

/** One storage key per "table" — mirrors the DB tables, no giant blob. */
const TABLES: (keyof GameState)[] = ['profile', 'progress', 'answers', 'vocab', 'attempts', 'achievements', 'settings', 'friends'];

/** Cap on stored answers so localStorage stays small (~5MB limit). */
const MAX_ANSWERS = 4000;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    /* quota exceeded / private mode — the app keeps working in memory */
  }
}

export class LocalStorageRepository implements Repository {
  load(): GameState {
    const base = initialState();
    const state: GameState = { ...base };
    for (const t of TABLES) {
      const raw = safeGet(t);
      if (!raw) continue;
      try {
        (state as unknown as Record<string, unknown>)[t] = JSON.parse(raw);
      } catch {
        /* corrupt slice → keep default */
      }
    }
    // forward-compatible merges for fields added later
    state.progress = { ...emptyProgress(), ...state.progress };
    state.settings = { ...DEFAULT_SETTINGS, ...state.settings, reminders: { ...DEFAULT_SETTINGS.reminders, ...state.settings?.reminders } };
    safeSet('version', String(VERSION));
    return state;
  }

  save(next: GameState, prev: GameState | null) {
    for (const t of TABLES) {
      if (prev && prev[t] === next[t]) continue;
      let value: unknown = next[t];
      if (t === 'answers') value = (value as unknown[]).slice(-MAX_ANSWERS);
      safeSet(t, JSON.stringify(value));
    }
  }

  reset() {
    for (const t of TABLES) {
      try {
        localStorage.removeItem(PREFIX + t);
      } catch {
        /* ignore */
      }
    }
  }

  exportAll(): string {
    const out: Record<string, unknown> = { version: VERSION, exportedAt: new Date().toISOString() };
    for (const t of TABLES) {
      const raw = safeGet(t);
      out[t] = raw ? JSON.parse(raw) : null;
    }
    return JSON.stringify(out, null, 2);
  }

  importAll(json: string): GameState {
    const data = JSON.parse(json);
    for (const t of TABLES) if (data[t] !== undefined && data[t] !== null) safeSet(t, JSON.stringify(data[t]));
    return this.load();
  }
}

export const repository: Repository = new LocalStorageRepository();
