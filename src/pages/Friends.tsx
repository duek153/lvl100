import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { decodeChallenge } from '../services/sessions';
import { uid } from '../domain/util';
import { Empty, En, PageHeader } from '../components/ui';

export default function Friends() {
  const { state, update } = useGame();
  const nav = useNavigate();
  const [link, setLink] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');

  const accept = () => {
    const m = link.match(/[?&]c=([A-Za-z0-9_-]+)/);
    const code = m ? m[1] : link.trim();
    if (!decodeChallenge(code)) {
      setErr('הקישור לא תקין');
      return;
    }
    nav(`/play/friend?c=${code}`);
  };

  const addFriend = () => {
    if (!name.trim()) return;
    update((s) => ({ ...s, friends: [...s.friends, { id: uid('f'), name: name.trim(), addedAt: new Date().toISOString() }] }));
    setName('');
  };

  return (
    <div className="stack q-wrap">
      <PageHeader title="חברים 👥" sub={<En>Beat your friend</En>} />
      <div className="card hero pad-lg">
        <h2 style={{ position: 'relative', zIndex: 1 }}>⚔️ <En>Challenge Friend</En></h2>
        <p className="muted" style={{ position: 'relative', zIndex: 1 }}>
          10 שאלות. אותן שאלות, אותו קושי. מי שעונה נכון על יותר שאלות מנצח, ובתיקו מנצח המהיר יותר. שחק ושלח לחבר קישור.
        </p>
        <button className="btn white" onClick={() => nav('/play/friend')} style={{ position: 'relative', zIndex: 1 }}>
          צור אתגר חדש
        </button>
      </div>
      <div className="card">
        <h3>קיבלת אתגר?</h3>
        <div className="row">
          <input type="text" placeholder="הדבק כאן את הקישור" value={link} onChange={(e) => (setLink(e.target.value), setErr(''))} dir="ltr" aria-label="קישור אתגר" />
          <button className="btn" onClick={accept}>
            קבל
          </button>
        </div>
        {err && <p className="small" style={{ color: 'var(--danger)' }}>{err}</p>}
      </div>
      <div className="card">
        <h3>החברים שלי</h3>
        {state.friends.length === 0 ? (
          <Empty emoji="🤝" title="עוד אין חברים ברשימה">
            <p className="faint">חברים נוספים אוטומטית כשאתה משחק את האתגר שלהם</p>
          </Empty>
        ) : (
          <div className="list">
            {state.friends.map((f) => (
              <div key={f.id} className="list-item">
                <span className="avatar">🙂</span>
                <span className="bold" style={{ flex: 1 }}>
                  {f.name}
                </span>
                {f.lastChallenge && (
                  <span className={`chip ${f.lastChallenge.mine > f.lastChallenge.theirs ? 'success' : f.lastChallenge.mine < f.lastChallenge.theirs ? 'danger' : ''}`}>
                    {f.lastChallenge.mine}:{f.lastChallenge.theirs}
                  </span>
                )}
                <button className="btn sm soft" onClick={() => nav('/play/friend')}>
                  אתגר
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="row" style={{ marginTop: 12 }}>
          <input type="text" placeholder="הוסף חבר לפי שם" value={name} onChange={(e) => setName(e.target.value)} aria-label="שם חבר" />
          <button className="btn ghost" onClick={addFriend}>
            <En>Add Friend</En>
          </button>
        </div>
      </div>
      <div className="notice">ℹ️ חיפוש משתמשים וחברים מסונכרנים ידרשו חשבון (Supabase Auth). מבנה ה-DB כבר מוכן (friends, friend_challenges). אתגרים דרך קישור עובדים כבר עכשיו.</div>
    </div>
  );
}
