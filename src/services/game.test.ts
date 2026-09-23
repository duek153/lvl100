import { describe, it, expect } from 'vitest';
import { initialState, applyAnswer, finishSession, claimQuest, completeOnboarding, buyFreeze, applyConfidence } from './game';
import type { GameState, Profile, Question } from '../domain/types';
import { XP } from '../domain/xp';

const q = (over: Partial<Question> = {}): Question => ({
  id: 'sc-1', type: 'sentence_completion', skill: 'vocabulary', difficulty: 2, topic: 't', prompt: 'p',
  options: ['a', 'b', 'c', 'd'], answer: 1, explanation: 'e', ...over,
});

const profile: Profile = {
  name: 'Test', goal: 'exemption', selfLevel: 'basic', reportedScore: null, targetScore: 110, examDate: null,
  daysPerWeek: 5, minutesPerDay: 20, createdAt: '2026-01-01', onboarded: false, placementDone: false, publicProfile: true, avatar: '🦊',
};

const at = (day: string, h = 12) => new Date(`${day}T${String(h).padStart(2, '0')}:00:00`);

describe('game service', () => {
  it('onboarding seeds ability from self level', () => {
    const s = completeOnboarding(initialState(), profile);
    expect(s.profile?.onboarded).toBe(true);
    expect(s.progress.ability.vocabulary).toBeLessThan(0);
    expect(s.progress.scoreHistory.length).toBe(1);
  });

  it('correct answer: XP, ability, record, day stats', () => {
    const s0 = completeOnboarding(initialState(), profile);
    const out = applyAnswer(s0, q(), 1, 3000, 'practice', 1, at('2026-02-01'));
    expect(out.record.correct).toBe(true);
    expect(out.state.progress.xp).toBe(out.xp.total);
    expect(out.state.progress.ability.vocabulary).toBeGreaterThan(s0.progress.ability.vocabulary);
    expect(out.state.progress.days['2026-02-01'].questions).toBe(1);
    expect(out.unlocked).toContain('first-step');
  });

  it('unanswered (null) counts as wrong', () => {
    const out = applyAnswer(initialState(), q(), null, 3000, 'simulation', 0);
    expect(out.record.correct).toBe(false);
    expect(out.xp.total).toBe(0);
  });

  it('simulation answers give no per-question XP', () => {
    const out = applyAnswer(initialState(), q(), 1, 3000, 'simulation', 1);
    expect(out.xp.total).toBe(0);
  });

  it('5 questions in a day extend the streak and grant study-day XP once', () => {
    let s: GameState = initialState();
    let bonus = 0;
    for (let i = 0; i < 7; i++) {
      const o = applyAnswer(s, q({ id: 'q' + i }), 0, 3000, 'practice', 0, at('2026-02-01'));
      bonus += o.bonusXp;
      s = o.state;
    }
    expect(s.progress.streak.current).toBe(1);
    expect(bonus).toBe(XP.studyDay);
    for (let i = 0; i < 5; i++) s = applyAnswer(s, q({ id: 'r' + i }), 0, 3000, 'practice', 0, at('2026-02-02')).state;
    expect(s.progress.streak.current).toBe(2);
  });

  it('word answers update SRS; confidence re-grades', () => {
    const wq = q({ id: 'wm-abandon', type: 'word_meaning', wordId: 'abandon' });
    const o = applyAnswer(initialState(), wq, 1, 3000, 'practice', 1, at('2026-02-01'));
    expect(o.state.vocab.abandon.correct).toBe(1);
    const known = applyConfidence(o.state, o.record.id, 'know', at('2026-02-01'));
    const practice = applyConfidence(o.state, o.record.id, 'practice', at('2026-02-01'));
    expect(known.vocab.abandon.interval).toBeGreaterThan(practice.vocab.abandon.interval);
    expect(known.vocab.abandon.seen).toBe(1);
  });

  it('adaptive practice level rises after 5 fast correct answers', () => {
    let s = initialState();
    for (let i = 0; i < 5; i++) s = applyAnswer(s, q({ id: 'x' + i }), 1, 3000, 'practice', i + 1).state;
    expect(s.progress.practiceLevel.vocabulary).toBe(2);
  });

  it('boss: pass grants XP once, keeps best', () => {
    let s = initialState();
    const a = finishSession(s, { kind: 'boss', refId: 'boss-1', total: 10, correct: 8, ms: 1 });
    expect(a.passed).toBe(true);
    expect(a.bonusXp).toBe(XP.boss);
    s = a.state;
    const b = finishSession(s, { kind: 'boss', refId: 'boss-1', total: 10, correct: 9, ms: 1 });
    expect(b.bonusXp).toBe(0);
    expect(b.state.progress.bosses['boss-1']).toBe(90);
    const c = finishSession(b.state, { kind: 'boss', refId: 'boss-1', total: 10, correct: 2, ms: 1 });
    expect(c.passed).toBe(false);
    expect(c.state.progress.bosses['boss-1']).toBe(90);
  });

  it('daily challenge rewards only once per day', () => {
    const now = at('2026-02-01');
    const a = finishSession(initialState(), { kind: 'daily', total: 10, correct: 10, ms: 1 }, now);
    expect(a.bonusXp).toBe(XP.dailyChallengeMax);
    const b = finishSession(a.state, { kind: 'daily', total: 10, correct: 10, ms: 1 }, now);
    expect(b.bonusXp).toBe(0);
  });

  it('quest can only be claimed when complete, and once', () => {
    const now = at('2026-02-01');
    let s = completeOnboarding(initialState(), { ...profile, minutesPerDay: 20 });
    expect(claimQuest(s, now).xp).toBe(0);
    let i = 0;
    const add = (skill: Question['skill'], n: number) => {
      for (let k = 0; k < n; k++) s = applyAnswer(s, q({ id: 'z' + i++, skill }), 1, 3000, 'practice', 0, now).state;
    };
    add('vocabulary', 8);
    add('grammar', 4);
    add('reading', 3);
    s = finishSession(s, { kind: 'daily', total: 10, correct: 5, ms: 1 }, now).state;
    const c = claimQuest(s, now);
    expect(c.xp).toBe(XP.dailyQuest);
    expect(claimQuest(c.state, now).xp).toBe(0);
  });

  it('buying a freeze spends wallet XP but not level XP', () => {
    let s = initialState();
    expect(buyFreeze(s).ok).toBe(false);
    s = { ...s, progress: { ...s.progress, xp: 500 } };
    const r = buyFreeze(s);
    expect(r.ok).toBe(true);
    expect(r.state.progress.xp).toBe(500);
    expect(r.state.progress.xpSpent).toBe(XP.streakFreezeCost);
    expect(r.state.progress.streak.freezes).toBe(1);
  });
});
