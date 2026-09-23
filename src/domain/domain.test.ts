import { describe, it, expect } from 'vitest';
import { xpForAnswer, XP, dailyChallengeXp } from './xp';
import { levelFromXp, totalXpForLevel, MAX_LEVEL, LEVELS } from './levels';
import { registerStudyDay, emptyStreak, effectiveStreak, streakAtRisk, buyFreeze, MAX_FREEZES } from './streak';
import { newUserWord, review, mastery, isWeak, pickReviewWords } from './srs';
import { nextDifficulty, difficultyForAbility, chooseDifficulty } from './adaptive';
import { updateAbility, thetaToScore, estimateTheta, estimatedScore, pCorrect, B } from './scoring';
import { scoreSimulation, experimentalBonus, nextSectionTier, tierForTheta } from './simulation';
import { scorePlacement, placementNext } from './placement';
import { dailyPlan } from './plan';
import { bandFor, SCORE_BANDS } from '../data/exam';
import type { Difficulty } from './types';

describe('question scoring / XP', () => {
  it('gives nothing for a wrong answer', () => {
    expect(xpForAnswer(false, 4, 1000, 10_000, 0).total).toBe(0);
  });
  it('base + difficulty + speed', () => {
    const r = xpForAnswer(true, 3, 5_000, 10_000, 1);
    expect(r).toMatchObject({ base: 10, difficulty: 5, speed: 3, combo: 0, total: 18 });
  });
  it('no speed bonus when slow', () => {
    expect(xpForAnswer(true, 1, 20_000, 10_000, 1).speed).toBe(0);
  });
  it('combo bonuses at 5 and 10', () => {
    expect(xpForAnswer(true, 1, 99_999, 1, 5).combo).toBe(XP.combo5);
    expect(xpForAnswer(true, 1, 99_999, 1, 10).combo).toBe(XP.combo10);
    expect(xpForAnswer(true, 1, 99_999, 1, 15).combo).toBe(XP.combo5);
    expect(xpForAnswer(true, 1, 99_999, 1, 7).combo).toBe(0);
  });
  it('daily challenge xp scales with accuracy', () => {
    expect(dailyChallengeXp(10, 10)).toBe(XP.dailyChallengeMax);
    expect(dailyChallengeXp(5, 10)).toBe(60);
    expect(dailyChallengeXp(0, 0)).toBe(0);
  });
});

describe('level progression', () => {
  it('starts at level 1', () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(0).def.name).toBe('Beginner');
  });
  it('levels up exactly at the threshold', () => {
    const t = totalXpForLevel(2);
    expect(levelFromXp(t - 1).level).toBe(1);
    expect(levelFromXp(t).level).toBe(2);
  });
  it('is monotonic and caps at max', () => {
    let prev = 0;
    for (let l = 2; l <= MAX_LEVEL; l++) {
      expect(totalXpForLevel(l)).toBeGreaterThan(prev);
      prev = totalXpForLevel(l);
    }
    expect(levelFromXp(10_000_000).level).toBe(MAX_LEVEL);
    expect(levelFromXp(10_000_000).pct).toBe(100);
    expect(LEVELS[MAX_LEVEL - 1].name).toBe('AmirNet Challenger');
  });
  it('max level reachable in a few months of daily play', () => {
    const total = totalXpForLevel(MAX_LEVEL);
    expect(total).toBeGreaterThan(15_000);
    expect(total).toBeLessThan(60_000);
  });
});

describe('streak', () => {
  it('increments on consecutive days', () => {
    let s = registerStudyDay(emptyStreak(), '2026-01-01');
    s = registerStudyDay(s, '2026-01-02');
    s = registerStudyDay(s, '2026-01-03');
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });
  it('same day twice is idempotent', () => {
    const s = registerStudyDay(registerStudyDay(emptyStreak(), '2026-01-01'), '2026-01-01');
    expect(s.current).toBe(1);
  });
  it('resets after a missed day without freezes', () => {
    let s = registerStudyDay(emptyStreak(), '2026-01-01');
    s = registerStudyDay(s, '2026-01-02');
    s = registerStudyDay(s, '2026-01-04');
    expect(s.current).toBe(1);
    expect(s.longest).toBe(2);
  });
  it('freeze covers a missed day', () => {
    let s = registerStudyDay(emptyStreak(), '2026-01-01');
    s = buyFreeze(s);
    s = registerStudyDay(s, '2026-01-03');
    expect(s.current).toBe(2);
    expect(s.freezes).toBe(0);
    expect(s.freezesUsed).toBe(1);
  });
  it('freezes are capped', () => {
    let s = emptyStreak();
    for (let i = 0; i < 5; i++) s = buyFreeze(s);
    expect(s.freezes).toBe(MAX_FREEZES);
  });
  it('handles month boundaries', () => {
    let s = registerStudyDay(emptyStreak(), '2026-01-31');
    s = registerStudyDay(s, '2026-02-01');
    expect(s.current).toBe(2);
  });
  it('effective streak and risk', () => {
    const s = registerStudyDay(emptyStreak(), '2026-01-01');
    expect(effectiveStreak(s, '2026-01-02')).toBe(1);
    expect(streakAtRisk(s, '2026-01-02')).toBe(true);
    expect(effectiveStreak(s, '2026-01-03')).toBe(0);
    expect(streakAtRisk(s, '2026-01-01')).toBe(false);
  });
});

