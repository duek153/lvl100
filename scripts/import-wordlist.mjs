#!/usr/bin/env node
// Import an external word list (e.g. NGSL / NAWL, CC BY-SA 4.0) into the
// LVL100 compact vocabulary format.
//
// Usage:
//   node scripts/import-wordlist.mjs input.csv > src/data/words/w5.ts
//
// Input CSV columns (header required): word,pos,hebrew,rank[,example][,category]
//   - `rank` is the frequency rank in the source list; it is mapped to difficulty.
//   - Hebrew glosses can come from a CC BY-SA dictionary (e.g. WikDict eng-heb);
//     keep attribution and the SA license notice with the generated file.
// Words already present in src/data/words/*.ts are skipped. Rows without a
// Hebrew gloss or example are reported and skipped — no invented data.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const wordsDir = join(here, '..', 'src', 'data', 'words');
const [, , input, source = 'external list (CC BY-SA 4.0)'] = process.argv;
if (!input) {
  console.error('usage: node scripts/import-wordlist.mjs input.csv [source-attribution]');
  process.exit(1);
}

const existing = new Set();
for (const f of readdirSync(wordsDir).filter((f) => /^w\d+\.ts$/.test(f))) {
  for (const line of readFileSync(join(wordsDir, f), 'utf8').split('\n')) {
    const w = line.split('|')[0]?.trim().toLowerCase();
    if (w && /^[a-z]/.test(w) && line.includes('|')) existing.add(w);
  }
}

function parseCsv(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/).filter(Boolean)) {
    const cells = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') q = !q;
      else if (c === ',' && !q) {
        cells.push(cur);
        cur = '';
      } else cur += c;
    }
    cells.push(cur);
    rows.push(cells.map((s) => s.trim()));
  }
  return rows;
}

const POS = { noun: 'n', n: 'n', verb: 'v', v: 'v', adjective: 'adj', adj: 'adj', adverb: 'adv', adv: 'adv', conjunction: 'conj', conj: 'conj', preposition: 'prep', prep: 'prep' };
const rankToDifficulty = (r) => (r <= 800 ? 1 : r <= 1800 ? 2 : r <= 2800 ? 3 : 4);

const [header, ...rows] = parseCsv(readFileSync(input, 'utf8'));
const col = (name) => header.findIndex((h) => h.toLowerCase() === name);
const iw = col('word'), ip = col('pos'), ih = col('hebrew'), ir = col('rank'), ie = col('example'), ic = col('category');
if ([iw, ip, ih, ir].some((i) => i < 0)) {
  console.error('CSV must have columns: word,pos,hebrew,rank');
  process.exit(1);
}

const out = [];
let skipped = 0;
for (const r of rows) {
  const word = r[iw];
  const he = r[ih];
  const example = ie >= 0 ? r[ie] : '';
  const pos = POS[(r[ip] || '').toLowerCase()];
  if (!word || existing.has(word.toLowerCase())) continue;
  if (!he || !example || !pos) {
    skipped++;
    console.error(`skip ${word}: missing ${!he ? 'hebrew ' : ''}${!example ? 'example ' : ''}${!pos ? 'pos' : ''}`);
    continue;
  }
  const clean = (s) => s.replace(/[|`]/g, ' ');
  out.push([clean(word), pos, clean(he), rankToDifficulty(Number(r[ir]) || 9999), clean(ic >= 0 && r[ic] ? r[ic] : 'Academic'), clean(example)].join('|'));
  existing.add(word.toLowerCase());
}

process.stdout.write(`// Imported from: ${source}. Licensed CC BY-SA 4.0 — keep this attribution.\nexport default \`\n${out.join('\n')}\n\`;\n`);
console.error(`imported ${out.length}, skipped ${skipped}. Remember to add the new pack to src/data/words/index.ts`);
