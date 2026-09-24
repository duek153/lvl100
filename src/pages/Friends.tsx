import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { useCloud } from '../store/CloudContext';
import { useUI } from '../store/UIContext';
import { decodeChallenge } from '../services/sessions';
import { cloudErrorHe, myFriends, removeFriend, respondFriendRequest, searchProfiles, sendFriendRequest, type FriendRow, type SearchRow } from '../services/cloud';
import { uid } from '../domain/util';
import { Empty, En, Loading, PageHeader } from '../components/ui';

const SEND_MSG: Record<string, string> = {
  sent: '📨 הבקשה נשלחה',
  accepted: '🤝 אתם חברים עכשיו!',
  already_friends: 'אתם כבר חברים',
  not_found: 'לא נמצא משתמש בשם הזה',
  self: 'זה אתה 🙂',
};

function ChallengeCard() {
  const nav = useNavigate();
  const [link, setLink] = useState('');
  const [err, setErr] = useState('');
  const accept = () => {
    const m = link.match(/[?&]c=([A-Za-z0-9_-]+)/);
    const code = m ? m[1] : link.trim();
    if (!decodeChallenge(code)) return setErr('הקישור לא תקין');
    nav(`/play/friend?c=${code}`);
  };
  return (
    <>
      <div className="card hero pad-lg">
        <h2 style={{ position: 'relative', zIndex: 1 }}>
          ⚔️ <En>Challenge Friend</En>
        </h2>
        <p className="muted" style={{ position: 'relative', zIndex: 1 }}>
          10 שאלות. אותן שאלות, אותו קושי. מי שעונה נכון על יותר שאלות מנצח, ובתיקו מנצח המהיר יותר. שחק ושלח לחבר את הקישור.
        </p>
        <button className="btn white" onClick={() => nav('/play/friend')} style={{ position: 'relative', zIndex: 1 }}>
          צור אתגר חדש
        </button>
      </div>
      <div className="card">
        <h3>קיבלת קישור לאתגר?</h3>
        <div className="row">
          <input type="text" placeholder="הדבק כאן את הקישור" value={link} onChange={(e) => (setLink(e.target.value), setErr(''))} dir="ltr" aria-label="קישור אתגר" />
          <button className="btn" onClick={accept}>
            קבל
          </button>
        </div>
        {err && <p className="small" style={{ color: 'var(--danger)' }}>{err}</p>}
      </div>
    </>
  );
}

