// Adaptive difficulty controller.
import type { Difficulty } from './types';
import { B } from './scoring';

export interface RecentResult {
  correct: boolean;
  ms: number;
  targetMs: number;
}

export const WINDOW = 5;

/**
 * Decide the next practice difficulty from the last WINDOW answers:
 *  - 5/5 correct and not slow → harder
 *  - ≤2/5 correct → easier
 *  - slow (avg time > 1.3× target) → stay, even on a perfect run
 */
export function nextDifficulty(current: Difficulty, recent: RecentResult[]): Difficulty {
  const w = recent.slice(-WINDOW);
  if (w.length < WINDOW) return current;
  const correct = w.filter((r) => r.correct).length;
  const slowRatio = w.reduce((s, r) => s + r.ms / r.targetMs, 0) / w.length;
  if (correct <= 2) return Math.max(1, current - 1) as Difficulty;
  if (correct === WINDOW && slowRatio <= 1.3) return Math.min(4, current + 1) as Difficulty;
  return current;
}

/** The tier that gives roughly a 60–70% success chance at this ability. */
export function difficultyForAbility(theta: number): Difficulty {
  const target = theta - 0.6; // slightly below ability → ~65% success
  let best: Difficulty = 1;
  let bestDist = Infinity;
  for (const d of [1, 2, 3, 4] as Difficulty[]) {
    const dist = Math.abs(B[d] - target);
    if (dist < bestDist) {
      best = d;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Blend of the ability-based tier and the streak-driven practice tier.
 * The practice tier reacts fast to runs; ability keeps it grounded.
 */
export function chooseDifficulty(theta: number, practiceLevel: Difficulty): Difficulty {
  const a = difficultyForAbility(theta);
  return Math.round((a + practiceLevel) / 2 + 0.01) as Difficulty;
}

/** Spread for a session: mostly target tier with some ±1 variety. */
export function sessionDifficulties(target: Difficulty, count: number, rand: () => number): Difficulty[] {
  const out: Difficulty[] = [];
  for (let i = 0; i < count; i++) {
    const r = rand();
    let d = target as number;
    if (r < 0.2) d -= 1;
    else if (r > 0.8) d += 1;
    out.push(Math.min(4, Math.max(1, d)) as Difficulty);
  }
  return out;
}