describe('spaced repetition', () => {
  const today = '2026-03-01';
  it('wrong answers come back today and count mistakes', () => {
    const w = review(newUserWord('x', today), 0, today);
    expect(w.due).toBe(today);
    expect(w.wrong).toBe(1);
    expect(w.streak).toBe(0);
  });
  it('intervals grow with successive correct answers', () => {
    let w = newUserWord('x', today);
    const intervals: number[] = [];
    for (let i = 0; i < 5; i++) {
      w = review(w, 2, today);
      intervals.push(w.interval);
    }
    for (let i = 1; i < intervals.length; i++) expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
    expect(intervals[4]).toBeGreaterThan(7);
  });
  it('"I know this" schedules further than "need practice"', () => {
    const base = review(newUserWord('x', today), 2, today);
    expect(review(base, 3, today).interval).toBeGreaterThan(review(base, 1, today).interval);
  });
  it('3 mistakes makes a weak word', () => {
    let w = newUserWord('x', today);
    for (let i = 0; i < 3; i++) w = review(w, 0, today);
    expect(isWeak(w)).toBe(true);
    expect(mastery(w)).toBeLessThan(30);
  });
  it('known words appear less: due words first, then new', () => {
    const vocab = {
      a: { ...review(newUserWord('a', today), 0, today) }, // due today
      b: { ...review(review(review(newUserWord('b', today), 2, today), 2, today), 2, today) }, // far future
    };
    const picked = pickReviewWords(vocab, ['c', 'd', 'b'], today, 3);
    expect(picked[0]).toBe('a');
    expect(picked).toContain('c');
    expect(picked).not.toContain('b');
  });
});

describe('adaptive difficulty', () => {
  const r = (correct: boolean, ms = 5_000) => ({ correct, ms, targetMs: 10_000 });
  it('5/5 fast → harder', () => {
    expect(nextDifficulty(2, [r(true), r(true), r(true), r(true), r(true)])).toBe(3);
  });
  it('2/5 → easier', () => {
    expect(nextDifficulty(3, [r(true), r(false), r(true), r(false), r(false)])).toBe(2);
  });
  it('5/5 but slow → stay', () => {
    expect(nextDifficulty(2, Array(5).fill(r(true, 20_000)))).toBe(2);
  });
  it('3/5 → stay; bounds respected', () => {
    expect(nextDifficulty(2, [r(true), r(true), r(true), r(false), r(false)])).toBe(2);
    expect(nextDifficulty(4, Array(5).fill(r(true)))).toBe(4);
    expect(nextDifficulty(1, Array(5).fill(r(false)))).toBe(1);
  });
  it('needs a full window', () => {
    expect(nextDifficulty(2, [r(true), r(true)])).toBe(2);
  });
  it('ability maps to sensible tiers', () => {
    expect(difficultyForAbility(-2)).toBe(1);
    expect(difficultyForAbility(0)).toBe(2);
    expect(difficultyForAbility(2.5)).toBe(4);
    expect(chooseDifficulty(0, 4)).toBe(3);
  });
});

describe('score estimate', () => {
  it('theta 0 ≈ 100, bounded 50–150', () => {
    expect(thetaToScore(0)).toBe(100);
    expect(thetaToScore(10)).toBe(150);
    expect(thetaToScore(-10)).toBe(50);
  });
  it('correct answers raise ability, wrong lower it', () => {
    expect(updateAbility(0, 0, 2, true)).toBeGreaterThan(0);
    expect(updateAbility(0, 0, 2, false)).toBeLessThan(0);
  });
  it('a correct hard answer is worth more than a correct easy one', () => {
    expect(updateAbility(0, 0, 4, true)).toBeGreaterThan(updateAbility(0, 0, 1, true));
  });
  it('MAP estimate orders performances', () => {
    const all = (c: boolean, d: Difficulty) => Array.from({ length: 10 }, () => ({ difficulty: d, correct: c }));
    const good = estimateTheta(all(true, 3));
    const bad = estimateTheta(all(false, 2));
    expect(good).toBeGreaterThan(0.5);
    expect(bad).toBeLessThan(-0.5);
    expect(Number.isFinite(good)).toBe(true);
  });
  it('estimate converges near the true ability on simulated data', () => {
    const trueTheta = 1;
    const responses = [];
    for (let i = 0; i < 400; i++) {
      const d = ((i % 4) + 1) as Difficulty;
      responses.push({ difficulty: d, correct: (i * 0.618) % 1 < pCorrect(trueTheta, B[d]) });
    }
    expect(Math.abs(estimateTheta(responses, 0, 3) - trueTheta)).toBeLessThan(0.3);
  });
  it('estimatedScore is weighted', () => {
    expect(estimatedScore({ vocabulary: 0, grammar: 0, reading: 0, restatement: 0 })).toBe(100);
  });
  it('bands cover the whole scale with no gaps', () => {
    for (let s = 50; s <= 150; s++) expect(bandFor(s)).toBeTruthy();
    for (let i = 1; i < SCORE_BANDS.length; i++) expect(SCORE_BANDS[i].min).toBe(SCORE_BANDS[i - 1].max + 1);
    expect(bandFor(134).en).toBe('Exempt');
    expect(bandFor(133).en).toBe('Advanced 2');
  });
});

