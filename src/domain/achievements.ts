// Achievements ("collect them all"). Everything is derived from state, so the
// gallery can show progress toward every item and re-evaluate anywhere.
import type { AnswerRecord, GameState } from './types';
import { isLearned, isMastered } from './srs';
import { estimatedScore } from './scoring';
import { levelFromXp } from './levels';
import { GRAMMAR_TOPIC_IDS, topicMastery } from './mastery';
import { STAGE_BOSS_IDS } from './road';

/** 1 bronze · 2 silver · 3 gold · 4 diamond */
export type Tier = 1 | 2 | 3 | 4;

export type Category = 'start' | 'streak' | 'words' | 'answers' | 'skills' | 'battles' | 'daily' | 'levels' | 'exam' | 'social' | 'secret';

export const CATEGORIES: { id: Category; title: string; emoji: string }[] = [
  { id: 'start', title: 'צעדים ראשונים', emoji: '👣' },
  { id: 'streak', title: 'רצף', emoji: '🔥' },
  { id: 'words', title: 'אוצר מילים', emoji: '📚' },
  { id: 'answers', title: 'תשובות וקומבו', emoji: '✅' },
  { id: 'skills', title: 'דקדוק, קריאה וניסוח', emoji: '🧩' },
  { id: 'battles', title: 'קרבות ומבחנים', emoji: '⚔️' },
  { id: 'daily', title: 'יומיים', emoji: '📅' },
  { id: 'levels', title: 'רמות', emoji: '⭐' },
  { id: 'exam', title: 'הדרך ל-100', emoji: '🎓' },
  { id: 'social', title: 'חברים', emoji: '👥' },
  { id: 'secret', title: 'סודיים', emoji: '🕵️' },
];

/** Aggregates computed once per evaluation (single pass over answers). */
export interface Stats {
  answers: number;
  correct: number;
  learned: number;
  mastered: number;
  vocabAcc50: number;
  readingPassages: number;
  perfectPassages: number;
  restatementCorrect: number;
  topicsMastered: number;
  bossesBeaten: number;
  testsPassed: number;
  dailyDays: number;
  perfectDaily: number;
  questsClaimed: number;
  level: number;
  estimated: number;
  simulations: number;
  bestSim: number;
  friendWins: number;
  friendChallenges: number;
  nightOwl: number;
  earlyBird: number;
  hardCorrect: number;
}

export function computeStats(s: GameState): Stats {
  const words = Object.values(s.vocab);
  const perPassage = new Map<string, { n: number; c: number }>();
  let correct = 0;
  let restatementCorrect = 0;
  let nightOwl = 0;
  let earlyBird = 0;
  let hardCorrect = 0;
  for (const a of s.answers) {
    if (a.correct) correct++;
    if (a.correct && a.skill === 'restatement') restatementCorrect++;
    if (a.correct && a.difficulty === 4) hardCorrect++;
    if (a.skill === 'reading') {
      const pid = a.questionId.split('-q')[0];
      const r = perPassage.get(pid) ?? { n: 0, c: 0 };
      r.n++;
      if (a.correct) r.c++;
      perPassage.set(pid, r);
    }
    const h = new Date(a.date).getHours();
    if (h >= 23 || h < 4) nightOwl++;
    if (h >= 5 && h < 7) earlyBird++;
  }
  const vocab = s.answers.filter((a: AnswerRecord) => a.skill === 'vocabulary').slice(-50);
  const sims = s.attempts.filter((a) => a.kind === 'simulation');
  const friends = s.attempts.filter((a) => a.kind === 'friend');
  return {
    answers: s.answers.length,
    correct,
    learned: words.filter(isLearned).length,
    mastered: words.filter(isMastered).length,
    vocabAcc50: vocab.length >= 30 ? Math.round((vocab.filter((a) => a.correct).length / vocab.length) * 100) : 0,
    readingPassages: [...perPassage.values()].filter((r) => r.n >= 3).length,
    perfectPassages: [...perPassage.values()].filter((r) => r.n >= 3 && r.c === r.n).length,
    restatementCorrect,
    topicsMastered: GRAMMAR_TOPIC_IDS.filter((t) => topicMastery(s.answers, t).pct >= 80).length,
    bossesBeaten: STAGE_BOSS_IDS.filter((id) => (s.progress.bosses[id] ?? 0) >= 70).length,
    testsPassed: Object.values(s.progress.tests).filter((p) => p >= 65).length,
    dailyDays: Object.keys(s.progress.dailyDone).length,
    perfectDaily: Object.values(s.progress.dailyDone).filter((p) => p === 100).length,
    questsClaimed: Object.keys(s.progress.questsClaimed).length,
    level: levelFromXp(s.progress.xp).level,
    estimated: estimatedScore(s.progress.ability),
    simulations: sims.length,
    bestSim: Math.max(0, ...sims.map((a) => a.score ?? 0)),
    friendWins: friends.filter((a) => a.meta?.won).length,
    friendChallenges: friends.length,
    nightOwl,
    earlyBird,
    hardCorrect,
  };
}

