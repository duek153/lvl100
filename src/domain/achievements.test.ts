import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, achievementViews, newAchievements, nextUp, CATEGORIES } from './achievements';
import { initialState, applyAnswer } from '../services/game';
import type { Question } from './types';

const q: Question = { id: 'x', type: 'grammar', skill: 'grammar', difficulty: 4, topic: 'tenses', prompt: 'p', options: ['a', 'b', 'c', 'd'], answer: 0, explanation: 'e' };

describe('achievement gallery', () => {
  it('ids are unique, targets positive, categories valid', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    const cats = new Set(CATEGORIES.map((c) => c.id));
    for (const a of ACHIEVEMENTS) {
      expect(a.target).toBeGreaterThan(0);
      expect(cats.has(a.category)).toBe(true);
    }
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(50);
  });
  it('keeps the original ids so earlier unlocks survive', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    for (const id of ['first-step', 'placement', 'combo-10', 'streak-3', 'streak-7', 'streak-30', 'words-50', 'words-100', 'mastered-50', 'vocab-master', 'speed-demon', 'first-boss', 'daily-5', 'level-10', 'simulation', 'club-100'])
      expect(ids.has(id)).toBe(true);
  });
  it('fresh state: nothing unlocked, all progress 0–99', () => {
    const s = initialState();
    expect(newAchievements(s)).toEqual([]);
    for (const v of achievementViews(s)) {
      expect(v.unlockedAt).toBeNull();
      expect(v.pct).toBeGreaterThanOrEqual(0);
      expect(v.pct).toBeLessThan(100);
    }
  });
  it('unlocks as you play and reports progress toward the next ones', () => {
    let s = initialState();
    for (let i = 0; i < 12; i++) s = applyAnswer(s, { ...q, id: 'q' + i }, 0, 2000, 'practice', i + 1).state;
    expect(s.achievements['first-step']).toBeTruthy();
    expect(s.achievements['combo-10']).toBeTruthy();
    expect(s.achievements['speed-demon']).toBeTruthy();
    const views = achievementViews(s);
    const c50 = views.find((v) => v.def.id === 'correct-50')!;
    expect(c50.value).toBe(12);
    expect(c50.pct).toBe(24);
    expect(nextUp(views).length).toBeGreaterThan(0);
    expect(nextUp(views).every((v) => !v.unlockedAt)).toBe(true);
  });
  it('secret achievements never show up in "next up"', () => {
    let s = initialState();
    const late = new Date('2026-01-01T23:30:00');
    for (let i = 0; i < 5; i++) s = applyAnswer(s, { ...q, id: 'n' + i }, 0, 2000, 'practice', 1, late).state;
    expect(nextUp(achievementViews(s), 99).some((v) => v.def.secret)).toBe(false);
  });
});
