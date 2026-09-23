// Core domain types. These mirror the tables in supabase/schema.sql so the
// local repository can later be swapped for a server-backed one.

export type Skill = 'vocabulary' | 'grammar' | 'reading' | 'restatement';
export const SKILLS: Skill[] = ['vocabulary', 'grammar', 'reading', 'restatement'];

/** 1 Easy · 2 Medium · 3 Hard · 4 Very Hard */
export type Difficulty = 1 | 2 | 3 | 4;

export type QuestionType =
  | 'word_meaning' // What is the meaning of X? (Hebrew options)
  | 'word_reverse' // Which English word means <Hebrew>?
  | 'closest_meaning' // Choose the word closest in meaning to X
  | 'sentence_completion'
  | 'restatement'
  | 'grammar'
  | 'reading';

export interface Question {
  id: string;
  type: QuestionType;
  skill: Skill;
  difficulty: Difficulty;
  topic: string;
  prompt: string;
  options: string[];
  /** index into options */
  answer: number;
  /** short Hebrew explanation shown after answering */
  explanation: string;
  passageId?: string;
  wordId?: string;
  /** direction of option text; Hebrew options are rtl */
  optionsDir?: 'ltr' | 'rtl';
}

export interface Word {
  id: string;
  en: string;
  he: string;
  pos: 'n' | 'v' | 'adj' | 'adv' | 'conj' | 'prep' | 'phr';
  example: string;
  difficulty: Difficulty;
  category: string;
}

export interface Passage {
  id: string;
  title: string;
  emoji: string;
  topic: string;
  difficulty: Difficulty;
  minutes: number;
  paragraphs: string[];
  questions: Question[];
}

export interface GrammarTopic {
  id: string;
  title: string;
  titleHe: string;
  emoji: string;
  /** Hebrew explanation bullet points */
  explanation: string[];
  /** English examples */
  examples: string[];
}

export type SessionMode =
  | 'practice'
  | 'placement'
  | 'daily'
  | 'boss'
  | 'test'
  | 'simulation'
  | 'mistakes'
  | 'weak'
  | 'friend'
  | 'review';

export interface AnswerRecord {
  id: string;
  questionId: string;
  type: QuestionType;
  skill: Skill;
  topic: string;
  difficulty: Difficulty;
  correct: boolean;
  userAnswer: number | null;
  correctAnswer: number;
  ms: number;
  date: string; // ISO timestamp
  mode: SessionMode;
  confidence?: 'know' | 'practice';
}

export interface UserWord {
  wordId: string;
  seen: number;
  correct: number;
  wrong: number;
  /** consecutive correct reviews */
  streak: number;
  ease: number;
  /** days */
  interval: number;
  /** YYYY-MM-DD */
  due: string;
  lastSeen: string;
  lastMistake?: string;
}

export type Goal = 'exemption' | 'advanced' | 'improve' | 'degree';
export type SelfLevel = 'zero' | 'beginner' | 'basic' | 'intermediate' | 'advanced';

export interface Profile {
  name: string;
  goal: Goal;
  selfLevel: SelfLevel;
  reportedScore: number | null;
  targetScore: number;
  examDate: string | null; // YYYY-MM-DD
  daysPerWeek: number;
  minutesPerDay: number;
  createdAt: string;
  onboarded: boolean;
  placementDone: boolean;
  publicProfile: boolean;
  avatar: string;
}

export interface StreakState {
  current: number;
  longest: number;
  lastDay: string | null;
  freezes: number;
  freezesUsed: number;
}

export interface DayStats {
  questions: number;
  correct: number;
  xp: number;
  ms: number;
}

export interface Progress {
  /** total XP ever earned (drives levels) */
  xp: number;
  /** XP spent in the shop (streak freezes); wallet = xp - xpSpent */
  xpSpent: number;
  ability: Record<Skill, number>;
  abilityN: Record<Skill, number>;
  /** practice difficulty per skill, driven by the adaptive controller */
  practiceLevel: Record<Skill, Difficulty>;
  streak: StreakState;
  days: Record<string, DayStats>;
  scoreHistory: { date: string; score: number }[];
  /** best % per boss id */
  bosses: Record<string, number>;
  /** best % per progress test id */
  tests: Record<string, number>;
  bestCombo: number;
  fastCorrect: number;
  questsClaimed: Record<string, true>;
  dailyDone: Record<string, number>;
}

export type AttemptKind = 'placement' | 'daily' | 'boss' | 'test' | 'simulation' | 'practice' | 'friend';

export interface Attempt {
  id: string;
  kind: AttemptKind;
  refId?: string;
  date: string;
  total: number;
  correct: number;
  ms: number;
  xp: number;
  score?: number;
  meta?: Record<string, unknown>;
}

export type ThemeSetting = 'light' | 'dark' | 'system';

export interface Settings {
  theme: ThemeSetting;
  reducedMotion: boolean;
  sound: boolean;
  reminders: { enabled: boolean; time: string; days: number[] };
}

export interface Friend {
  id: string;
  name: string;
  addedAt: string;
  lastChallenge?: { mine: number; theirs: number; date: string };
}

export interface GameState {
  profile: Profile | null;
  progress: Progress;
  answers: AnswerRecord[];
  vocab: Record<string, UserWord>;
  attempts: Attempt[];
  achievements: Record<string, string>;
  settings: Settings;
  friends: Friend[];
}
