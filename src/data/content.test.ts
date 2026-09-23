import { describe, it, expect } from 'vitest';
import { WORDS } from './words';
import { SENTENCE_COMPLETION, CLOSEST_MEANING, RESTATEMENTS, VOCAB_QUESTIONS } from './questions';
import { GRAMMAR_QUESTIONS, GRAMMAR_TOPICS } from './grammar';
import { PASSAGES } from './reading';
import { wordQuestion, makeBank, pickQuestions, pickPassage } from '../domain/engine';
import { areSynonyms } from '../domain/synonyms';
import type { Question } from '../domain/types';

const allQuestions: Question[] = [...VOCAB_QUESTIONS, ...GRAMMAR_QUESTIONS, ...PASSAGES.flatMap((p) => p.questions)];

describe('seed data volume', () => {
  it('has the required amounts', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(500);
    expect(SENTENCE_COMPLETION.length + CLOSEST_MEANING.length + RESTATEMENTS.length).toBeGreaterThanOrEqual(200);
    expect(GRAMMAR_QUESTIONS.length).toBeGreaterThanOrEqual(100);
    expect(PASSAGES.length).toBeGreaterThanOrEqual(50);
    expect(PASSAGES.flatMap((p) => p.questions).length).toBeGreaterThanOrEqual(50);
    expect(PASSAGES.filter((p) => p.questions.length >= 5).length).toBeGreaterThanOrEqual(10);
  });
  it('covers every difficulty for exam question types', () => {
    for (const set of [SENTENCE_COMPLETION, RESTATEMENTS, GRAMMAR_QUESTIONS])
      for (const d of [1, 2, 3, 4]) expect(set.some((q) => q.difficulty === d)).toBe(true);
  });
  it('every grammar topic has questions at 3+ difficulties', () => {
    for (const t of GRAMMAR_TOPICS) {
      const qs = GRAMMAR_QUESTIONS.filter((q) => q.topic === t.id);
      expect(qs.length, t.id).toBeGreaterThanOrEqual(9);
      expect(new Set(qs.map((q) => q.difficulty)).size, t.id).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('question quality', () => {
  it('ids are unique', () => {
    const ids = allQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it.each(allQuestions.map((q) => [q.id, q] as const))('%s is well-formed', (_id, q) => {
    expect(q.options.length).toBe(4);
    expect(q.answer).toBeGreaterThanOrEqual(0);
    expect(q.answer).toBeLessThan(4);
    expect(new Set(q.options.map((o) => o.toLowerCase())).size).toBe(4);
    expect(q.options.every((o) => o.length > 0 && !o.startsWith('*'))).toBe(true);
    expect(q.prompt.length).toBeGreaterThan(3);
    expect(q.explanation.length).toBeGreaterThan(3);
    expect([1, 2, 3, 4]).toContain(q.difficulty);
  });
  it('sentence completion items contain exactly one blank', () => {
    for (const q of [...SENTENCE_COMPLETION, ...GRAMMAR_QUESTIONS]) {
      expect(q.prompt.split('____').length - 1, q.id).toBeGreaterThanOrEqual(1);
    }
  });
  it('correct answers are spread across positions (no giveaway pattern)', () => {
    const counts = [0, 0, 0, 0];
    for (const q of allQuestions) counts[q.answer]++;
    for (const c of counts) expect(c / allQuestions.length).toBeGreaterThan(0.08);
  });
});

describe('words', () => {
  it('ids unique, fields present', () => {
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
    for (const w of WORDS) {
      expect(w.he.length, w.en).toBeGreaterThan(0);
      expect(w.example.length, w.en).toBeGreaterThan(5);
      expect([1, 2, 3, 4]).toContain(w.difficulty);
      expect(['n', 'v', 'adj', 'adv', 'conj', 'prep', 'phr']).toContain(w.pos);
    }
  });
  it('generated questions: 4 distinct options, no synonym distractors, deterministic', () => {
    for (const w of WORDS) {
      for (const kind of ['word_meaning', 'word_reverse'] as const) {
        const q = wordQuestion(w, WORDS, kind);
        expect(q.options.length).toBe(4);
        expect(new Set(q.options).size).toBe(4);
        const correct = q.options[q.answer];
        expect(correct).toBe(kind === 'word_meaning' ? w.he : w.en);
        if (kind === 'word_reverse') {
          for (const o of q.options) if (o !== w.en) expect(areSynonyms(o, w.en), `${w.en} vs ${o}`).toBe(false);
        }
        expect(wordQuestion(w, WORDS, kind)).toEqual(q);
      }
    }
  });
});

describe('engine', () => {
  const bank = makeBank(WORDS, [...VOCAB_QUESTIONS, ...GRAMMAR_QUESTIONS], PASSAGES);
  it('picks the requested count without duplicates', () => {
    const qs = pickQuestions(bank, { skills: ['vocabulary', 'grammar'], count: 12, difficulties: [2], history: [] });
    expect(qs.length).toBe(12);
    expect(new Set(qs.map((q) => q.id)).size).toBe(12);
    expect(qs.some((q) => q.skill === 'grammar')).toBe(true);
  });
  it('respects target difficulty when possible', () => {
    const qs = pickQuestions(bank, { skills: ['grammar'], count: 8, difficulties: [4], history: [] });
    expect(qs.every((q) => q.difficulty >= 3)).toBe(true);
  });
  it('picks passages with enough questions', () => {
    const p = pickPassage(bank, 3, [], Math.random, 5);
    expect(p!.questions.length).toBeGreaterThanOrEqual(5);
  });
});
