// XP rules. Centralised so the server can reuse the exact same numbers.
import type { Difficulty } from './types';

export const XP = {
  correct: 10,
  difficultyBonus: { 1: 0, 2: 0, 3: 5, 4: 10 } as Record<Difficulty, number>,
  speedBonus: 3,
  combo5: 25,
  combo10: 50,
  dailyQuest: 150,
  dailyChallengeMax: 120,
  boss: 200,
  progressTest: 250,
  simulation: 300,
  placement: 100,
  studyDay: 50,
  friendWin: 60,
  streakFreezeCost: 200,
} as const;

export interface AnswerXp {
  base: number;
  difficulty: number;
  speed: number;
  combo: number;
  total: number;
}

/**
 * XP for one answer. `combo` is the streak of correct answers *including*
 * this one. Speed bonus when answered within the target time.
 */
export function xpForAnswer(
  correct: boolean,
  difficulty: Difficulty,
  ms: number,
  targetMs: number,
  combo: number,
): AnswerXp {
  if (!correct) return { base: 0, difficulty: 0, speed: 0, combo: 0, total: 0 };
  const base = XP.correct;
  const diff = XP.difficultyBonus[difficulty];
  const speed = ms > 0 && ms <= targetMs ? XP.speedBonus : 0;
  let comboXp = 0;
  if (combo > 0 && combo % 10 === 0) comboXp = XP.combo10;
  else if (combo > 0 && combo % 5 === 0) comboXp = XP.combo5;
  return { base, difficulty: diff, speed, combo: comboXp, total: base + diff + speed + comboXp };
}

/** Daily challenge reward scales with accuracy, up to the max. */
export function dailyChallengeXp(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * XP.dailyChallengeMax);
}
