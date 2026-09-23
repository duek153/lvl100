import type { Difficulty, Question, QuestionType, Skill } from '../../domain/types';
import { hashString, rng, shuffle } from '../../domain/util';

/** Deterministic option shuffle so the answer position is spread evenly but stable per id. */
export function shuffleOptions(id: string, options: string[]): { options: string[]; answer: number } {
  const correct = options.find((o) => o.startsWith('*'))!;
  const mixed = shuffle(options, rng(hashString(id)));
  return { options: mixed.map((o) => o.replace(/^\*/, '')), answer: mixed.indexOf(correct) };
}

/**
 * Compact question format, one per line:
 *   difficulty|topic|prompt|opt1;*opt2;opt3;opt4|Hebrew explanation
 * The option starting with `*` is the correct answer. IDs are assigned by
 * position (`${prefix}-001`), so only ever APPEND new lines to keep ids stable.
 */
export function parseQuestions(raw: string, prefix: string, type: QuestionType, skill: Skill): Question[] {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//'));
  return lines.map((line, i) => {
    const [d, topic, prompt, opts, explanation] = line.split('|');
    const id = `${prefix}-${String(i + 1).padStart(3, '0')}`;
    const { options, answer } = shuffleOptions(id, opts.split(';').map((o) => o.trim()));
    return {
      id,
      type,
      skill,
      difficulty: Number(d) as Difficulty,
      topic,
      prompt: prompt.replace(/\\n/g, '\n'),
      options,
      answer,
      explanation,
      optionsDir: 'ltr',
    };
  });
}