function CloudFriends() {
  const ui = useUI();
  const cloud = useCloud();
  const [friends, setFriends] = useState<FriendRow[] | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(() => {
    myFriends()
      .then(setFriends)
      .catch((e) => ui.toast('⚠️ ' + cloudErrorHe(e)));
  }, [ui]);
  useEffect(reload, [reload]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => searchProfiles(term).then(setResults).catch(() => setResults([])), 350);
    return () => clearTimeout(t);
  }, [q]);

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      ui.toast('⚠️ ' + cloudErrorHe(e));
    } finally {
      setBusy(null);
      reload();
    }
  };

  const add = (username: string) =>
    act('add-' + username, async () => {
      const r = await sendFriendRequest(username);
      ui.toast(SEND_MSG[r] ?? r, r === 'accepted' ? 'success' : 'info');
      if (q.trim().length >= 2) setResults(await searchProfiles(q.trim()));
    });

  const incoming = friends?.filter((f) => f.status === 'pending' && f.incoming) ?? [];
  const outgoing = friends?.filter((f) => f.status === 'pending' && !f.incoming) ?? [];
  const accepted = (friends?.filter((f) => f.status === 'accepted') ?? []).sort((a, b) => b.week_xp - a.week_xp);

  return (
    <>
      <div className="card stack">
        <h3 style={{ margin: 0 }}>🔎 הוספת חבר</h3>
        <input type="text" dir="ltr" placeholder="שם משתמש (למשל noa_12)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש משתמש" />
        <p className="faint" style={{ margin: 0 }}>
          שם המשתמש שלך: <b dir="ltr">@{cloud.profile?.username}</b>. שלח אותו לחברים כדי שיוסיפו אותך.
        </p>
        {results && (
          <div className="list">
            {results.length === 0 && <p className="faint">לא נמצאו משתמשים. חשבון פרטי מופיע רק בחיפוש שם המשתמש המדויק.</p>}
            {results.map((r) => (
              <div key={r.id} className="list-item">
                <span className="avatar">{r.avatar}</span>
                <span style={{ flex: 1 }}>
                  <b>{r.display_name}</b>
                  <div className="xs muted" dir="ltr" style={{ textAlign: 'right' }}>
                    @{r.username}
                  </div>
                </span>
                {r.relation === 'friend' ? (
                  <span className="chip success">חברים ✓</span>
                ) : r.relation === 'sent' ? (
                  <span className="chip">נשלחה בקשה</span>
                ) : (
                  <button className="btn sm" disabled={busy === 'add-' + r.username} onClick={() => add(r.username)}>
                    {r.relation === 'received' ? 'אשר חברות' : '+ הוסף'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {incoming.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--primary)' }}>
          <h3>📬 בקשות חברות ({incoming.length})</h3>
          <div className="list">
            {incoming.map((f) => (
              <div key={f.id} className="list-item">
                <span className="avatar">{f.avatar}</span>
                <span style={{ flex: 1 }}>
                  <b>{f.display_name}</b>
                  <div className="xs muted" dir="ltr" style={{ textAlign: 'right' }}>
                    @{f.username}
                  </div>
                </span>
                <button className="btn sm success" disabled={!!busy} onClick={() => act('acc', () => respondFriendRequest(f.id, true))}>
                  אשר
                </button>
                <button className="btn sm ghost" disabled={!!busy} onClick={() => act('dec', () => respondFriendRequest(f.id, false))}>
                  דחה
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">
          <h3 style={{ margin: 0 }}>👥 החברים שלי</h3>
          <Link to="/leaderboard" className="small">
            לטבלה ←
          </Link>
        </div>
        {!friends ? (
          <Loading />
        ) : accepted.length === 0 ? (
          <Empty emoji="🤝" title="עוד אין חברים">
            <p className="faint">חפש חבר לפי שם המשתמש שלו, או שלח לו את שלך.</p>
          </Empty>
        ) : (
          <div className="list">
            {accepted.map((f) => (
              <div key={f.id} className="list-item">
                <span className="avatar">{f.avatar}</span>
                <span style={{ flex: 1 }}>
                  <b>{f.display_name}</b>
                  <div className="xs muted" dir="ltr" style={{ textAlign: 'right' }}>
                    @{f.username}
                  </div>
                </span>
                <span className="num small en-inline">{f.week_xp.toLocaleString()} XP</span>
                <button className="icon-btn" aria-label={`הסר את ${f.display_name}`} title="הסר חבר" disabled={!!busy} onClick={() => act('rm', () => removeFriend(f.id))}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {outgoing.length > 0 && (
          <p className="faint" style={{ marginTop: 10 }}>
            ממתינים לאישור: <span dir="ltr">{outgoing.map((f) => '@' + f.username).join(', ')}</span>
          </p>
        )}
        <p className="faint" style={{ marginTop: 6 }}>XP מתחילת השבוע (יום ראשון)</p>
      </div>
    </>
  );
}

function LocalFriends() {
  const { state, update } = useGame();
  const [name, setName] = useState('');
  return (
    <>
      <Link to="/account" className="card link" style={{ borderColor: 'var(--primary)' }}>
        <div className="row">
          <div className="emoji-badge">☁️</div>
          <div>
            <b>התחבר כדי להוסיף חברים אמיתיים</b>
            <div className="faint">חיפוש לפי שם משתמש, Leaderboard משותף וסנכרון בין מכשירים</div>
          </div>
        </div>
      </Link>
      <div className="card">
        <h3>יריבים מאתגרים</h3>
        {state.friends.length === 0 ? (
          <p className="faint">כשתשחק אתגר של חבר, הוא יופיע כאן עם התוצאה.</p>
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
              </div>
            ))}
          </div>
        )}
        <div className="row" style={{ marginTop: 12 }}>
          <input type="text" placeholder="הוסף שם לרשימה" value={name} onChange={(e) => setName(e.target.value)} aria-label="שם חבר" />
          <button
            className="btn ghost"
            onClick={() => {
              if (!name.trim()) return;
              update((s) => ({ ...s, friends: [...s.friends, { id: uid('f'), name: name.trim(), addedAt: new Date().toISOString() }] }));
              setName('');
            }}
          >
            הוסף
          </button>
        </div>
      </div>
    </>
  );
}

export default function Friends() {
  const cloud = useCloud();
  return (
    <div className="stack q-wrap">
      <PageHeader title="חברים 👥" sub={<En>Beat your friend</En>} />
      {cloud.status === 'ready' ? <CloudFriends /> : cloud.status === 'loading' ? <Loading /> : <LocalFriends />}
      <ChallengeCard />
    </div>
  );
}
