// Leaderboard. Until a backend exists, rivals are simulated (and labelled as
// such in the UI). Deterministic per period so the board is stable.
import { hashString, rng } from './util';

export type Period = 'daily' | 'weekly' | 'monthly';

export interface Row {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  isMe: boolean;
  simulated: boolean;
}

const NAMES = ['Noa', 'Daniel', 'Maya', 'Itay', 'Yael', 'Omer', 'Shira', 'Ido', 'Tamar', 'Eitan', 'Roni', 'Lior', 'Adi', 'Guy', 'Neta', 'Yonatan', 'Hila', 'Amit', 'Tal', 'Ori'];
const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐙', '🦄', '🐧', '🐨', '🦉', '🐺', '🐬'];

export function periodKey(period: Period, today: string): string {
  if (period === 'daily') return today;
  if (period === 'monthly') return today.slice(0, 7);
  const d = new Date(today + 'T00:00:00');
  d.setDate(d.getDate() - d.getDay()); // week starts Sunday (Israel)
  return 'w' + d.toISOString().slice(0, 10);
}

const SCALE: Record<Period, number> = { daily: 260, weekly: 1500, monthly: 5200 };

export function buildBoard(period: Period, today: string, me: { name: string; avatar: string; xp: number; public: boolean }, size = 10): Row[] {
  const rand = rng(hashString(periodKey(period, today)));
  const rows: Row[] = [];
  const names = NAMES.slice();
  for (let i = 0; i < size - 1; i++) {
    const n = names.splice(Math.floor(rand() * names.length), 1)[0];
    const xp = Math.round(SCALE[period] * (0.25 + rand() * 1.1));
    rows.push({ id: 'bot-' + n, name: n, avatar: AVATARS[Math.floor(rand() * AVATARS.length)], xp, isMe: false, simulated: true });
  }
  rows.push({ id: 'me', name: me.public ? me.name : 'אתה (פרטי)', avatar: me.avatar, xp: me.xp, isMe: true, simulated: false });
  return rows.sort((a, b) => b.xp - a.xp);
}
