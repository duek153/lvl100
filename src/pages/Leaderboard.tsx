import { useState } from 'react';
import { useGame } from '../store/GameContext';
import { buildBoard, periodKey, type Period } from '../domain/leaderboard';
import { dayKey } from '../domain/util';
import { En, PageHeader, Tabs } from '../components/ui';

export default function Leaderboard() {
  const { state, update } = useGame();
  const [period, setPeriod] = useState<Period>('daily');
  const today = dayKey();
  const profile = state.profile!;
  const pk = periodKey(period, today);
  const myXp = Object.entries(state.progress.days)
    .filter(([d]) => periodKey(period, d) === pk)
    .reduce((s, [, v]) => s + v.xp, 0);
  const board = buildBoard(period, today, { name: profile.name, avatar: profile.avatar, xp: myXp, public: profile.publicProfile }, 12);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="stack q-wrap">
      <PageHeader title={<><En>Leaderboard</En> 🏆</>} />
      <Tabs
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
      />
      <div className="card">
        <div className="list">
          {board.map((r, i) => (
            <div key={r.id} className={`list-item ${r.isMe ? 'me' : ''}`}>
              <span className="rank">{medals[i] ?? i + 1}</span>
              <span className="avatar">{r.avatar}</span>
              <span className="bold" style={{ flex: 1 }}>
                {r.name} {r.isMe && <span className="chip primary">אתה</span>}
              </span>
              <span className="num bold en-inline">{r.xp.toLocaleString()} XP</span>
            </div>
          ))}
        </div>
      </div>
      <label className="card switch">
        <span>
          <b>{profile.publicProfile ? '🌍 Public Profile' : '🔒 Private Profile'}</b>
          <div className="faint">במצב פרטי השם שלך לא מוצג לאחרים</div>
        </span>
        <input type="checkbox" checked={profile.publicProfile} onChange={(e) => update((s) => ({ ...s, profile: { ...s.profile!, publicProfile: e.target.checked } }))} />
      </label>
      <div className="notice">ℹ️ ב-MVP (בלי שרת) שאר המשתתפים בטבלה הם יריבים מדומים ברמה דומה, כדי לתת תחושת תחרות. ה-XP שלך אמיתי. Leaderboard חי בין משתמשים יופעל עם חיבור ל-Supabase.</div>
    </div>
  );
}