describe('simulation scoring', () => {
  it('first section is medium, then adapts', () => {
    expect(nextSectionTier([])).toBe(2);
    const strong = Array.from({ length: 4 }, () => ({ difficulty: 2 as Difficulty, correct: true, section: 0 }));
    const weak = Array.from({ length: 4 }, () => ({ difficulty: 2 as Difficulty, correct: false, section: 0 }));
    expect(nextSectionTier(strong)).toBeGreaterThan(nextSectionTier(weak));
    expect(tierForTheta(1.4)).toBe(4);
  });
  it('experimental bonus is 0–2 and never negative', () => {
    expect(experimentalBonus(0, 4)).toBe(0);
    expect(experimentalBonus(2, 4)).toBe(1);
    expect(experimentalBonus(4, 4)).toBe(2);
    expect(experimentalBonus(0, 0)).toBe(0);
  });
  it('perfect on hard sections scores above exemption; all wrong is low', () => {
    const perfect = Array.from({ length: 23 }, (_, i) => ({ difficulty: 4 as Difficulty, correct: true, section: i }));
    const zero = Array.from({ length: 23 }, (_, i) => ({ difficulty: 1 as Difficulty, correct: false, section: i }));
    expect(scoreSimulation(perfect).score).toBeGreaterThanOrEqual(134);
    expect(scoreSimulation(zero).score).toBeLessThan(70);
    expect(scoreSimulation(perfect, 4, 4).score).toBeLessThanOrEqual(150);
  });
  it('same accuracy on harder items gives a higher score', () => {
    const mk = (d: Difficulty) => Array.from({ length: 20 }, (_, i) => ({ difficulty: d, correct: i % 2 === 0, section: 0 }));
    expect(scoreSimulation(mk(3)).score).toBeGreaterThan(scoreSimulation(mk(2)).score);
  });
});

describe('placement', () => {
  it('staircase stays within bounds', () => {
    expect(placementNext(4, true)).toBe(4);
    expect(placementNext(1, false)).toBe(1);
    expect(placementNext(2, true)).toBe(3);
  });
  it('identifies weak and strong areas', () => {
    const rs = [
      ...Array.from({ length: 8 }, () => ({ skill: 'vocabulary' as const, difficulty: 3 as Difficulty, correct: true })),
      ...Array.from({ length: 5 }, () => ({ skill: 'grammar' as const, difficulty: 2 as Difficulty, correct: false })),
      ...Array.from({ length: 4 }, () => ({ skill: 'reading' as const, difficulty: 2 as Difficulty, correct: true })),
    ];
    const r = scorePlacement(rs, 'basic');
    expect(r.weak).toContain('grammar');
    expect(r.strong).toContain('vocabulary');
    expect(r.score).toBeGreaterThanOrEqual(50);
    expect(r.score).toBeLessThanOrEqual(150);
  });
});

describe('daily plan', () => {
  it('sums exactly to the chosen minutes', () => {
    for (const m of [10, 20, 25, 30, 45, 60]) {
      const plan = dailyPlan(m, { vocabulary: 0, grammar: -1, reading: 0.5, restatement: 0 });
      expect(plan.reduce((s, p) => s + p.minutes, 0)).toBe(m);
    }
  });
  it('gives more time to weaker skills', () => {
    const plan = dailyPlan(40, { vocabulary: -1.5, grammar: 1, reading: 0, restatement: 0 });
    const get = (k: string) => plan.find((p) => p.key === k)?.minutes ?? 0;
    const neutral = dailyPlan(40, { vocabulary: 0, grammar: 0, reading: 0, restatement: 0 });
    expect(get('vocabulary')).toBeGreaterThan(neutral.find((p) => p.key === 'vocabulary')!.minutes);
  });
});
