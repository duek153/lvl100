import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { completeOnboarding } from '../services/game';
import type { Goal, Profile, SelfLevel } from '../domain/types';
import { bandFor } from '../data/exam';
import { dailyPlan, daysUntil } from '../domain/plan';
import { SELF_LEVEL_THETA } from '../domain/placement';
import { scoreToTheta } from '../domain/scoring';
import { SKILLS } from '../domain/types';
import { Bar, En } from '../components/ui';
import { dayKey } from '../domain/util';

const GOALS: { v: Goal; t: string; d: string; e: string }[] = [
  { v: 'exemption', e: '🏆', t: 'פטור מאנגלית', d: '134 ומעלה (ברוב המוסדות)' },
  { v: 'advanced', e: '🚀', t: 'רמת מתקדמים', d: 'לחסוך קורסי אנגלית' },
  { v: 'degree', e: '🎓', t: 'תנאי קבלה לתואר', d: 'להגיע לסף הנדרש' },
  { v: 'improve', e: '💬', t: 'לשפר אנגלית', d: 'להרגיש בטוח יותר' },
];

const LEVELS: { v: SelfLevel; t: string; d: string; e: string }[] = [
  { v: 'zero', e: '🌱', t: 'כמעט מאפס', d: 'מכיר מילים בודדות' },
  { v: 'beginner', e: '🐣', t: 'מתחיל', d: 'משפטים פשוטים' },
  { v: 'basic', e: '🙂', t: 'בסיסי', d: 'מבין טקסטים קלים' },
  { v: 'intermediate', e: '😎', t: 'בינוני', d: 'קורא בלי הרבה מילון' },
  { v: 'advanced', e: '🔥', t: 'מתקדם', d: 'רוצה ציון גבוה' },
];

const TARGETS = [85, 100, 120, 134];
const MINUTES = [10, 20, 30, 45, 60];
const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐙', '🦄', '🐧', '🦉', '🐬', '🚀', '⚡'];

