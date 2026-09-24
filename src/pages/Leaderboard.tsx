import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { useBoard } from '../store/useBoard';
import { buildBoard, periodKey, type Period } from '../domain/leaderboard';
import { dayKey } from '../domain/util';
import type { Scope } from '../services/cloud';
import { En, Loading, PageHeader, Tabs } from '../components/ui';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const { state, update } = useGame();
  const [period, setPeriod] = useState<Period>('weekly');
  const [scope, setScope] = useState<Scope>('friends');
  const board = useBoard(period, scope);
  const today = dayKey();
  const profile = state.profile!;
  const pk = periodKey(period, today);
  const myXp = Object.entries(state.progress.days)
    .filter(([d]) => periodKey(period, d) === pk)
    .reduce((s, [, v]) => s + v.xp, 0);

  const periodTabs = (
    <Tabs
      value={period}
      onChange={setPeriod}
      options={[
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
      ]}
    />
  );

  if (board.ready) {
    // my own row uses the local number (it may be a few seconds ahead of the server)
    const rows = (board.rows ?? []).map((r) => (r.is_me ? { ...r, xp: Math.max(r.xp, myXp) } : r)).sort((a, b) => b.xp - a.xp);
    const onlyMe = rows.length <= 1 && scope === 'friends';
    return (
      <div className="stack q-wrap">
        <PageHeader title={<><En>Leaderboard</En> 🏆</>} />
        <Tabs
          value={scope}
          onChange={setScope}
          options={[
            { value: 'friends', label: '👥 חברים' },
            { value: 'global', label: '🌍 כולם' },
          ]}
        />
        {periodTabs}
        <div className="card">
          {board.error ? (
            <div className="notice warn">⚠️ לא הצלחתי לטעון את הטבלה. בדוק חיבור לאינטרנט.</div>
          ) : !board.rows ? (
            <Loading />
          ) : (
            <div className="list">
              {rows.map((r, i) => (
                <div key={r.user_id} className={`list-item ${r.is_me ? 'me' : ''}`}>
                  <span className="rank">{MEDALS[i] ?? i + 1}</span>
                  <span className="avatar">{r.avatar}</span>
                  <span style={{ flex: 1 }}>
                    <b>{r.display_name}</b> {r.is_me && <span className="chip primary">אתה</span>}
                    <div className="xs muted" dir="ltr" style={{ textAlign: 'right' }}>
                      @{r.username}
                    </div>
                  </span>
                  <span className="num bold en-inline">{r.xp.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {onlyMe && (
          <Link to="/friends" className="card link">
            <div className="row">
              <div className="emoji-badge">👥</div>
              <div>
                <b>עוד אין חברים בטבלה</b>
                <div className="faint">הוסף חברים לפי שם משתמש כדי להתחרות בהם</div>
              </div>
            </div>
          </Link>
        )}
        <p className="faint center">שבוע מתחיל ביום ראשון. הטבלה מתעדכנת כמה שניות אחרי כל תרגול.</p>
      </div>
    );
  }

  const bots = buildBoard(period, today, { name: profile.name, avatar: profile.avatar, xp: myXp, public: profile.publicProfile }, 12);
  return (
    <div className="stack q-wrap">
      <PageHeader title={<><En>Leaderboard</En> 🏆</>} />
      <Link to="/account" className="card hero link">
        <div className="row" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '2rem' }}>☁️</div>
          <div>
            <b>התחבר כדי להתחרות בחברים אמיתיים</b>
            <div className="muted">עד אז, מולך בטבלה יריבים מדומים</div>
          </div>
        </div>
      </Link>
      {periodTabs}
      <div className="card">
        <div className="list">
          {bots.map((r, i) => (
            <div key={r.id} className={`list-item ${r.isMe ? 'me' : ''}`}>
              <span className="rank">{MEDALS[i] ?? i + 1}</span>
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
    </div>
  );
}
