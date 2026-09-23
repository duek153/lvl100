// Placement test: adaptive per-answer, then MAP-scored per skill.
import type { Difficulty, SelfLevel, Skill } from './types';
import { estimateTheta, estimatedScore, SKILL_WEIGHTS } from './scoring';

export const SELF_LEVEL_THETA: Record<SelfLevel, number> = {
  zero: -2.2,
  beginner: -1.5,
  basic: -0.7,
  intermediate: 0,
  advanced: 1,
};

/** Placement blueprint: 20 questions. */
export const PLACEMENT_PLAN: Skill[] = [
  'vocabulary', 'grammar', 'vocabulary', 'grammar', 'vocabulary',
  'restatement', 'vocabulary', 'grammar', 'vocabulary', 'grammar',
  'vocabulary', 'restatement', 'vocabulary', 'grammar', 'vocabulary',
  'restatement', 'vocabulary', 'reading', 'reading', 'reading',
];

export function placementStartDifficulty(level: SelfLevel): Difficulty {
  return ({ zero: 1, beginner: 1, basic: 2, intermediate: 2, advanced: 3 } as const)[level];
}

/** Staircase: correct → up one tier, wrong → down one tier. */
export function placementNext(current: Difficulty, correct: boolean): Difficulty {
  return Math.min(4, Math.max(1, current + (correct ? 1 : -1))) as Difficulty;
}

export interface PlacementResponse {
  skill: Skill;
  difficulty: Difficulty;
  correct: boolean;
}

export interface PlacementResult {
  ability: Record<Skill, number>;
  score: number;
  strong: Skill[];
  weak: Skill[];
}

export function scorePlacement(responses: PlacementResponse[], selfLevel: SelfLevel): PlacementResult {
  const prior = SELF_LEVEL_THETA[selfLevel];
  const overall = estimateTheta(responses, prior, 1.5);
  const ability = {} as Record<Skill, number>;
  for (const skill of Object.keys(SKILL_WEIGHTS) as Skill[]) {
    const rs = responses.filter((r) => r.skill === skill);
    // per-skill estimate shrinks toward the overall estimate
    ability[skill] = rs.length ? estimateTheta(rs, overall, 0.8) : overall;
  }
  const sorted = (Object.keys(ability) as Skill[]).sort((a, b) => ability[b] - ability[a]);
  const spread = ability[sorted[0]] - ability[sorted[sorted.length - 1]];
  return {
    ability,
    score: estimatedScore(ability),
    strong: spread > 0.2 ? sorted.slice(0, 2).filter((s) => ability[s] >= overall) : [],
    weak: spread > 0.2 ? sorted.slice(-2).filter((s) => ability[s] < overall) : [],
  };
}
