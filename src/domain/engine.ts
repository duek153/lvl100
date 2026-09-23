// Question engine: builds sessions from the content bank.
import type { AnswerRecord, Difficulty, Passage, Question, Skill, Word } from './types';
import { hashString, rng, shuffle } from './util';
import { areSynonyms, heOverlap } from './synonyms';

export interface ContentBank {
  words: Word[];
  wordById: Map<string, Word>;
  questions: Question[]; // hand-written vocab / restatement / grammar
  passages: Passage[];
  byId: Map<string, Question>;
}

export function makeBank(words: Word[], questions: Question[], passages: Passage[]): ContentBank {
  const byId = new Map<string, Question>();
  for (const q of questions) byId.set(q.id, q);
  for (const p of passages) for (const q of p.questions) byId.set(q.id, q);
  return { words, wordById: new Map(words.map((w) => [w.id, w])), questions, passages, byId };
}

/**
 * Deterministic generated vocabulary question for a word. Distractors are
 * other words' meanings of the same part of speech (so they are
 * grammatically plausible but clearly different).
 */
export function wordQuestion(word: Word, words: Word[], kind: 'word_meaning' | 'word_reverse'): Question {
  const rand = rng(hashString(kind + word.id));
  const ok = (w: Word) => w.id !== word.id && !areSynonyms(w.en, word.en) && !heOverlap(w.he, word.he);
  const samePos = words.filter((w) => ok(w) && w.pos === word.pos);
  const pool = samePos.length >= 3 ? samePos : words.filter(ok);
  const distractors = shuffle(pool, rand).slice(0, 3);
  const opts = shuffle([word, ...distractors], rand);
  const answer = opts.indexOf(word);
  if (kind === 'word_meaning') {
    return {
      id: `wm-${word.id}`,
      type: 'word_meaning',
      skill: 'vocabulary',
      difficulty: word.difficulty,
      topic: word.category,
      prompt: `What is the meaning of "${word.en}"?`,
      options: opts.map((w) => w.he),
      optionsDir: 'rtl',
      answer,
      explanation: `${word.en} = ${word.he}. לדוגמה: "${word.example}"`,
      wordId: word.id,
    };
  }
  return {
    id: `wr-${word.id}`,
    type: 'word_reverse',
    skill: 'vocabulary',
    difficulty: word.difficulty,
    topic: word.category,
    prompt: word.he,
    options: opts.map((w) => w.en),
    optionsDir: 'ltr',
    answer,
    explanation: `"${word.he}" באנגלית: ${word.en}. לדוגמה: "${word.example}"`,
    wordId: word.id,
  };
}

/** Resolve any question id, including generated word questions. */
export function getQuestion(bank: ContentBank, id: string): Question | undefined {
  if (id.startsWith('wm-') || id.startsWith('wr-')) {
    const w = bank.wordById.get(id.slice(3));
    return w ? wordQuestion(w, bank.words, id.startsWith('wm-') ? 'word_meaning' : 'word_reverse') : undefined;
  }
  return bank.byId.get(id);
}

export interface PickOptions {
  skills: Skill[];
  count: number;
  difficulties: Difficulty[]; // one target tier per slot
  history: AnswerRecord[];
  rand?: () => number;
  exclude?: Set<string>;
  includeGenerated?: boolean;
  types?: Question['type'][];
  topics?: string[];
}

/**
 * Pick non-reading questions. Preference order per slot: exact tier, unseen
 * or previously-missed first, then nearest tier.
 */
export function pickQuestions(bank: ContentBank, o: PickOptions): Question[] {
  const rand = o.rand ?? Math.random;
  const seen = new Map<string, { n: number; wrong: number }>();
  for (const a of o.history) {
    const s = seen.get(a.questionId) ?? { n: 0, wrong: 0 };
    s.n++;
    if (!a.correct) s.wrong++;
    seen.set(a.questionId, s);
  }
  let pool: Question[] = bank.questions.filter((q) => o.skills.includes(q.skill) && q.skill !== 'reading');
  if (o.includeGenerated !== false && o.skills.includes('vocabulary')) {
    for (const w of bank.words) {
      pool.push(wordQuestion(w, bank.words, rand() < 0.65 ? 'word_meaning' : 'word_reverse'));
    }
  }
  if (o.types) pool = pool.filter((q) => o.types!.includes(q.type));
  if (o.topics) pool = pool.filter((q) => o.topics!.includes(q.topic));
  const used = new Set(o.exclude ?? []);
  const usedWords = new Set<string>();
  const out: Question[] = [];
  const score = (q: Question) => {
    const s = seen.get(q.id);
    if (!s) return 0; // unseen best
    if (s.wrong > 0 && s.wrong >= s.n - s.wrong) return 1; // mostly missed
    return 2 + s.n;
  };
  const byTier = (d: Difficulty) =>
    shuffle(
      pool.filter((q) => !used.has(q.id) && !(q.wordId && usedWords.has(q.wordId))),
      rand,
    ).sort((a, b) => Math.abs(a.difficulty - d) - Math.abs(b.difficulty - d) || score(a) - score(b));
  // balance skills round-robin
  for (let i = 0; i < o.count; i++) {
    const d = o.difficulties[i % o.difficulties.length];
    const skill = o.skills[i % o.skills.length];
    let cands = byTier(d).filter((q) => q.skill === skill);
    if (!cands.length) cands = byTier(d);
    const q = cands[0];
    if (!q) break;
    used.add(q.id);
    if (q.wordId) usedWords.add(q.wordId);
    out.push(q);
  }
  return shuffle(out, rand);
}

/** Choose a reading passage near the target tier, preferring unread ones. */
export function pickPassage(bank: ContentBank, d: Difficulty, history: AnswerRecord[], rand: () => number = Math.random, minQuestions = 1, exclude: Set<string> = new Set()): Passage | undefined {
  const done = new Set(history.filter((a) => a.skill === 'reading').map((a) => a.questionId.split('-q')[0]));
  const cands = shuffle(
    bank.passages.filter((p) => p.questions.length >= minQuestions && !exclude.has(p.id)),
    rand,
  ).sort((a, b) => Math.abs(a.difficulty - d) - Math.abs(b.difficulty - d) || Number(done.has(a.id)) - Number(done.has(b.id)));
  return cands[0];
}
