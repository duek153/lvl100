// GameService: every state transition in one place, as pure functions.
// The UI never mutates XP/scores directly — it calls these. When moving to
// Supabase, these become server-side RPCs and the client only sends answers.
import type {
  AnswerRecord,
  Attempt,
  AttemptKind,
  Difficulty,
  GameState,
  Profile,
  Progress,
  Question,
  SessionMode,
  Settings,
  Skill,
} from '../domain/types';
import { SKILLS } from '../domain/types';
import { xpForAnswer, XP, type AnswerXp } from '../domain/xp';
import { TARGET_MS, estimatedScore, updateAbility, scoreToTheta } from '../domain/scoring';
import { nextDifficulty, difficultyForAbility } from '../domain/adaptive';
import { registerStudyDay, emptyStreak, buyFreeze as buyFreezeStreak, STREAK_MIN_QUESTIONS, MAX_FREEZES } from '../domain/streak';
import { newUserWord, review, type Grade } from '../domain/srs';
import { newAchievements } from '../domain/achievements';
import { dailyQuest } from '../domain/quests';
import { SELF_LEVEL_THETA, type PlacementResult } from '../domain/placement';
import { dayKey, uid } from '../domain/util';

const zeroSkills = <T,>(v: T) => Object.fromEntries(SKILLS.map((s) => [s, v])) as Record<Skill, T>;

export function emptyProgress(): Progress {
  return {
    xp: 0,
    xpSpent: 0,
    ability: zeroSkills(-1),
    abilityN: zeroSkills(0),
    practiceLevel: zeroSkills(1 as Difficulty),
    streak: emptyStreak(),
    days: {},
    scoreHistory: [],
    bosses: {},
    tests: {},
    bestCombo: 0,
    fastCorrect: 0,
    questsClaimed: {},
    dailyDone: {},
  };
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  reducedMotion: false,
  sound: true,
  reminders: { enabled: false, time: '19:00', days: [0, 1, 2, 3, 4] },
};

export function initialState(): GameState {
  return {
    profile: null,
    progress: emptyProgress(),
    answers: [],
    vocab: {},
    attempts: [],
    achievements: {},
    settings: DEFAULT_SETTINGS,
    friends: [],
  };
}

/** Modes whose answers move the practice (adaptive) difficulty. */
const ADAPTIVE_MODES: SessionMode[] = ['practice', 'weak', 'mistakes', 'review'];
/** Modes that should not update SRS scheduling (tests measure, not teach). */
const MEASURE_MODES: SessionMode[] = ['simulation', 'placement'];

function recordScorePoint(p: Progress, today: string): Progress {
  const score = estimatedScore(p.ability);
  const hist = p.scoreHistory.filter((h) => h.date !== today);
  hist.push({ date: today, score });
  return { ...p, scoreHistory: hist.slice(-400) };
}

export interface AnswerOutcome {
  state: GameState;
  record: AnswerRecord;
  xp: AnswerXp;
  bonusXp: number;
  unlocked: string[];
  streakExtended: boolean;
}

