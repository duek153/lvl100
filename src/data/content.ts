// Content loading. Each pack is a separate dynamic import → its own chunk,
// so the dashboard never downloads the question bank.
import type { ContentBank } from '../domain/engine';
import { makeBank } from '../domain/engine';
import type { Question, Word, Passage } from '../domain/types';
import { loadCustomContent } from '../store/customContent';

let bankPromise: Promise<ContentBank> | null = null;

export function loadBank(): Promise<ContentBank> {
  if (!bankPromise) {
    bankPromise = Promise.all([
      import('./words'),
      import('./questions'),
      import('./grammar'),
      import('./reading'),
    ]).then(([w, q, g, r]) => {
      const custom = loadCustomContent();
      const words: Word[] = [...w.WORDS, ...custom.words];
      const questions: Question[] = [...q.VOCAB_QUESTIONS, ...g.GRAMMAR_QUESTIONS, ...custom.questions];
      const passages: Passage[] = [...r.PASSAGES, ...custom.passages];
      return makeBank(words, questions, passages);
    });
  }
  return bankPromise;
}

/** Call after admin edits so the next load picks them up. */
export function invalidateBank() {
  bankPromise = null;
}

export function loadGrammarTopics() {
  return import('./grammar').then((g) => g.GRAMMAR_TOPICS);
}