export default function Onboarding() {
  const { update } = useGame();
  const nav = useNavigate();
  // e.g. a friend's challenge link opened before having a profile
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [goal, setGoal] = useState<Goal>('exemption');
  const [level, setLevel] = useState<SelfLevel>('basic');
  const [hasScore, setHasScore] = useState(false);
  const [score, setScore] = useState(90);
  const [target, setTarget] = useState(134);
  const [examDate, setExamDate] = useState<string>('');
  const [days, setDays] = useState(5);
  const [minutes, setMinutes] = useState(20);

  const steps = 6;
  const next = () => setStep((s) => Math.min(steps - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const theta = hasScore ? scoreToTheta(score) : SELF_LEVEL_THETA[level];
  const ability = Object.fromEntries(SKILLS.map((s) => [s, theta])) as Record<(typeof SKILLS)[number], number>;
  const plan = dailyPlan(minutes, ability);
  const daysLeft = daysUntil(examDate || null, dayKey());

  const finish = () => {
    const profile: Profile = {
      name: name.trim() || 'אלוף',
      goal,
      selfLevel: level,
      reportedScore: hasScore ? score : null,
      targetScore: target,
      examDate: examDate || null,
      daysPerWeek: days,
      minutesPerDay: minutes,
      createdAt: new Date().toISOString(),
      onboarded: true,
      placementDone: false,
      publicProfile: true,
      avatar,
    };
    update((s) => completeOnboarding(s, profile));
    nav(from?.startsWith('/play/friend') ? from : '/placement', { replace: true });
  };

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar" style={{ position: 'static' }}>
        <span className="brand">
          <span className="brand-logo">100</span> LVL100
        </span>
        <span className="faint num">
          {step + 1}/{steps}
        </span>
      </div>
      <div style={{ padding: '0 16px' }}>
        <div className="q-wrap">
          <Bar pct={((step + 1) / steps) * 100} label="התקדמות" />
        </div>
      </div>
      <main className="main" style={{ flex: 1, width: '100%', paddingBottom: 120 }}>
        <div className="q-wrap stack fade-in" key={step}>
          {step === 0 && (
            <>
              <div className="center">
                <div style={{ fontSize: '3rem' }} className="bounce-in">
                  👋
                </div>
                <h1>ברוך הבא ל-LVL100</h1>
                <p className="muted">מתאמנים כמו במשחק, בדרך ל-100+ באמירנט.</p>
                <Link to="/account" className="btn sm soft">
                  ☁️ כבר יש לי חשבון? התחברות
                </Link>
              </div>
              <label className="field">
                איך לקרוא לך?
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="השם שלך" maxLength={24} autoFocus />
              </label>
              <div>
                <div className="small bold" style={{ marginBottom: 6 }}>
                  בחר אווטאר
                </div>
                <div className="row wrap">
                  {AVATARS.map((a) => (
                    <button key={a} className={`opt ${a === avatar ? 'on' : ''}`} style={{ padding: 8, fontSize: '1.5rem', width: 52 }} onClick={() => setAvatar(a)} aria-label={`אווטאר ${a}`} aria-pressed={a === avatar}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <h2 style={{ marginTop: 8 }}>מה המטרה שלך?</h2>
              <div className="grid-2">
                {GOALS.map((g) => (
                  <button key={g.v} className={`opt ${goal === g.v ? 'on' : ''}`} onClick={() => setGoal(g.v)} aria-pressed={goal === g.v}>
                    <span className="t">
                      {g.e} {g.t}
                    </span>
                    <span className="d">{g.d}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1>מה הרמה שלך?</h1>
              <p className="muted">לא צריך לדייק. מבחן המיקום יכייל את הרמה בשבילך.</p>
              <div className="stack" style={{ gap: 10 }}>
                {LEVELS.map((l) => (
                  <button key={l.v} className={`opt ${level === l.v ? 'on' : ''}`} onClick={() => setLevel(l.v)} aria-pressed={level === l.v}>
                    <span className="t">
                      {l.e} {l.t}
                    </span>
                    <span className="d">{l.d}</span>
                  </button>
                ))}
              </div>
              <label className="switch">
                <span>כבר נבחנתי ויש לי ציון אמיר"ם / אמירנט / פסיכומטרי-אנגלית</span>
                <input type="checkbox" checked={hasScore} onChange={(e) => setHasScore(e.target.checked)} />
              </label>
              {hasScore && (
                <label className="field">
                  הציון שקיבלת (50–150): <b className="num">{score}</b> · {bandFor(score).he}
                  <input type="range" min={50} max={150} value={score} onChange={(e) => setScore(Number(e.target.value))} aria-label="ציון נוכחי" />
                </label>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h1>מה הציון שאתה רוצה?</h1>
              <div className="grid-2">
                {TARGETS.map((t) => (
                  <button key={t} className={`opt ${target === t ? 'on' : ''}`} onClick={() => setTarget(t)} aria-pressed={target === t}>
                    <span className="t num" style={{ fontSize: '1.6rem' }}>
                      {t}
                    </span>
                    <span className="d">
                      {bandFor(t).he} · {bandFor(t).meaning}
                    </span>
                  </button>
                ))}
              </div>
              <label className="field">
                או בחר ציון מדויק: <b className="num">{target}</b>
                <input type="range" min={60} max={150} value={target} onChange={(e) => setTarget(Number(e.target.value))} aria-label="ציון יעד" />
              </label>
              <div className="notice">ℹ️ הספים משתנים ממוסד למוסד. בדקו את הדרישה של המוסד שלכם. במסך "על המבחן" יש את הטבלה המלאה.</div>
            </>
          )}

          {step === 3 && (
            <>
              <h1>מתי המבחן?</h1>
              <label className="field">
                תאריך הבחינה
                <input type="date" value={examDate} min={dayKey()} onChange={(e) => setExamDate(e.target.value)} />
              </label>
              <button className={`opt ${!examDate ? 'on' : ''}`} onClick={() => setExamDate('')}>
                <span className="t">🤷 עוד לא קבעתי</span>
                <span className="d">אמירנט נערכת לאורך כל השנה, אפשר להחליט אחר כך</span>
              </button>
              <h2 style={{ marginTop: 12 }}>כמה ימים בשבוע תלמד?</h2>
              <div className="day-toggle">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)} aria-pressed={days === d}>
                    {d}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h1>כמה זמן ביום?</h1>
              <p className="muted">עקביות מנצחת כמות. גם 10 דקות ביום עושות את ההבדל.</p>
              <div className="option-grid">
                {MINUTES.map((m) => (
                  <button key={m} className={`opt ${minutes === m ? 'on' : ''}`} onClick={() => setMinutes(m)} aria-pressed={minutes === m}>
                    <span className="t num" style={{ fontSize: '1.4rem' }}>
                      ⏱ {m}
                    </span>
                    <span className="d">דקות ביום</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div className="center">
                <h1>
                  <En>Let's build your plan.</En>
                </h1>
                <p className="muted">ככה נראית הדרך שלך ל-{target}:</p>
              </div>
              <div className="card hero">
                <div className="grid-3" style={{ position: 'relative', zIndex: 1 }}>
                  <div>
                    <div className="faint">Your Goal</div>
                    <div className="big-num num">{target}</div>
                  </div>
                  <div>
                    <div className="faint">Daily Study</div>
                    <div className="big-num num">{minutes}</div>
                    <div className="faint">דקות</div>
                  </div>
                  <div>
                    <div className="faint">Exam</div>
                    <div className="big-num num">{daysLeft !== null ? daysLeft : '—'}</div>
                    <div className="faint">{daysLeft !== null ? 'ימים' : 'גמיש'}</div>
                  </div>
                </div>
              </div>
              <div className="card">
                <h2>
                  <En>Your Daily Plan</En> · ⏱ {minutes} דק׳
                </h2>
                <div className="stack" style={{ gap: 8 }}>
                  {plan.map((p) => (
                    <div key={p.key} className="spread">
                      <span>
                        {p.emoji} <En>{p.label}</En>
                      </span>
                      <span className="chip primary num">{p.minutes} דק׳</span>
                    </div>
                  ))}
                </div>
                <p className="faint" style={{ marginTop: 10 }}>
                  התוכנית מתעדכנת אוטומטית לפי החוזקות והחולשות שלך.
                </p>
              </div>
              <div className="notice accent">🧭 השלב הבא: מבחן מיקום קצר (20 שאלות) כדי להתחיל בדיוק מהרמה שלך, בלי להתחיל סתם מ-Level 1.</div>
            </>
          )}
        </div>
      </main>
      <div style={{ position: 'fixed', bottom: 0, insetInline: 0, padding: '12px 16px calc(12px + env(safe-area-inset-bottom))', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
        <div className="q-wrap row">
          {step > 0 && (
            <button className="btn ghost" onClick={back}>
              חזרה
            </button>
          )}
          {step < steps - 1 ? (
            <button className="btn block lg" onClick={next}>
              המשך
            </button>
          ) : (
            <button className="btn block lg accent" onClick={finish}>
              <En>Let's Go</En> 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
