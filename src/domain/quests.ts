// Daily quest: derived from today's answers, so progress can't drift.
import type { AnswerRecord, Profile, Progress } from './types';
import { XP } from './xp';

export interface QuestTask {
  id: string;
  emoji: string;
  label: string;
  target: number;
  progress: number;
  done: boolean;
  to: string;
}

export interface DailyQuest {
  date: string;
  tasks: QuestTask[];
  complete: boolean;
  claimed: boolean;
  reward: number;
}

/** Quest size scales with the minutes the user committed to. */
export function questTargets(minutes: number) {
  const f = minutes <= 10 ? 0.5 : minutes <= 20 ? 0.8 : minutes <= 30 ? 1 : minutes <= 45 ? 1.3 : 1.6;
  return {
    vocab: Math.max(5, Math.round(10 * f)),
    grammar: Math.max(3, Math.round(5 * f)),
    reading: Math.max(2, Math.round(3 * f)),
  };
}

export function dailyQuest(answers: AnswerRecord[], progress: Progress, profile: Profile | null, today: string): DailyQuest {
  const todays = answers.filter((a) => localDay(a.date) === today);
  const t = questTargets(profile?.minutesPerDay ?? 20);
  const count = (pred: (a: AnswerRecord) => boolean) => todays.filter(pred).length;
  const tasks: QuestTask[] = [
    { id: 'vocab', emoji: '📚', label: `${t.vocab} שאלות אוצר מילים`, target: t.vocab, progress: count((a) => a.skill === 'vocabulary'), done: false, to: '/vocab' },
    { id: 'grammar', emoji: '🧩', label: `${t.grammar} שאלות דקדוק`, target: t.grammar, progress: count((a) => a.skill === 'grammar'), done: false, to: '/grammar' },
    { id: 'reading', emoji: '📖', label: `${t.reading} שאלות קריאה`, target: t.reading, progress: count((a) => a.skill === 'reading'), done: false, to: '/reading' },
    { id: 'challenge', emoji: '⚡', label: 'Mini Challenge יומי', target: 1, progress: progress.dailyDone[today] !== undefined ? 1 : 0, done: false, to: '/daily' },
  ];
  for (const task of tasks) {
    task.progress = Math.min(task.progress, task.target);
    task.done = task.progress >= task.target;
  }
  const complete = tasks.every((x) => x.done);
  return { date: today, tasks, complete, claimed: !!progress.questsClaimed[today], reward: XP.dailyQuest };
}

function localDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export { localDay };
