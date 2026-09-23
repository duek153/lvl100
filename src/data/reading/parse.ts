import type { Difficulty, Passage } from '../../domain/types';
import { shuffleOptions } from '../questions/parse';

/**
 * Compact passage format:
 *   @@ id|emoji|topic|difficulty|minutes|Title
 *   paragraph lines (one paragraph per line)
 *   ?? question|opt;*opt;opt;opt|Hebrew explanation
 * Question ids are `${passageId}-q${n}` (append only).
 */
export function parsePassages(raw: string): Passage[] {
  const out: Passage[] = [];
  let cur: Passage | null = null;
  for (const lineRaw of raw.split('\n')) {
    const line = lineRaw.trim();
    if (!line || line.startsWith('//')) continue;
    if (line.startsWith('@@')) {
      const [id, emoji, topic, d, minutes, title] = line.slice(2).trim().split('|');
      cur = { id, emoji, topic, difficulty: Number(d) as Difficulty, minutes: Number(minutes), title, paragraphs: [], questions: [] };
      out.push(cur);
    } else if (line.startsWith('??') && cur) {
      const [prompt, opts, explanation] = line.slice(2).trim().split('|');
      const id = `${cur.id}-q${cur.questions.length + 1}`;
      const { options, answer } = shuffleOptions(id, opts.split(';').map((o) => o.trim()));
      cur.questions.push({
        id,
        type: 'reading',
        skill: 'reading',
        difficulty: cur.difficulty,
        topic: cur.topic,
        prompt,
        options,
        answer,
        explanation,
        passageId: cur.id,
        optionsDir: 'ltr',
      });
    } else if (cur) {
      cur.paragraphs.push(line);
    }
  }
  return out;
}
