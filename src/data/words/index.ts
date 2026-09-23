import type { Difficulty, Word } from '../../domain/types';
import w1 from './w1';
import w2 from './w2';
import w3 from './w3';
import w4 from './w4';

export function parseWords(raw: string): Word[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//'))
    .map((line) => {
      const [en, pos, he, diff, category, example] = line.split('|');
      return {
        id: en.toLowerCase().replace(/[^a-z]+/g, '-'),
        en,
        pos: pos as Word['pos'],
        he,
        difficulty: Number(diff) as Difficulty,
        category,
        example,
      };
    });
}

export const WORDS: Word[] = [w1, w2, w3, w4].flatMap(parseWords);
export default WORDS;