export function applyAnswer(
  state: GameState,
  q: Question,
  userAnswer: number | null,
  ms: number,
  mode: SessionMode,
  combo: number,
  now: Date = new Date(),
): AnswerOutcome {
  const today = dayKey(now);
  const correct = userAnswer === q.answer;
  const target = TARGET_MS[q.type] ?? 30_000;
  const xp = mode === 'simulation' ? { base: 0, difficulty: 0, speed: 0, combo: 0, total: 0 } : xpForAnswer(correct, q.difficulty, ms, target, combo);

  const record: AnswerRecord = {
    id: uid('a'),
    questionId: q.id,
    type: q.type,
    skill: q.skill,
    topic: q.topic,
    difficulty: q.difficulty,
    correct,
    userAnswer,
    correctAnswer: q.answer,
    ms,
    date: now.toISOString(),
    mode,
  };

  let p = state.progress;
  const ability = { ...p.ability, [q.skill]: updateAbility(p.ability[q.skill], p.abilityN[q.skill], q.difficulty, correct) };
  const abilityN = { ...p.abilityN, [q.skill]: p.abilityN[q.skill] + 1 };

  let practiceLevel = p.practiceLevel;
  const answers = [...state.answers, record];
  if (ADAPTIVE_MODES.includes(mode)) {
    const recent = answers
      .filter((a) => a.skill === q.skill && ADAPTIVE_MODES.includes(a.mode))
      .slice(-5)
      .map((a) => ({ correct: a.correct, ms: a.ms, targetMs: TARGET_MS[a.type] ?? 30_000 }));
    const next = nextDifficulty(p.practiceLevel[q.skill], recent);
    practiceLevel = { ...p.practiceLevel, [q.skill]: next };
  }

  const day = p.days[today] ?? { questions: 0, correct: 0, xp: 0, ms: 0 };
  const newDay = { questions: day.questions + 1, correct: day.correct + (correct ? 1 : 0), xp: day.xp + xp.total, ms: day.ms + ms };

  // streak: day qualifies once it reaches the minimum question count
  let streak = p.streak;
  let bonusXp = 0;
  let streakExtended = false;
  if (newDay.questions >= STREAK_MIN_QUESTIONS && p.streak.lastDay !== today) {
    streak = registerStudyDay(p.streak, today);
    bonusXp += XP.studyDay;
    streakExtended = true;
  }
  newDay.xp += bonusXp;

  p = {
    ...p,
    xp: p.xp + xp.total + bonusXp,
    ability,
    abilityN,
    practiceLevel,
    streak,
    days: { ...p.days, [today]: newDay },
    bestCombo: Math.max(p.bestCombo, correct ? combo : 0),
    fastCorrect: p.fastCorrect + (correct && ms <= target ? 1 : 0),
  };
  p = recordScorePoint(p, today);

  let vocab = state.vocab;
  if (q.wordId && !MEASURE_MODES.includes(mode)) {
    const uw = vocab[q.wordId] ?? newUserWord(q.wordId, today);
    vocab = { ...vocab, [q.wordId]: review(uw, correct ? 2 : 0, today) };
  }

  let next: GameState = { ...state, progress: p, answers, vocab };
  const unlocked = newAchievements(next);
  if (unlocked.length) next = unlockAll(next, unlocked, now);
  return { state: next, record, xp, bonusXp, unlocked, streakExtended };
}

function unlockAll(state: GameState, ids: string[], now: Date): GameState {
  const achievements = { ...state.achievements };
  for (const id of ids) achievements[id] = now.toISOString();
  return { ...state, achievements };
}

/** "I know this" / "Need practice" after an answer. */
export function applyConfidence(state: GameState, answerId: string, conf: 'know' | 'practice', now = new Date()): GameState {
  const idx = state.answers.findIndex((a) => a.id === answerId);
  if (idx < 0) return state;
  const a = state.answers[idx];
  const answers = state.answers.slice();
  answers[idx] = { ...a, confidence: conf };
  let vocab = state.vocab;
  const wordId = a.questionId.startsWith('wm-') || a.questionId.startsWith('wr-') ? a.questionId.slice(3) : null;
  if (wordId && a.correct && vocab[wordId]) {
    // re-grade the review that just happened
    const today = dayKey(now);
    const w = vocab[wordId];
    const before = { ...w, seen: w.seen - 1, correct: w.correct - 1, streak: Math.max(0, w.streak - 1) };
    vocab = { ...vocab, [wordId]: review(before, (conf === 'know' ? 3 : 1) as Grade, today) };
  }
  return { ...state, answers, vocab };
}

/** Flashcard self-grade (no question; affects SRS only). */
export function gradeFlashcard(state: GameState, wordId: string, grade: Grade, now = new Date()): GameState {
  const today = dayKey(now);
  const uw = state.vocab[wordId] ?? newUserWord(wordId, today);
  return { ...state, vocab: { ...state.vocab, [wordId]: review(uw, grade, today) } };
}

export interface FinishInput {
  kind: AttemptKind;
  refId?: string;
  total: number;
  correct: number;
  ms: number;
  score?: number;
  meta?: Record<string, unknown>;
}

export interface FinishOutcome {
  state: GameState;
  attempt: Attempt;
  bonusXp: number;
  unlocked: string[];
  passed?: boolean;
}