export interface AchievementDef {
  id: string;
  category: Category;
  tier: Tier;
  emoji: string;
  title: string;
  desc: string;
  target: number;
  value: (st: Stats, s: GameState) => number;
  /** hidden until unlocked */
  secret?: boolean;
}

const A = (
  id: string,
  category: Category,
  tier: Tier,
  emoji: string,
  title: string,
  desc: string,
  target: number,
  value: AchievementDef['value'],
  secret = false,
): AchievementDef => ({ id, category, tier, emoji, title, desc, target, value, secret });

const streak = (_: Stats, s: GameState) => s.progress.streak.longest;

// Existing ids (first-step, streak-7, words-100, …) are kept so earlier unlocks survive.
export const ACHIEVEMENTS: AchievementDef[] = [
  // start
  A('first-step', 'start', 1, '👣', 'First Step', 'ענית על השאלה הראשונה', 1, (st) => st.answers),
  A('placement', 'start', 1, '🧭', 'Know Thyself', 'סיימת את מבחן המיקום', 1, (_, s) => (s.profile?.placementDone ? 1 : 0)),
  A('first-quest', 'start', 1, '🎁', 'Mission Complete', 'אספת את ה-Daily Quest הראשון', 1, (st) => st.questsClaimed),
  // streak
  A('streak-3', 'streak', 1, '🔥', 'Warming Up', 'רצף של 3 ימים', 3, streak),
  A('streak-7', 'streak', 2, '🔥', 'On Fire', 'רצף של 7 ימים', 7, streak),
  A('streak-14', 'streak', 2, '☄️', 'Two Weeks Strong', 'רצף של 14 ימים', 14, streak),
  A('streak-30', 'streak', 3, '🌋', 'Unstoppable', 'רצף של 30 ימים', 30, streak),
  A('streak-60', 'streak', 3, '⚡', 'Force of Habit', 'רצף של 60 ימים', 60, streak),
  A('streak-100', 'streak', 4, '💎', 'Legend', 'רצף של 100 ימים', 100, streak),
  A('freeze-saved', 'streak', 1, '❄️', 'Ice Shield', 'Streak Freeze הציל לך את הרצף', 1, (_, s) => s.progress.streak.freezesUsed),
  // words
  A('words-25', 'words', 1, '📗', 'Word Hunter', 'למדת 25 מילים', 25, (st) => st.learned),
  A('words-50', 'words', 1, '📘', 'Word Starter', 'למדת 50 מילים', 50, (st) => st.learned),
  A('words-100', 'words', 2, '📚', 'Word Collector', 'למדת 100 מילים', 100, (st) => st.learned),
  A('words-250', 'words', 3, '🗃️', 'Walking Dictionary', 'למדת 250 מילים', 250, (st) => st.learned),
  A('words-500', 'words', 4, '🏛️', 'Lexicon Complete', 'למדת 500 מילים', 500, (st) => st.learned),
  A('mastered-50', 'words', 2, '🏅', 'Memory Palace', 'שליטה מלאה ב-50 מילים', 50, (st) => st.mastered),
  A('mastered-200', 'words', 4, '👑', 'Word Royalty', 'שליטה מלאה ב-200 מילים', 200, (st) => st.mastered),
  A('vocab-master', 'words', 3, '🧠', 'Vocabulary Master', '90% דיוק ב-50 שאלות המילים האחרונות', 90, (st) => st.vocabAcc50),
  // answers
  A('correct-50', 'answers', 1, '✅', 'Getting Started', '50 תשובות נכונות', 50, (st) => st.correct),
  A('correct-250', 'answers', 2, '✔️', 'Solid', '250 תשובות נכונות', 250, (st) => st.correct),
  A('correct-1000', 'answers', 3, '🎯', 'Sharpshooter', '1,000 תשובות נכונות', 1000, (st) => st.correct),
  A('correct-2500', 'answers', 4, '🏹', 'Master Archer', '2,500 תשובות נכונות', 2500, (st) => st.correct),
  A('combo-10', 'answers', 1, '🔗', 'Combo x10', '10 תשובות נכונות ברצף', 10, (_, s) => s.progress.bestCombo),
  A('combo-20', 'answers', 2, '⛓️', 'Combo x20', '20 תשובות נכונות ברצף', 20, (_, s) => s.progress.bestCombo),
  A('combo-30', 'answers', 3, '🌪️', 'Combo x30', '30 תשובות נכונות ברצף', 30, (_, s) => s.progress.bestCombo),
  A('speed-demon', 'answers', 1, '⚡', 'Speed Demon', '10 תשובות נכונות מתחת לזמן היעד', 10, (_, s) => s.progress.fastCorrect),
  A('speed-200', 'answers', 3, '🏎️', 'Formula English', '200 תשובות נכונות מתחת לזמן היעד', 200, (_, s) => s.progress.fastCorrect),
  A('hard-25', 'answers', 3, '🧗', 'Very Hard Mode', '25 תשובות נכונות בשאלות ברמת Very Hard', 25, (st) => st.hardCorrect),
  // skills
  A('grammar-1', 'skills', 1, '🧩', 'Rule Breaker', 'שליטה (80%) בנושא דקדוק אחד', 1, (st) => st.topicsMastered),
  A('grammar-5', 'skills', 2, '🔧', 'Grammar Mechanic', 'שליטה ב-5 נושאי דקדוק', 5, (st) => st.topicsMastered),
  A('grammar-all', 'skills', 4, '📐', 'Grammar Architect', 'שליטה בכל 11 נושאי הדקדוק', GRAMMAR_TOPIC_IDS.length, (st) => st.topicsMastered),
  A('reading-5', 'skills', 1, '📖', 'Bookworm', 'קראת 5 אנסינים', 5, (st) => st.readingPassages),
  A('reading-20', 'skills', 2, '📰', 'Avid Reader', 'קראת 20 אנסינים', 20, (st) => st.readingPassages),
  A('reading-50', 'skills', 4, '🏰', 'Library Complete', 'קראת את כל 50 האנסינים', 50, (st) => st.readingPassages),
  A('reading-perfect', 'skills', 2, '🌟', 'Flawless Reader', 'אנסין שלם בלי אף טעות', 1, (st) => st.perfectPassages),
  A('restate-50', 'skills', 2, '🔁', 'Paraphrase Pro', '50 ניסוחים מחדש נכונים', 50, (st) => st.restatementCorrect),
  // battles
  A('first-boss', 'battles', 1, '⚔️', 'Boss Slayer', 'ניצחת את ה-Boss הראשון', 1, (st) => st.bossesBeaten),
  A('boss-5', 'battles', 2, '🛡️', 'Monster Hunter', 'ניצחת 5 Bosses', 5, (st) => st.bossesBeaten),
  A('boss-all', 'battles', 4, '🐲', 'Dragon Tamer', 'ניצחת את כל 9 ה-Bosses', STAGE_BOSS_IDS.length, (st) => st.bossesBeaten),
  A('test-1', 'battles', 2, '📝', 'Test Passer', 'עברת מבחן התקדמות', 1, (st) => st.testsPassed),
  A('test-3', 'battles', 3, '🎖️', 'Triple Crown', 'עברת את שלושת מבחני ההתקדמות', 3, (st) => st.testsPassed),
  // daily
  A('daily-5', 'daily', 1, '📅', 'Daily Grinder', 'השלמת 5 אתגרים יומיים', 5, (st) => st.dailyDays),
  A('daily-30', 'daily', 3, '🗓️', 'Monthly Machine', 'השלמת 30 אתגרים יומיים', 30, (st) => st.dailyDays),
  A('daily-perfect', 'daily', 2, '💯', 'Perfect Day', '10/10 באתגר היומי', 1, (st) => st.perfectDaily),
  A('quest-10', 'daily', 2, '🎯', 'Quest Hunter', 'אספת 10 משימות יומיות', 10, (st) => st.questsClaimed),
  A('quest-50', 'daily', 4, '🏆', 'Quest Legend', 'אספת 50 משימות יומיות', 50, (st) => st.questsClaimed),
  // levels
  A('level-5', 'levels', 1, '📖', 'Reader', 'הגעת ל-Level 5', 5, (st) => st.level),
  A('level-10', 'levels', 2, '✈️', 'Halfway Hero', 'הגעת ל-Level 10', 10, (st) => st.level),
  A('level-15', 'levels', 3, '🚀', 'Speed Reader', 'הגעת ל-Level 15', 15, (st) => st.level),
  A('level-20', 'levels', 4, '👑', 'AmirNet Challenger', 'הגעת ל-Level 20, הרמה המקסימלית', 20, (st) => st.level),
  // exam
  A('first-sim', 'exam', 2, '🎓', 'Dress Rehearsal', 'השלמת סימולציית אמירנט מלאה', 1, (st) => st.simulations),
  A('simulation', 'exam', 3, '🏁', 'Exam Ready', 'הגעת ליעד שלך בסימולציה מלאה', 1, (st, s) => (st.bestSim >= (s.profile?.targetScore ?? 100) ? 1 : 0)),
  A('club-100', 'exam', 2, '💯', '100 Club', 'ציון משוער של 100 ומעלה', 100, (st) => Math.max(st.estimated, st.bestSim)),
  A('club-120', 'exam', 3, '🥇', 'Advanced 2', 'ציון משוער של 120 ומעלה', 120, (st) => Math.max(st.estimated, st.bestSim)),
  A('exempt', 'exam', 4, '🏆', 'Exemption Level', '134 ומעלה בסימולציה מלאה', 134, (st) => st.bestSim),
  // social
  A('friend-1', 'social', 1, '🤝', 'Challenger', 'שיחקת אתגר חבר', 1, (st) => st.friendChallenges),
  A('friend-win', 'social', 2, '🥊', 'Beat Your Friend', 'ניצחת חבר באתגר', 1, (st) => st.friendWins),
  A('friend-win-5', 'social', 3, '🏟️', 'Champion', 'ניצחת 5 אתגרי חברים', 5, (st) => st.friendWins),
  // secret
  A('night-owl', 'secret', 2, '🦉', 'Night Owl', '20 תשובות אחרי 23:00', 20, (st) => st.nightOwl, true),
  A('early-bird', 'secret', 2, '🌅', 'Early Bird', '20 תשובות לפני 7 בבוקר', 20, (st) => st.earlyBird, true),
];

export const TIER_NAMES: Record<Tier, string> = { 1: 'Bronze', 2: 'Silver', 3: 'Gold', 4: 'Diamond' };

export interface AchievementView {
  def: AchievementDef;
  value: number;
  pct: number;
  unlockedAt: string | null;
}

export function achievementViews(s: GameState): AchievementView[] {
  const st = computeStats(s);
  return ACHIEVEMENTS.map((def) => {
    const value = Math.max(0, def.value(st, s));
    const unlockedAt = s.achievements[def.id] ?? null;
    return { def, value, pct: unlockedAt ? 100 : Math.min(99, Math.floor((value / def.target) * 100)), unlockedAt };
  });
}

/** Ids of achievements newly unlocked in `s`. */
export function newAchievements(s: GameState): string[] {
  const st = computeStats(s);
  return ACHIEVEMENTS.filter((a) => !s.achievements[a.id] && a.value(st, s) >= a.target).map((a) => a.id);
}

/** The locked achievements closest to completion. */
export function nextUp(views: AchievementView[], n = 3): AchievementView[] {
  return views
    .filter((v) => !v.unlockedAt && !v.def.secret && v.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, n);
}
