// Achievements are derived from state, so they can be re-evaluated anywhere.
import type { GameState } from './types';
import { isLearned, isMastered } from './srs';
import { estimatedScore } from './scoring';
import { levelFromXp } from './levels';

export interface AchievementDef {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  check: (s: GameState) => boolean;
}

const vocabAcc = (s: GameState) => {
  const v = s.answers.filter((a) => a.skill === 'vocabulary').slice(-50);
  return v.length >= 30 ? v.filter((a) => a.correct).length / v.length : 0;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-step', emoji: '👣', title: 'First Step', desc: 'ענית על השאלה הראשונה', check: (s) => s.answers.length >= 1 },
  { id: 'placement', emoji: '🧭', title: 'Know Thyself', desc: 'סיימת את מבחן המיקום', check: (s) => !!s.profile?.placementDone },
  { id: 'combo-10', emoji: '🔗', title: 'Combo x10', desc: '10 תשובות נכונות ברצף', check: (s) => s.progress.bestCombo >= 10 },
  { id: 'streak-3', emoji: '🔥', title: 'Warming Up', desc: 'רצף של 3 ימים', check: (s) => s.progress.streak.longest >= 3 },
  { id: 'streak-7', emoji: '🔥', title: 'On Fire', desc: 'רצף של 7 ימים', check: (s) => s.progress.streak.longest >= 7 },
  { id: 'streak-30', emoji: '🌋', title: 'Unstoppable', desc: 'רצף של 30 ימים', check: (s) => s.progress.streak.longest >= 30 },
  { id: 'words-50', emoji: '📗', title: 'Word Starter', desc: 'למדת 50 מילים', check: (s) => Object.values(s.vocab).filter(isLearned).length >= 50 },
  { id: 'words-100', emoji: '📚', title: 'Word Collector', desc: 'למדת 100 מילים', check: (s) => Object.values(s.vocab).filter(isLearned).length >= 100 },
  { id: 'mastered-50', emoji: '🏅', title: 'Memory Palace', desc: 'שלטת ב-50 מילים', check: (s) => Object.values(s.vocab).filter(isMastered).length >= 50 },
  { id: 'vocab-master', emoji: '🧠', title: 'Vocabulary Master', desc: '90% דיוק ב-50 שאלות המילים האחרונות', check: (s) => vocabAcc(s) >= 0.9 },
  { id: 'speed-demon', emoji: '⚡', title: 'Speed Demon', desc: '10 תשובות נכונות מתחת לזמן היעד', check: (s) => s.progress.fastCorrect >= 10 },
  { id: 'first-boss', emoji: '⚔️', title: 'Boss Slayer', desc: 'ניצחת את ה-Boss הראשון', check: (s) => Object.values(s.progress.bosses).some((p) => p >= 70) },
  { id: 'daily-5', emoji: '📅', title: 'Daily Grinder', desc: 'השלמת 5 אתגרים יומיים', check: (s) => Object.keys(s.progress.dailyDone).length >= 5 },
  { id: 'level-10', emoji: '✈️', title: 'Halfway Hero', desc: 'הגעת ל-Level 10', check: (s) => levelFromXp(s.progress.xp).level >= 10 },
  { id: 'simulation', emoji: '🎓', title: 'Exam Ready', desc: 'הגעת ליעד שלך בסימולציית אמירנט מלאה', check: (s) => s.attempts.some((a) => a.kind === 'simulation' && (a.score ?? 0) >= (s.profile?.targetScore ?? 100)) },
  { id: 'club-100', emoji: '💯', title: '100 Club', desc: 'ציון משוער של 100 ומעלה', check: (s) => estimatedScore(s.progress.ability) >= 100 || s.attempts.some((a) => a.kind === 'simulation' && (a.score ?? 0) >= 100) },
];

/** Returns ids of achievements newly unlocked in `s`. */
export function newAchievements(s: GameState): string[] {
  return ACHIEVEMENTS.filter((a) => !s.achievements[a.id] && a.check(s)).map((a) => a.id);
}
