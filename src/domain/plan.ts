// Personal daily study plan, rebalanced toward weak skills.
import type { Skill } from './types';
import { overallTheta } from './scoring';

export interface PlanItem {
  key: 'vocabulary' | 'grammar' | 'reading' | 'restatement' | 'review';
  label: string;
  emoji: string;
  minutes: number;
}

const BASE: Record<PlanItem['key'], number> = {
  vocabulary: 0.3,
  grammar: 0.2,
  reading: 0.25,
  restatement: 0.12,
  review: 0.13,
};

const META: Record<PlanItem['key'], { label: string; emoji: string }> = {
  vocabulary: { label: 'Vocabulary', emoji: '📚' },
  grammar: { label: 'Grammar', emoji: '🧩' },
  reading: { label: 'Reading', emoji: '📖' },
  restatement: { label: 'Restatements', emoji: '🔁' },
  review: { label: 'Review', emoji: '🔄' },
};

export function dailyPlan(minutes: number, ability: Record<Skill, number>): PlanItem[] {
  const mean = overallTheta(ability);
  const weights = { ...BASE };
  for (const s of ['vocabulary', 'grammar', 'reading', 'restatement'] as Skill[]) {
    // weaker than average → more time (bounded)
    weights[s] *= Math.min(1.6, Math.max(0.6, 1 + (mean - ability[s]) * 0.4));
  }
  // very short sessions: skip restatements for beginners
  if (minutes <= 10 && ability.restatement < -1) weights.restatement = 0;
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const raw = (Object.keys(weights) as PlanItem['key'][]).map((k) => ({ k, m: (weights[k] / total) * minutes }));
  // largest-remainder rounding so parts sum exactly to `minutes`
  const floored = raw.map((r) => ({ ...r, f: Math.floor(r.m) }));
  let left = minutes - floored.reduce((s, r) => s + r.f, 0);
  [...floored].sort((a, b) => b.m - b.f - (a.m - a.f)).forEach((r) => {
    if (left > 0) {
      r.f++;
      left--;
    }
  });
  return floored.filter((r) => r.f > 0).map((r) => ({ key: r.k, minutes: r.f, ...META[r.k] }));
}

/** Days left until exam, or null. */
export function daysUntil(examDate: string | null, today: string): number | null {
  if (!examDate) return null;
  const a = new Date(today + 'T00:00:00');
  const b = new Date(examDate + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
