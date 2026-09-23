// "Road to 100": stages, bosses and progress tests.
import type { AnswerRecord, Difficulty, Progress, Skill } from './types';

export interface BossSpec {
  id: string;
  name: string;
  emoji: string;
  skills: Skill[];
  difficulty: Difficulty;
  count: number;
  passPct: number;
  seconds: number;
}

export interface Stage {
  id: string;
  index: number;
  title: string;
  titleHe: string;
  emoji: string;
  skills: Skill[];
  requiredQuestions: number;
  /** estimated score this stage aims at (shown as the stage's score target) */
  scoreTarget: number;
  boss: BossSpec;
}

const boss = (id: string, name: string, emoji: string, skills: Skill[], difficulty: Difficulty, count = 10, seconds = 300): BossSpec => ({
  id,
  name,
  emoji,
  skills,
  difficulty,
  count,
  passPct: 70,
  seconds,
});

export const STAGES: Stage[] = [
  { id: 's1', index: 1, title: 'Foundations', titleHe: 'יסודות', emoji: '🌱', skills: ['vocabulary', 'grammar'], requiredQuestions: 25, scoreTarget: 70, boss: boss('boss-1', 'Warm-up Golem', '🗿', ['vocabulary', 'grammar'], 1, 8, 240) },
  { id: 's2', index: 2, title: 'Word Power', titleHe: 'כוח מילים', emoji: '🏹', skills: ['vocabulary'], requiredQuestions: 40, scoreTarget: 78, boss: boss('boss-2', 'Vocabulary Boss', '🐉', ['vocabulary'], 2) },
  { id: 's3', index: 3, title: 'Grammar Core', titleHe: 'ליבת הדקדוק', emoji: '🧩', skills: ['grammar'], requiredQuestions: 40, scoreTarget: 85, boss: boss('boss-3', 'Grammar Boss', '🦂', ['grammar'], 2) },
  { id: 's4', index: 4, title: 'First Passages', titleHe: 'אנסינים ראשונים', emoji: '📖', skills: ['reading'], requiredQuestions: 15, scoreTarget: 90, boss: boss('boss-4', 'Reading Boss', '🦉', ['reading'], 2, 6, 600) },
  { id: 's5', index: 5, title: 'Restatement Basics', titleHe: 'ניסוח מחדש', emoji: '🔁', skills: ['restatement'], requiredQuestions: 15, scoreTarget: 95, boss: boss('boss-5', 'Mirror Boss', '🪞', ['restatement'], 2, 6, 540) },
  { id: 's6', index: 6, title: 'Intermediate', titleHe: 'בינוניים', emoji: '⚡', skills: ['vocabulary', 'grammar', 'reading', 'restatement'], requiredQuestions: 60, scoreTarget: 100, boss: boss('boss-6', 'Mixed Boss', '🤖', ['vocabulary', 'grammar', 'restatement'], 3, 12, 480) },
  { id: 's7', index: 7, title: 'Advanced Vocabulary', titleHe: 'אוצר מילים מתקדם', emoji: '🔎', skills: ['vocabulary'], requiredQuestions: 60, scoreTarget: 108, boss: boss('boss-7', 'Lexicon Titan', '🦖', ['vocabulary'], 3, 12, 420) },
  { id: 's8', index: 8, title: 'Advanced Reading', titleHe: 'קריאה מתקדמת', emoji: '🧠', skills: ['reading', 'restatement'], requiredQuestions: 40, scoreTarget: 116, boss: boss('boss-8', 'Passage Kraken', '🦑', ['reading', 'restatement'], 3, 8, 780) },
  { id: 's9', index: 9, title: 'AmirNet Ready', titleHe: 'מוכנים לאמירנט', emoji: '🎓', skills: ['vocabulary', 'reading', 'restatement'], requiredQuestions: 80, scoreTarget: 125, boss: boss('boss-9', 'Final Boss', '👹', ['vocabulary', 'reading', 'restatement'], 4, 12, 720) },
];

export type StageStatus = 'locked' | 'active' | 'boss' | 'done';

export interface StageView {
  stage: Stage;
  status: StageStatus;
  answered: number;
  accuracy: number;
  avgSeconds: number;
  bossBest: number | null;
}

export function stageViews(answers: AnswerRecord[], progress: Progress): StageView[] {
  let prevDone = true;
  return STAGES.map((stage) => {
    const rel = answers.filter((a) => stage.skills.includes(a.skill));
    const answered = rel.length;
    const correct = rel.filter((a) => a.correct).length;
    const bossBest = progress.bosses[stage.boss.id] ?? null;
    const done = bossBest !== null && bossBest >= stage.boss.passPct;
    let status: StageStatus;
    if (!prevDone) status = 'locked';
    else if (done) status = 'done';
    else if (answered >= stage.requiredQuestions) status = 'boss';
    else status = 'active';
    prevDone = prevDone && done;
    return {
      stage,
      status,
      answered,
      accuracy: answered ? Math.round((correct / answered) * 100) : 0,
      avgSeconds: answered ? Math.round(rel.reduce((s, a) => s + a.ms, 0) / answered / 1000) : 0,
      bossBest,
    };
  });
}

export function currentStage(views: StageView[]): StageView {
  return views.find((v) => v.status === 'active' || v.status === 'boss') ?? views[views.length - 1];
}

export function findBoss(id: string): BossSpec | undefined {
  return STAGES.find((s) => s.boss.id === id)?.boss;
}

export interface ProgressTestSpec {
  id: string;
  level: number;
  difficulty: Difficulty;
  count: number;
  seconds: number;
  passPct: number;
}

export const PROGRESS_TESTS: ProgressTestSpec[] = [
  { id: 'test-5', level: 5, difficulty: 2, count: 15, seconds: 600, passPct: 65 },
  { id: 'test-10', level: 10, difficulty: 3, count: 15, seconds: 600, passPct: 65 },
  { id: 'test-15', level: 15, difficulty: 4, count: 15, seconds: 600, passPct: 65 },
];
