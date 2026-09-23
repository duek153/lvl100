// Varied, grown-up feedback lines. Never "FAILED".

const pick = <T,>(arr: T[], seed?: number) => arr[Math.abs(seed ?? Math.floor(Math.random() * 1e9)) % arr.length];

export const CORRECT = [
  'Nice!',
  'Sharp.',
  'Exactly right.',
  'Clean answer.',
  'You nailed it.',
  'Spot on.',
  'That’s the one.',
];

export const HARD_CORRECT = ['That was a tough one — well played.', 'Hard question, right answer.', 'Advanced-level move.'];

export const WRONG = ['Not quite.', 'Close — let’s see why.', 'Good try. Here’s the trick:', 'That one’s sneaky.'];

export const COMBO = ['Nice streak!', 'You’re on a roll!', 'Combo! Keep it going.', 'Unstoppable run.'];

export function feedbackLine(correct: boolean, difficulty: number, combo: number): string {
  if (!correct) return pick(WRONG);
  if (combo >= 5 && combo % 5 === 0) return pick(COMBO);
  if (difficulty >= 3) return pick(HARD_CORRECT);
  return pick(CORRECT);
}

/** End-of-session headline (Hebrew UI). */
export function sessionHeadline(pct: number): { title: string; sub: string } {
  if (pct >= 90) return { title: 'מושלם כמעט 🔥', sub: 'One step closer to 100.' };
  if (pct >= 75) return { title: 'סשן חזק 💪', sub: 'Your English is improving.' };
  if (pct >= 55) return { title: 'התקדמות יפה', sub: 'עוד קצת תרגול וזה יושב.' };
  return { title: 'Not there yet', sub: "Let's train this skill — כל טעות היא נתון שהמערכת לומדת ממנו." };
}

export function weeklyInsight(thisWeekAcc: number, lastWeekAcc: number, skillHe: string): string | null {
  if (lastWeekAcc > 0 && thisWeekAcc - lastWeekAcc >= 5) return `ב${skillHe} אתה חזק יותר מבשבוע שעבר (+${thisWeekAcc - lastWeekAcc}%).`;
  return null;
}
