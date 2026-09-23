// AmirNet simulation: section-level adaptivity and scoring.
import type { Difficulty } from './types';
import { B, estimateTheta, thetaToScore, SCORE_MAX } from './scoring';

export interface SimResponse {
  difficulty: Difficulty;
  correct: boolean; // unanswered counts as wrong (official rule)
  section: number;
}

/** Most informative tier for the current estimate (closest b to theta). */
export function tierForTheta(theta: number): Difficulty {
  let best: Difficulty = 2;
  let dist = Infinity;
  for (const d of [1, 2, 3, 4] as Difficulty[]) {
    const x = Math.abs(B[d] - theta);
    if (x < dist) {
      dist = x;
      best = d;
    }
  }
  return best;
}

/**
 * Tier for the next section. The first section is medium (official: "a
 * section made up of questions that are moderately difficult").
 */
export function nextSectionTier(responses: SimResponse[]): Difficulty {
  if (responses.length === 0) return 2;
  return tierForTheta(estimateTheta(responses, 0, 1.2));
}

/** Experimental section: wrong answers never lower the score, correct ones add up to 2 points. */
export function experimentalBonus(correct: number, total: number): number {
  if (total <= 0) return 0;
  const r = correct / total;
  if (r >= 0.75) return 2;
  if (r >= 0.5) return 1;
  return 0;
}

export interface SimResult {
  theta: number;
  baseScore: number;
  bonus: number;
  score: number;
  correct: number;
  total: number;
}

export function scoreSimulation(responses: SimResponse[], expCorrect = 0, expTotal = 0): SimResult {
  const theta = estimateTheta(responses, 0, 1.5);
  const baseScore = thetaToScore(theta);
  const bonus = experimentalBonus(expCorrect, expTotal);
  return {
    theta,
    baseScore,
    bonus,
    score: Math.min(SCORE_MAX, baseScore + bonus),
    correct: responses.filter((r) => r.correct).length,
    total: responses.length,
  };
}
