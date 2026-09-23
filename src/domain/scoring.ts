// Ability model (Rasch / Elo) and the internal AmirNet score estimate.
//
// IMPORTANT: this is an internal estimate. It is NOT calibrated against NITE
// scores and must always be presented as such.
import type { Difficulty, Skill } from './types';
import { clamp } from './util';

/** Item difficulty (logit) per difficulty tier. */
export const B: Record<Difficulty, number> = { 1: -1.5, 2: -0.5, 3: 0.5, 4: 1.5 };

export const SCORE_MIN = 50;
export const SCORE_MAX = 150;

export function pCorrect(theta: number, b: number): number {
  return 1 / (1 + Math.exp(-(theta - b)));
}

/** Learning-rate schedule: big steps early, stable later. */
export function kFactor(n: number): number {
  return Math.max(0.1, 0.6 / (1 + n / 20));
}

export function updateAbility(theta: number, n: number, difficulty: Difficulty, correct: boolean): number {
  const p = pCorrect(theta, B[difficulty]);
  return clamp(theta + kFactor(n) * ((correct ? 1 : 0) - p), -3, 3);
}

export function thetaToScore(theta: number): number {
  return Math.round(clamp(100 + 20 * theta, SCORE_MIN, SCORE_MAX));
}

export function scoreToTheta(score: number): number {
  return clamp((score - 100) / 20, -2.5, 2.5);
}

/**
 * Weights of each skill in the estimate. AmirNet's scored sections are
 * sentence completion (vocabulary), restatements and reading comprehension;
 * grammar is not a scored section on its own, so it only gets a small weight.
 */
export const SKILL_WEIGHTS: Record<Skill, number> = {
  vocabulary: 0.35,
  restatement: 0.25,
  reading: 0.3,
  grammar: 0.1,
};

export function overallTheta(ability: Record<Skill, number>): number {
  let sum = 0;
  let w = 0;
  for (const s of Object.keys(SKILL_WEIGHTS) as Skill[]) {
    sum += ability[s] * SKILL_WEIGHTS[s];
    w += SKILL_WEIGHTS[s];
  }
  return sum / w;
}

export function estimatedScore(ability: Record<Skill, number>): number {
  return thetaToScore(overallTheta(ability));
}

/** Per-skill estimate on the 50–150 scale. */
export function skillScore(theta: number): number {
  return thetaToScore(theta);
}

/**
 * MAP estimate of theta from a set of responses (Newton-Raphson with a
 * normal prior). Used for placement and simulation where we have a fixed
 * set of responses to score at once.
 */
export function estimateTheta(
  responses: { difficulty: Difficulty; correct: boolean }[],
  priorMean = 0,
  priorSd = 1.2,
): number {
  let theta = priorMean;
  const prec = 1 / (priorSd * priorSd);
  for (let iter = 0; iter < 30; iter++) {
    let grad = -(theta - priorMean) * prec;
    let hess = -prec;
    for (const r of responses) {
      const p = pCorrect(theta, B[r.difficulty]);
      grad += (r.correct ? 1 : 0) - p;
      hess -= p * (1 - p);
    }
    const step = grad / hess;
    theta -= step;
    theta = clamp(theta, -3, 3);
    if (Math.abs(step) < 1e-6) break;
  }
  return theta;
}

/** Target seconds per question type (drives speed metrics & bonus). */
export const TARGET_MS: Record<string, number> = {
  word_meaning: 12_000,
  word_reverse: 12_000,
  closest_meaning: 20_000,
  sentence_completion: 45_000,
  restatement: 90_000,
  grammar: 30_000,
  reading: 120_000,
};
