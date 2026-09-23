// Session builders: turn a spec (boss, test, practice…) into questions.
import type { ContentBank } from '../domain/engine';
import { pickPassage, pickQuestions, wordQuestion, getQuestion } from '../domain/engine';
import type { Difficulty, GameState, Passage, Question, Skill } from '../domain/types';
import { chooseDifficulty } from '../domain/adaptive';
import { pickReviewWords, weakWords } from '../domain/srs';
import { dayKey, shuffle } from '../domain/util';
import type { BossSpec, ProgressTestSpec } from '../domain/road';

/** Word ids ordered by suitability for a learner at `tier` (new words first near their level). */
export function wordPool(bank: ContentBank, tier: Difficulty, rand: () => number = Math.random): string[] {
  return shuffle(bank.words, rand)
    .sort((a, b) => Math.abs(a.difficulty - tier) - Math.abs(b.difficulty - tier))
    .map((w) => w.id);
}

/** Adaptive "next question" for a practice session. */
export function practiceNext(bank: ContentBank, getState: () => GameState, skills: Skill[], opts: { topic?: string; challenge?: boolean } = {}) {
  let i = 0;
  return (used: Set<string>): Question | null => {
    const s = getState();
    const skill = skills[i++ % skills.length];
    let d = chooseDifficulty(s.progress.ability[skill], s.progress.practiceLevel[skill]);
    if (opts.challenge) d = Math.min(4, d + 1) as Difficulty;
    // vocabulary: half the time serve the SRS queue (due words first, then new)
    if (skill === 'vocabulary' && !opts.topic && Math.random() < 0.5) {
      const ids = pickReviewWords(s.vocab, wordPool(bank, d), dayKey(), 12).filter((id) => !used.has(`wm-${id}`) && !used.has(`wr-${id}`));
      const w = ids.length ? bank.wordById.get(ids[0]) : undefined;
      if (w) return wordQuestion(w, bank.words, Math.random() < 0.6 ? 'word_meaning' : 'word_reverse');
    }
    return (
      pickQuestions(bank, {
        skills: [skill],
        count: 1,
        difficulties: [d],
        history: s.answers,
        exclude: used,
        topics: opts.topic ? [opts.topic] : undefined,
      })[0] ?? null
    );
  };
}

export function srsSession(bank: ContentBank, s: GameState, count = 12): Question[] {
  const tier = chooseDifficulty(s.progress.ability.vocabulary, s.progress.practiceLevel.vocabulary);
  const ids = pickReviewWords(s.vocab, wordPool(bank, tier), dayKey(), count);
  return ids
    .map((id) => bank.wordById.get(id))
    .filter(Boolean)
    .map((w, i) => wordQuestion(w!, bank.words, i % 3 === 2 ? 'word_reverse' : 'word_meaning'));
}

export function weakSession(bank: ContentBank, s: GameState, count = 10): Question[] {
  const weak = weakWords(s.vocab).slice(0, count);
  return weak
    .map((w) => bank.wordById.get(w.wordId))
    .filter(Boolean)
    .map((w, i) => wordQuestion(w!, bank.words, i % 2 ? 'word_reverse' : 'word_meaning'));
}

export function questionsByIds(bank: ContentBank, ids: string[]): Question[] {
  return ids.map((id) => getQuestion(bank, id)).filter((q): q is Question => !!q);
}

/** Mixed fixed set with optional reading passages. */
export function mixedSet(
  bank: ContentBank,
  s: GameState,
  skills: Skill[],
  difficulty: Difficulty,
  count: number,
  readingCount: number,
): { questions: Question[]; passages: Passage[] } {
  const passages: Passage[] = [];
  const reading: Question[] = [];
  const used = new Set<string>();
  while (reading.length < readingCount) {
    const need = readingCount - reading.length;
    const p = pickPassage(bank, difficulty, s.answers, Math.random, Math.min(need, 5) >= 5 ? 5 : 3, used);
    if (!p) break;
    used.add(p.id);
    passages.push(p);
    reading.push(...p.questions.slice(0, need));
  }
  const others = skills.filter((k) => k !== 'reading');
  const rest = others.length
    ? pickQuestions(bank, { skills: others, count: count - reading.length, difficulties: [difficulty], history: s.answers, includeGenerated: false })
    : [];
  return { questions: [...rest, ...reading], passages };
}

export function bossSet(bank: ContentBank, s: GameState, spec: BossSpec) {
  const hasReading = spec.skills.includes('reading');
  const readingCount = !hasReading ? 0 : spec.skills.length === 1 ? spec.count : 5;
  return mixedSet(bank, s, spec.skills, spec.difficulty, spec.count, readingCount);
}

export function testSet(bank: ContentBank, s: GameState, spec: ProgressTestSpec) {
  return mixedSet(bank, s, ['vocabulary', 'grammar', 'restatement', 'reading'], spec.difficulty, spec.count, 3);
}

// ---- Friend challenges (shareable link, no backend needed) ----
export interface ChallengeCode {
  n: string; // challenger name
  a: string; // avatar
  ids: string[];
  c: number; // correct
  t: number; // ms
}

export function encodeChallenge(c: ChallengeCode): string {
  const json = JSON.stringify(c);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeChallenge(code: string): ChallengeCode | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    const c = JSON.parse(json);
    if (!Array.isArray(c.ids) || typeof c.c !== 'number') return null;
    return c;
  } catch {
    return null;
  }
}

/** Winner: more correct; tie → faster. */
export function challengeWinner(mine: { c: number; t: number }, theirs: { c: number; t: number }): 'me' | 'them' | 'tie' {
  if (mine.c !== theirs.c) return mine.c > theirs.c ? 'me' : 'them';
  if (mine.t !== theirs.t) return mine.t < theirs.t ? 'me' : 'them';
  return 'tie';
}
