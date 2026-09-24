// Grammar topic mastery, shared by the grammar pages and achievements.
import type { AnswerRecord } from './types';

export const GRAMMAR_TOPIC_IDS = ['tenses', 'agreement', 'articles', 'prepositions', 'pronouns', 'conditionals', 'modals', 'passive', 'comparatives', 'conjunctions', 'structure'];

/** Difficulty-weighted accuracy over the last 15 answers in a topic (0–100). */
export function topicMastery(answers: AnswerRecord[], topic: string): { pct: number; n: number } {
  const all = answers.filter((a) => a.skill === 'grammar' && a.topic === topic);
  const rel = all.slice(-15);
  if (!rel.length) return { pct: 0, n: 0 };
  let num = 0;
  let den = 0;
  for (const a of rel) {
    den += a.difficulty;
    if (a.correct) num += a.difficulty;
  }
  return { pct: Math.round((num / den) * 100 * Math.min(1, rel.length / 8)), n: all.length };
}
