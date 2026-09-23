// Spaced repetition (SM-2 inspired) for vocabulary.
import type { UserWord } from './types';
import { addDays, daysBetween } from './util';

/** 0 = wrong, 1 = right but "need practice", 2 = right, 3 = right + "I know this" */
export type Grade = 0 | 1 | 2 | 3;

export const WEAK_MISTAKES = 3;

export function newUserWord(wordId: string, today: string): UserWord {
  return { wordId, seen: 0, correct: 0, wrong: 0, streak: 0, ease: 2.5, interval: 0, due: today, lastSeen: today };
}

export function review(w: UserWord, grade: Grade, today: string): UserWord {
  const seen = w.seen + 1;
  if (grade === 0) {
    return {
      ...w,
      seen,
      wrong: w.wrong + 1,
      streak: 0,
      ease: Math.max(1.3, w.ease - 0.2),
      interval: 0,
      due: today, // comes back in the same session / today
      lastSeen: today,
      lastMistake: today,
    };
  }
  const streak = w.streak + 1;
  const ease = Math.min(3, Math.max(1.3, w.ease + (grade === 3 ? 0.15 : grade === 1 ? -0.15 : 0)));
  let interval: number;
  if (streak === 1) interval = grade === 3 ? 3 : 1;
  else if (streak === 2) interval = grade === 3 ? 7 : grade === 1 ? 2 : 3;
  else interval = Math.round(Math.max(1, w.interval) * ease * (grade === 1 ? 0.6 : grade === 3 ? 1.3 : 1));
  interval = Math.min(interval, 180);
  return { ...w, seen, correct: w.correct + 1, streak, ease, interval, due: addDays(today, interval), lastSeen: today };
}

/** 0–100 mastery estimate from accuracy and memory strength. */
export function mastery(w: UserWord | undefined): number {
  if (!w || w.seen === 0) return 0;
  const acc = w.correct / w.seen;
  const strength = Math.min(1, w.interval / 21);
  return Math.round(100 * (0.45 * acc + 0.55 * strength));
}

export function accuracy(w: UserWord): number {
  return w.seen ? Math.round((w.correct / w.seen) * 100) : 0;
}

export function isWeak(w: UserWord): boolean {
  return w.wrong >= WEAK_MISTAKES && mastery(w) < 70;
}

export function isLearned(w: UserWord): boolean {
  return w.correct >= 1 && w.streak >= 1;
}

export function isMastered(w: UserWord): boolean {
  return mastery(w) >= 80;
}

export function isDue(w: UserWord, today: string): boolean {
  return daysBetween(w.due, today) >= 0;
}

/** Weak words sorted hardest first. */
export function weakWords(vocab: Record<string, UserWord>): UserWord[] {
  return Object.values(vocab)
    .filter(isWeak)
    .sort((a, b) => b.wrong - b.correct - (a.wrong - a.correct) || mastery(a) - mastery(b));
}

/**
 * Pick words for a review session: overdue first (most overdue first),
 * then fill with new words from `pool` (already ordered by suitability).
 */
export function pickReviewWords(
  vocab: Record<string, UserWord>,
  pool: string[],
  today: string,
  count: number,
  maxNew = Math.ceil(count / 2),
): string[] {
  const due = Object.values(vocab)
    .filter((w) => isDue(w, today) && w.seen > 0)
    .sort((a, b) => daysBetween(b.due, today) - daysBetween(a.due, today) || mastery(a) - mastery(b))
    .map((w) => w.wordId);
  const picked = due.slice(0, count);
  let added = 0;
  for (const id of pool) {
    if (picked.length >= count || added >= maxNew) break;
    if (!vocab[id] || vocab[id].seen === 0) {
      picked.push(id);
      added++;
    }
  }
  // still short? top up with the weakest seen words
  if (picked.length < count) {
    const rest = Object.values(vocab)
      .filter((w) => !picked.includes(w.wordId) && w.seen > 0)
      .sort((a, b) => mastery(a) - mastery(b))
      .map((w) => w.wordId);
    picked.push(...rest.slice(0, count - picked.length));
  }
  return picked;
}

export function nextReviewLabel(w: UserWord | undefined, today: string): string {
  if (!w || w.seen === 0) return 'חדשה';
  const d = daysBetween(today, w.due);
  if (d <= 0) return 'היום';
  if (d === 1) return 'מחר';
  if (d < 7) return `בעוד ${d} ימים`;
  if (d < 30) return `בעוד ${Math.round(d / 7)} שבועות`;
  return `בעוד ${Math.round(d / 30)} חודשים`;
}
