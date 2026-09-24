import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCloud } from '../store/CloudContext';
import { useGame } from '../store/GameContext';
import { normalizeUsername, validUsername } from '../services/cloud';
import { formatCountdown, loadCooldown, RATE_LIMIT_MS, remainingMs, RESEND_MS, startCooldown } from '../services/emailCooldown';
import { En, Loading } from '../components/ui';

export default function Account() {
  const cloud = useCloud();
  const { state } = useGame();
  const nav = useNavigate();
  const onboarded = !!state.profile?.onboarded;
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(() => loadCooldown());
  const [now, setNow] = useState(Date.now());
  const wait = remainingMs(cooldownUntil, now);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [wait > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const requestEmail = () =>
    run(async () => {
      if (remainingMs(cooldownUntil) > 0) return;
      try {
        await cloud.sendCode(email);
        setCooldownUntil(startCooldown(RESEND_MS));
        setNow(Date.now());
        setCodeSent(true);
      } catch (e) {
        if ((e as { rateLimited?: boolean }).rateLimited) {
          setCooldownUntil(startCooldown(RATE_LIMIT_MS));
          setNow(Date.now());
        }
        throw e;
      }
    });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [username, setUsername] = useState(() => normalizeUsername(state.profile?.name ?? ''));
  const [displayName, setDisplayName] = useState(state.profile?.name ?? '');
  const [isPublic, setIsPublic] = useState(state.profile?.publicProfile ?? true);
  const [available, setAvailable] = useState<boolean | null>(null);

  // after pulling a profile onto a fresh device, go straight into the app
  useEffect(() => {
    if (cloud.status === 'ready' && cloud.mergeResult === 'pulled' && state.profile?.onboarded) nav('/', { replace: true });
  }, [cloud.status, cloud.mergeResult, state.profile?.onboarded, nav]);

  useEffect(() => {
    if (cloud.status !== 'needsProfile' || !validUsername(username)) {
      setAvailable(null);
      return;
    }
    const t = setTimeout(() => cloud.checkUsername(username).then(setAvailable).catch(() => setAvailable(null)), 400);
    return () => clearTimeout(t);
  }, [username, cloud.status, cloud]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="main" style={{ paddingTop: 16 }}>
      <div className="q-wrap stack">
        <div className="spread">
          <Link to={onboarded ? '/' : '/welcome'} className="brand">
            <span className="brand-logo">100</span> LVL100
          </Link>
          <Link to={onboarded ? '/' : '/welcome'} className="btn sm ghost">
            חזרה
          </Link>
        </div>
        <h1>☁️ החשבון שלי</h1>

        {cloud.status === 'loading' && <Loading />}

        {cloud.status === 'signedOut' && (
          <>
            <div className="card soft stack" style={{ gap: 6 }}>
              <b>עם חשבון מקבלים:</b>
              <div>🏆 Leaderboard אמיתי מול חברים ומול כל השחקנים</div>
              <div>👥 הוספת חברים לפי שם משתמש</div>
              <div>📱 אותה התקדמות בטלפון ובמחשב</div>
              <div>💾 גיבוי אוטומטי. ההתקדמות לא הולכת לאיבוד</div>
            </div>
            {!codeSent ? (
              <form
                className="card stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  requestEmail();
                }}
              >
                <label className="field" htmlFor="acc-email">
                  כתובת מייל
                  <input id="acc-email" type="text" inputMode="email" autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                </label>
                <button className="btn lg block" disabled={busy || wait > 0 || !/.+@.+\..+/.test(email)}>
                  {busy ? 'שולח…' : wait > 0 ? <>⏳ אפשר לשלוח שוב בעוד <span className="num en-inline">{formatCountdown(wait)}</span></> : 'שלח לי מייל כניסה'}
                </button>
                {wait > 0 && (
                  <p className="faint" style={{ margin: 0 }}>
                    {wait > RESEND_MS ? 'הגעת למגבלת המיילים של Supabase. אם כבר קיבלת מייל, אפשר להשתמש בקישור שבו.' : 'Supabase מאפשר מייל אחד לדקה לכל כתובת.'}
                  </p>
                )}
                <p className="faint" style={{ margin: 0 }}>
                  בלי סיסמה: נשלח לך מייל עם קישור כניסה. אם אין לך חשבון, הוא ייווצר אוטומטית.
                </p>
              </form>
            ) : (
              <form className="card stack" onSubmit={(e) => (e.preventDefault(), run(() => cloud.verifyCode(email, code)))}>
                <p style={{ margin: 0 }}>
                  שלחנו מייל ל-<b dir="ltr">{email}</b>. בדוק גם בתיקיית הספאם.
                </p>
                <div className="notice">
                  🔗 אם במייל יש <b>קישור</b> (למשל "Confirm email address"), לחץ עליו <b>במכשיר הזה</b>, והוא יכניס אותך אוטומטית.
                  <br />
                  🔢 אם במייל יש <b>קוד</b>, הקלד אותו כאן:
                </div>
                <label className="field" htmlFor="acc-code">
                  הקוד מהמייל
                  <input id="acc-code" type="text" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={10} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={{ fontSize: '1.6rem', letterSpacing: 8, textAlign: 'center' }} autoFocus />
                </label>
                <button className="btn lg block" disabled={busy || code.length < 6}>
                  {busy ? 'בודק…' : 'כניסה'}
                </button>
                <div className="row wrap" style={{ justifyContent: 'center' }}>
                  <button type="button" className="btn sm ghost" disabled={busy || wait > 0} onClick={requestEmail}>
                    {wait > 0 ? <>⏳ שליחה חוזרת בעוד <span className="num en-inline">{formatCountdown(wait)}</span></> : '📨 שלח שוב'}
                  </button>
                  <button type="button" className="link-btn" onClick={() => (setCodeSent(false), setCode(''))}>
                    שינוי מייל
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {cloud.status === 'needsProfile' && (
          <form
            className="card stack"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => cloud.createProfile(username, displayName.trim() || username, isPublic));
            }}
          >
            <h2 style={{ margin: 0 }}>בחר שם משתמש</h2>
            <p className="muted" style={{ margin: 0 }}>
              לפי השם הזה חברים ימצאו אותך. מותר להשתמש באותיות באנגלית, מספרים ו-_ (3–20 תווים).
            </p>
            <label className="field" htmlFor="acc-username">
              שם משתמש
              <input id="acc-username" type="text" dir="ltr" value={username} onChange={(e) => setUsername(normalizeUsername(e.target.value))} placeholder="amit_100" required />
            </label>
            {validUsername(username) && available !== null && (
              <span className={`chip ${available ? 'success' : 'danger'}`} style={{ alignSelf: 'flex-start' }}>
                {available ? '✓ פנוי' : '✕ תפוס, נסה שם אחר'}
              </span>
            )}
            <label className="field" htmlFor="acc-display">
              שם תצוגה
              <input id="acc-display" type="text" value={displayName} maxLength={24} onChange={(e) => setDisplayName(e.target.value)} />
            </label>
            <label className="switch">
              <span>🌍 פרופיל ציבורי: מופיע ב-Leaderboard הכללי ובחיפוש</span>
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            </label>
            <button className="btn lg block" disabled={busy || !validUsername(username) || available === false}>
              {busy ? 'יוצר…' : 'יצירת פרופיל'}
            </button>
          </form>
        )}

        {cloud.status === 'ready' && cloud.profile && (
          <>
            <div className="card row">
              <span className="avatar" style={{ width: 56, height: 56, fontSize: '1.8rem' }}>
                {state.profile?.avatar ?? cloud.profile.avatar}
              </span>
              <div style={{ flex: 1 }}>
                <b>{cloud.profile.display_name}</b>
                <div className="muted en" dir="ltr" style={{ textAlign: 'right' }}>
                  @{cloud.profile.username}
                </div>
                <div className="faint" dir="ltr" style={{ textAlign: 'right' }}>
                  {cloud.email}
                </div>
              </div>
            </div>
            {cloud.mergeResult === 'pulled' && <div className="notice accent">☁️ ההתקדמות שלך נטענה מהענן למכשיר הזה.</div>}
            {cloud.mergeResult === 'pushed' && <div className="notice">📱 ההתקדמות במכשיר הזה הייתה מתקדמת יותר, ולכן היא נשמרה בענן.</div>}
            <div className="card stack">
              <div className="spread">
                <b>☁️ סנכרון</b>
                <span className={`chip ${cloud.error ? 'danger' : 'success'}`}>{cloud.syncing ? 'מסנכרן…' : cloud.error ? 'שגיאה' : 'מסונכרן'}</span>
              </div>
              <p className="faint" style={{ margin: 0 }}>
                ההתקדמות נשמרת בענן אוטומטית אחרי כל פעולה.
                {cloud.lastSync && ` סנכרון אחרון: ${cloud.lastSync.toLocaleTimeString('he-IL')}`}
              </p>
              {cloud.error && <div className="notice warn">{cloud.error}</div>}
              <button className="btn ghost" onClick={() => run(cloud.syncNow)} disabled={busy || cloud.syncing}>
                🔄 סנכרן עכשיו
              </button>
            </div>
            {!onboarded && (
              <Link to="/welcome" className="btn lg block">
                המשך להגדרת המטרה שלך
              </Link>
            )}
            <div className="grid-2">
              <Link to="/friends" className="btn soft">
                👥 חברים
              </Link>
              <Link to="/leaderboard" className="btn soft">
                🏆 <En>Leaderboard</En>
              </Link>
            </div>
            <button className="btn danger" onClick={() => run(cloud.signOut)} disabled={busy}>
              התנתקות
            </button>
            <p className="faint center">ההתקדמות נשארת גם במכשיר הזה אחרי התנתקות.</p>
          </>
        )}

        {(err || (cloud.error && cloud.status !== 'ready')) && <div className="notice warn">⚠️ {err ?? cloud.error}</div>}
      </div>
    </div>
  );
}
