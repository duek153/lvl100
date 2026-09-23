// Small label maps kept out of the (lazy) content packs.
import type { Skill } from '../domain/types';

export const GRAMMAR_LABELS: Record<string, string> = {
  tenses: 'Verb Tenses',
  agreement: 'Subject–Verb Agreement',
  articles: 'Articles',
  prepositions: 'Prepositions',
  pronouns: 'Pronouns',
  conditionals: 'Conditionals',
  modals: 'Modals',
  passive: 'Passive Voice',
  comparatives: 'Comparatives',
  conjunctions: 'Conjunctions',
  structure: 'Sentence Structure',
};

export const SKILL_HE: Record<Skill, string> = {
  vocabulary: 'אוצר מילים',
  grammar: 'דקדוק',
  reading: 'הבנת הנקרא',
  restatement: 'ניסוח מחדש',
};

export const SKILL_EN: Record<Skill, string> = {
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  reading: 'Reading',
  restatement: 'Restatements',
};

export const SKILL_EMOJI: Record<Skill, string> = {
  vocabulary: '📚',
  grammar: '🧩',
  reading: '📖',
  restatement: '🔁',
};
