// Readiness: decides when the full simulation unlocks. Never by level alone.
import type { AnswerRecord, Profile, Progress, Skill } from './types';
import { TARGET_MS, estimatedScore } from './scoring';
import { addDays, dayKey } from './util';

export interface Readiness {
  vocabulary: number;
  grammar: number;
  reading: number;
  restatement: number;
  speed: number;
  consistency: number;
  overall: number;
  answered: number;
  estimated: number;
  simulationUnlocked: boolean;
  examReady: boolean;
  missing: string[];
}

export const SIM_REQUIREMENTS = {
  minAnswers: 120,
  minOverall: 70,
  minComponent: 55,
};

export const READY_REQUIREMENTS = {
  minOverall: 85,
  minComponent: 75,
};

const W: Record<number, number> = { 1: 0.6, 2: 1, 3: 1.4, 4: 1.8 };

/** Difficulty-weighted accuracy of the last `n` answers in a skill (0–100). */
export function skillAccuracy(answers: AnswerRecord[], skill: Skill, n = 40): number {
  const rel = answers.filter((a) => a.skill === skill).slice(-n);
  if (!rel.length) return 0;
  let num = 0;
  let den = 0;
  for (const a of rel) {
    const w = W[a.difficulty];
    den += w;
    if (a.correct) num += w;
  }
  // Credibility: shrink toward 0 until there's enough evidence.
  const cred = Math.min(1, rel.length / 15);
  return Math.round((num / den) * 100 * cred);
}

/** Share of recent answers that were correct AND within the target time (0–100). */
export function speedScore(answers: AnswerRecord[], n = 50): number {
  const rel = answers.slice(-n);
  if (rel.length < 5) return 0;
  const ok = rel.filter((a) => a.correct && a.ms <= (TARGET_MS[a.type] ?? 30_000)).length;
  return Math.round((ok / rel.length) * 100 * Math.min(1, rel.length / 20));
}

/** Studied days in the last 14 vs. planned days (0–100). */
export function consistencyScore(progress: Progress, profile: Profile | null, today = dayKey()): number {
  const planned = Math.max(1, (profile?.daysPerWeek ?? 5) * 2);
  let studied = 0;
  for (let i = 0; i < 14; i++) if ((progress.days[addDays(today, -i)]?.questions ?? 0) >= 5) studied++;
  return Math.min(100, Math.round((studied / planned) * 100));
}

export function computeReadiness(
  answers: AnswerRecord[],
  progress: Progress,
  profile: Profile | null,
  today = dayKey(),
): Readiness {
  const vocabulary = skillAccuracy(answers, 'vocabulary');
  const grammar = skillAccuracy(answers, 'grammar');
  const reading = skillAccuracy(answers, 'reading');
  const restatement = skillAccuracy(answers, 'restatement');
  const speed = speedScore(answers);
  const consistency = consistencyScore(progress, profile, today);
  const overall = Math.round(
    vocabulary * 0.25 + reading * 0.22 + restatement * 0.15 + grammar * 0.1 + speed * 0.14 + consistency * 0.14,
  );
  const comps = { vocabulary, grammar, reading, restatement, speed, consistency };
  const labels: Record<string, string> = {
    vocabulary: 'אוצר מילים',
    grammar: 'דקדוק',
    reading: 'הבנת הנקרא',
    restatement: 'ניסוח מחדש',
    speed: 'מהירות',
    consistency: 'התמדה',
  };
  const missing: string[] = [];
  if (answers.length < SIM_REQUIREMENTS.minAnswers)
    missing.push(`לענות על עוד ${SIM_REQUIREMENTS.minAnswers - answers.length} שאלות`);
  for (const [k, v] of Object.entries(comps))
    if (v < SIM_REQUIREMENTS.minComponent) missing.push(`${labels[k]}: ${v}% (נדרש ${SIM_REQUIREMENTS.minComponent}%)`);
  if (overall < SIM_REQUIREMENTS.minOverall) missing.push(`מוכנות כללית: ${overall}% (נדרש ${SIM_REQUIREMENTS.minOverall}%)`);
  const simulationUnlocked = missing.length === 0;
  const examReady =
    simulationUnlocked &&
    overall >= READY_REQUIREMENTS.minOverall &&
    Object.values(comps).every((v) => v >= READY_REQUIREMENTS.minComponent);
  return {
    ...comps,
    overall,
    answered: answers.length,
    estimated: estimatedScore(progress.ability),
    simulationUnlocked,
    examReady,
    missing,
  };
}
