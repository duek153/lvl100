// Admin-created content, stored locally until a backend exists.
import type { Passage, Question, Word } from '../domain/types';

const KEY = 'lvl100:custom';

export interface CustomContent {
  words: Word[];
  questions: Question[];
  passages: Passage[];
}

export function loadCustomContent(): CustomContent {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (raw) return { words: [], questions: [], passages: [], ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { words: [], questions: [], passages: [] };
}

export function saveCustomContent(c: CustomContent) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* storage full or blocked */
  }
}
