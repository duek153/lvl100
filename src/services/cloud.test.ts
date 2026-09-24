import { describe, it, expect } from 'vitest';
import { answerToRow, rowToAnswer, planPush, markerAfter, emptyMarker, chooseSource, remoteToExport, normalizeUsername, validUsername } from './cloud';
import { initialState, applyAnswer, completeOnboarding } from './game';
import type { GameState, Profile, Question } from '../domain/types';

const q: Question = { id: 'sc-001', type: 'sentence_completion', skill: 'vocabulary', difficulty: 2, topic: 't', prompt: 'p', options: ['a', 'b', 'c', 'd'], answer: 1, explanation: 'e' };
const profile: Profile = { name: 'Amit', goal: 'exemption', selfLevel: 'basic', reportedScore: null, targetScore: 120, examDate: null, daysPerWeek: 5, minutesPerDay: 20, createdAt: '2026-09-01', onboarded: true, placementDone: true, publicProfile: true, avatar: '🦊' };
const at = (h: number) => new Date(`2026-09-24T${String(h).padStart(2, '0')}:00:00`);

function played(n: number, s0?: GameState) {
  let s = s0 ?? completeOnboarding(initialState(), profile);
  for (let i = 0; i < n; i++) s = applyAnswer(s, { ...q, id: 'q' + i }, i % 2, 4000, 'practice', 0, at(10 + (i % 5))).state;
  return s;
}

describe('cloud mapping', () => {
  it('answer ↔ row round-trips', () => {
    const s = played(1);
    const a = s.answers[0];
    expect(rowToAnswer(answerToRow(a))).toEqual({ ...a, confidence: undefined });
  });
  it('clamps absurd response times to the DB limit', () => {
    const a = { ...played(1).answers[0], ms: 99_999_999 };
    expect(answerToRow(a).ms).toBe(3_600_000);
  });
});

describe('push planning', () => {
  it('first push sends everything; second push nothing', () => {
    const s = played(6);
    const p1 = planPush(s, emptyMarker(), '2026-09-24');
    expect(p1.empty).toBe(false);
    expect(p1.answers.length).toBe(6);
    expect(Object.keys(p1.slices)).toContain('progress');
    expect(p1.days).toEqual([{ day: '2026-09-24', xp: s.progress.days['2026-09-24'].xp, questions: 6 }]);
    expect(p1.profile).toEqual({ display_name: 'Amit', avatar: '🦊', is_public: true });
    const m = markerAfter(s, emptyMarker(), p1);
    const p2 = planPush(s, m, '2026-09-24');
    expect(p2.slices).toEqual({});
    expect(p2.days).toEqual([]);
    expect(p2.profile).toBeNull();
    expect(p2.answers.length).toBe(0);
    expect(p2.empty).toBe(true);
  });
  it('after more play only new answers and changed slices/days go up', () => {
    const s1 = played(3);
    const m = markerAfter(s1, emptyMarker(), planPush(s1, emptyMarker(), '2026-09-24'));
    let s2 = s1;
    for (let i = 0; i < 2; i++) s2 = applyAnswer(s2, { ...q, id: 'n' + i }, 1, 3000, 'practice', 1, at(20)).state;
    const p = planPush(s2, m, '2026-09-24');
    expect(p.answers.map((a) => a.question_id).filter((id) => id.startsWith('n')).length).toBe(2);
    expect(p.answers.length).toBe(2);
    expect(Object.keys(p.slices)).toContain('progress');
    expect(p.slices.settings).toBeUndefined();
    expect(p.days.length).toBe(1);
  });
  it('caps daily XP to the server limit and ignores old days', () => {
    const s = played(1);
    s.progress.days['2026-09-24'].xp = 99999;
    s.progress.days['2025-01-01'] = { questions: 5, correct: 5, xp: 50, ms: 1 };
    const p = planPush(s, emptyMarker(), '2026-09-24');
    expect(p.days.find((d) => d.day === '2026-09-24')!.xp).toBe(5000);
    expect(p.days.some((d) => d.day === '2025-01-01')).toBe(false);
  });
});

describe('sign-in merge', () => {
  it('fresh device pulls; more local XP pushes; more remote XP pulls', () => {
    expect(chooseSource(initialState(), { progress: { xp: 10 } })).toBe('pull');
    const local = played(10);
    expect(chooseSource(local, null)).toBe('push');
    expect(chooseSource(local, { progress: { xp: 0 } })).toBe('push');
    expect(chooseSource(local, { progress: { xp: local.progress.xp + 1 } })).toBe('pull');
  });
  it('remote export includes answers and all slices', () => {
    const s = played(2);
    const json = JSON.parse(remoteToExport({ progress: s.progress, profile: s.profile }, s.answers));
    expect(json.answers.length).toBe(2);
    expect(json.progress.xp).toBe(s.progress.xp);
    expect(json.vocab).toBeNull();
  });
});

describe('usernames', () => {
  it('normalizes and validates', () => {
    expect(normalizeUsername('Amit Duek!')).toBe('amitduek');
    expect(normalizeUsername('עמית')).toBe('');
    expect(validUsername('amit_100')).toBe(true);
    expect(validUsername('ab')).toBe(false);
    expect(validUsername('a'.repeat(21))).toBe(false);
  });
});
