import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GameState } from '../domain/types';
import { repository } from './repository';
import { levelFromXp } from '../domain/levels';
import { ACHIEVEMENTS, newAchievements } from '../domain/achievements';
import { useUI } from './UIContext';

/** Unlock any achievement whose condition is already met (e.g. reached via onboarding or older data). */
function syncAchievements(s: GameState): GameState {
  const ids = newAchievements(s);
  if (!ids.length) return s;
  const now = new Date().toISOString();
  const achievements = { ...s.achievements };
  for (const id of ids) achievements[id] = now;
  return { ...s, achievements };
}

interface GameCtx {
  state: GameState;
  /** Apply a pure transition. Returns the new state. */
  update: (fn: (s: GameState) => GameState) => GameState;
  /** Always-current state (for callbacks that outlive a render). */
  getState: () => GameState;
  resetAll: () => void;
  importState: (json: string) => void;
  exportState: () => string;
}

const Ctx = createContext<GameCtx | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(() => {
    const loaded = repository.load();
    const synced = syncAchievements(loaded);
    if (synced !== loaded) repository.save(synced, loaded);
    return synced;
  });
  const ref = useRef(state);
  const ui = useUI();

  const update = useCallback(
    (fn: (s: GameState) => GameState) => {
      const prev = ref.current;
      const changed = fn(prev);
      if (changed === prev) return prev;
      const next = syncAchievements(changed);
      ref.current = next;
      repository.save(next, prev);
      setState(next);
      // global celebrations: level-ups and achievements
      const lvPrev = levelFromXp(prev.progress.xp).level;
      const lvNext = levelFromXp(next.progress.xp).level;
      if (lvNext > lvPrev) ui.levelUp(lvNext);
      for (const a of ACHIEVEMENTS) {
        if (next.achievements[a.id] && !prev.achievements[a.id]) ui.toast(`${a.emoji} הישג חדש: ${a.title}`, 'achievement');
      }
      return next;
    },
    [ui],
  );

  const value = useMemo<GameCtx>(
    () => ({
      state,
      update,
      getState: () => ref.current,
      resetAll: () => {
        repository.reset();
        const fresh = repository.load();
        ref.current = fresh;
        setState(fresh);
      },
      importState: (json: string) => {
        const loaded = repository.importAll(json);
        ref.current = loaded;
        setState(loaded);
      },
      exportState: () => repository.exportAll(),
    }),
    [state, update],
  );

  // keep in sync if another tab changes storage
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('lvl100:')) {
        const s = repository.load();
        ref.current = s;
        setState(s);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useGame outside provider');
  return c;
}
