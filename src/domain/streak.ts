// Daily streak with Streak Freeze support.
import type { StreakState } from './types';
import { daysBetween } from './util';

/** Questions needed in a day for it to count toward the streak. */
export const STREAK_MIN_QUESTIONS = 5;
export const MAX_FREEZES = 2;

export function emptyStreak(): StreakState {
  return { current: 0, longest: 0, lastDay: null, freezes: 0, freezesUsed: 0 };
}

/**
 * Register that `today` qualified as a study day.
 * Missed days are covered by freezes if there are enough of them; otherwise
 * the streak restarts at 1.
 */
export function registerStudyDay(s: StreakState, today: string): StreakState {
  if (s.lastDay === today) return s;
  let current = 1;
  let freezes = s.freezes;
  let freezesUsed = s.freezesUsed;
  if (s.lastDay) {
    const gap = daysBetween(s.lastDay, today);
    if (gap <= 0) return s; // clock went backwards; ignore
    const missed = gap - 1;
    if (missed === 0) current = s.current + 1;
    else if (missed <= freezes) {
      current = s.current + 1;
      freezes -= missed;
      freezesUsed += missed;
    }
  }
  return { current, longest: Math.max(s.longest, current), lastDay: today, freezes, freezesUsed };
}

/** Streak as it should be displayed today (0 if it already broke). */
export function effectiveStreak(s: StreakState, today: string): number {
  if (!s.lastDay) return 0;
  const gap = daysBetween(s.lastDay, today);
  if (gap <= 1) return s.current;
  return gap - 1 <= s.freezes ? s.current : 0;
}

/** True when the user hasn't studied today but the streak is still alive. */
export function streakAtRisk(s: StreakState, today: string): boolean {
  return s.lastDay !== today && effectiveStreak(s, today) > 0;
}

export function buyFreeze(s: StreakState): StreakState {
  if (s.freezes >= MAX_FREEZES) return s;
  return { ...s, freezes: s.freezes + 1 };
}

export const STREAK_MILESTONES = [1, 2, 3, 7, 14, 30, 50, 100];