export function finishSession(state: GameState, input: FinishInput, now = new Date()): FinishOutcome {
  const today = dayKey(now);
  const pct = input.total ? Math.round((input.correct / input.total) * 100) : 0;
  let p = state.progress;
  let bonusXp = 0;
  let passed: boolean | undefined;

  switch (input.kind) {
    case 'daily':
      if (p.dailyDone[today] === undefined) {
        bonusXp = Math.round((input.correct / Math.max(1, input.total)) * XP.dailyChallengeMax);
        p = { ...p, dailyDone: { ...p.dailyDone, [today]: pct } };
      }
      break;
    case 'boss': {
      const prev = p.bosses[input.refId!] ?? 0;
      passed = pct >= 70;
      if (passed && prev < 70) bonusXp = XP.boss;
      p = { ...p, bosses: { ...p.bosses, [input.refId!]: Math.max(prev, pct) } };
      break;
    }
    case 'test': {
      const prev = p.tests[input.refId!] ?? 0;
      passed = pct >= 65;
      if (prev === 0) bonusXp = Math.round(XP.progressTest * Math.max(0.4, pct / 100));
      p = { ...p, tests: { ...p.tests, [input.refId!]: Math.max(prev, pct) } };
      break;
    }
    case 'simulation':
      bonusXp = XP.simulation;
      break;
    case 'friend':
      if (input.meta?.won) bonusXp = XP.friendWin;
      break;
    default:
      break;
  }

  if (bonusXp) {
    const day = p.days[today] ?? { questions: 0, correct: 0, xp: 0, ms: 0 };
    p = { ...p, xp: p.xp + bonusXp, days: { ...p.days, [today]: { ...day, xp: day.xp + bonusXp } } };
  }

  const attempt: Attempt = {
    id: uid('t'),
    kind: input.kind,
    refId: input.refId,
    date: now.toISOString(),
    total: input.total,
    correct: input.correct,
    ms: input.ms,
    xp: bonusXp,
    score: input.score,
    meta: input.meta,
  };
  let next: GameState = { ...state, progress: p, attempts: [...state.attempts, attempt].slice(-500) };
  const unlocked = newAchievements(next);
  if (unlocked.length) next = unlockAll(next, unlocked, now);
  return { state: next, attempt, bonusXp, unlocked, passed };
}

export function claimQuest(state: GameState, now = new Date()): { state: GameState; xp: number } {
  const today = dayKey(now);
  const q = dailyQuest(state.answers, state.progress, state.profile, today);
  if (!q.complete || q.claimed) return { state, xp: 0 };
  const day = state.progress.days[today] ?? { questions: 0, correct: 0, xp: 0, ms: 0 };
  return {
    state: {
      ...state,
      progress: {
        ...state.progress,
        xp: state.progress.xp + XP.dailyQuest,
        questsClaimed: { ...state.progress.questsClaimed, [today]: true },
        days: { ...state.progress.days, [today]: { ...day, xp: day.xp + XP.dailyQuest } },
      },
    },
    xp: XP.dailyQuest,
  };
}

export function buyFreeze(state: GameState): { state: GameState; ok: boolean; reason?: string } {
  const p = state.progress;
  if (p.streak.freezes >= MAX_FREEZES) return { state, ok: false, reason: `אפשר להחזיק עד ${MAX_FREEZES} הקפאות` };
  if (p.xp - p.xpSpent < XP.streakFreezeCost) return { state, ok: false, reason: `צריך ${XP.streakFreezeCost} XP פנויים` };
  // Spending never lowers the level: levels use total earned XP.
  return {
    state: { ...state, progress: { ...p, xpSpent: p.xpSpent + XP.streakFreezeCost, streak: buyFreezeStreak(p.streak) } },
    ok: true,
  };
}

export function completeOnboarding(state: GameState, profile: Profile, now = new Date()): GameState {
  const theta = profile.reportedScore ? scoreToTheta(profile.reportedScore) : SELF_LEVEL_THETA[profile.selfLevel];
  const ability = zeroSkills(theta);
  const practiceLevel = zeroSkills(difficultyForAbility(theta));
  const progress = recordScorePoint({ ...state.progress, ability, practiceLevel }, dayKey(now));
  return { ...state, profile: { ...profile, onboarded: true }, progress };
}

export function completePlacement(state: GameState, result: PlacementResult, now = new Date()): GameState {
  if (!state.profile) return state;
  const practiceLevel = { ...state.progress.practiceLevel };
  for (const s of SKILLS) practiceLevel[s] = difficultyForAbility(result.ability[s]);
  // the placement result becomes the baseline of the score history
  const progress: Progress = {
    ...state.progress,
    ability: result.ability,
    practiceLevel,
    xp: state.progress.xp + XP.placement,
    scoreHistory: [{ date: dayKey(now), score: result.score }],
  };
  let next: GameState = { ...state, profile: { ...state.profile, placementDone: true }, progress };
  const unlocked = newAchievements(next);
  if (unlocked.length) next = unlockAll(next, unlocked, now);
  return next;
}
