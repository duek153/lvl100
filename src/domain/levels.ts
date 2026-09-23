// Level system: 20 named levels on a smooth XP curve.

export interface LevelDef {
  level: number;
  name: string;
  nameHe: string;
  emoji: string;
}

export const LEVELS: LevelDef[] = [
  { level: 1, name: 'Beginner', nameHe: 'מתחיל', emoji: '🌱' },
  { level: 2, name: 'Word Hunter', nameHe: 'צייד מילים', emoji: '🏹' },
  { level: 3, name: 'Grammar Rookie', nameHe: 'טירון דקדוק', emoji: '🧩' },
  { level: 4, name: 'Sentence Builder', nameHe: 'בונה משפטים', emoji: '🧱' },
  { level: 5, name: 'Reader', nameHe: 'קורא', emoji: '📖' },
  { level: 6, name: 'Context Detective', nameHe: 'בלש הקשרים', emoji: '🔎' },
  { level: 7, name: 'Vocab Striker', nameHe: 'חלוץ מילים', emoji: '⚡' },
  { level: 8, name: 'Tense Tamer', nameHe: 'מאלף הזמנים', emoji: '⏳' },
  { level: 9, name: 'Restatement Rider', nameHe: 'רוכב הניסוחים', emoji: '🏄' },
  { level: 10, name: 'Passage Pilot', nameHe: 'טייס אנסינים', emoji: '✈️' },
  { level: 11, name: 'Syntax Ninja', nameHe: 'נינג׳ת תחביר', emoji: '🥷' },
  { level: 12, name: 'Idea Decoder', nameHe: 'מפענח רעיונות', emoji: '🧠' },
  { level: 13, name: 'Fluent Explorer', nameHe: 'חוקר שוטף', emoji: '🧭' },
  { level: 14, name: 'Academic Ace', nameHe: 'אס אקדמי', emoji: '🎓' },
  { level: 15, name: 'Speed Reader', nameHe: 'קורא בזק', emoji: '🚀' },
  { level: 16, name: 'Precision Master', nameHe: 'מאסטר דיוק', emoji: '🎯' },
  { level: 17, name: 'Exam Tactician', nameHe: 'טקטיקן מבחנים', emoji: '♟️' },
  { level: 18, name: 'Advanced Elite', nameHe: 'עלית מתקדמים', emoji: '💎' },
  { level: 19, name: 'Exemption Hunter', nameHe: 'צייד פטור', emoji: '🦅' },
  { level: 20, name: 'AmirNet Challenger', nameHe: 'מתמודד אמירנט', emoji: '👑' },
];

export const MAX_LEVEL = LEVELS.length;

/** XP needed to go from level k to k+1. */
export function xpForStep(k: number): number {
  return Math.round(100 * Math.pow(k, 1.2));
}

/** Total XP required to reach `level` (level 1 = 0). */
export function totalXpForLevel(level: number): number {
  let sum = 0;
  for (let k = 1; k < level; k++) sum += xpForStep(k);
  return sum;
}

export interface LevelInfo {
  level: number;
  def: LevelDef;
  xpIntoLevel: number;
  xpForNext: number;
  pct: number;
  isMax: boolean;
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  while (level < MAX_LEVEL && xp >= totalXpForLevel(level + 1)) level++;
  const isMax = level === MAX_LEVEL;
  const base = totalXpForLevel(level);
  const xpForNext = isMax ? 0 : xpForStep(level);
  const xpIntoLevel = xp - base;
  return {
    level,
    def: LEVELS[level - 1],
    xpIntoLevel,
    xpForNext,
    pct: isMax ? 100 : Math.min(100, Math.round((xpIntoLevel / xpForNext) * 100)),
    isMax,
  };
}
