import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { useUI } from '../store/UIContext';
import { levelFromXp } from '../domain/levels';
import { effectiveStreak, streakAtRisk } from '../domain/streak';
import { estimatedScore } from '../domain/scoring';
import { dailyQuest } from '../domain/quests';
import { computeReadiness } from '../domain/readiness';
import { stageViews, currentStage } from '../domain/road';
import { buildBoard } from '../domain/leaderboard';
import { useBoard } from '../store/useBoard';
import { dailyPlan, daysUntil } from '../domain/plan';
import { addDays, dayKey } from '../domain/util';
import { bandFor } from '../data/exam';
import { claimQuest } from '../services/game';
import { achievementViews, nextUp } from '../domain/achievements';
import { Bar, En, Ring, SkillBar } from '../components/ui';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'לילה טוב';
  if (h < 12) return 'בוקר טוב';
  if (h < 17) return 'צהריים טובים';
  if (h < 21) return 'ערב טוב';
  return 'לילה טוב';
}

export default function Dashboard() {
  const { state, update } = useGame();
  const ui = useUI();
  const nav = useNavigate();
  const today = dayKey();
  const p = state.progress;
  const profile = state.profile!;
  const lv = levelFromXp(p.xp);
  const streak = effectiveStreak(p.streak, today);
  const atRisk = streakAtRisk(p.streak, today);
  const score = estimatedScore(p.ability);
  const target = profile.targetScore;
  const startScore = p.scoreHistory[0]?.score ?? score;
  const progressPct = target > startScore ? ((score - startScore) / (target - startScore)) * 100 : score >= target ? 100 : 0;
  const weekAgo = [...p.scoreHistory].reverse().find((h) => h.date <= addDays(today, -7)) ?? p.scoreHistory[0];
  const weekDelta = weekAgo ? score - weekAgo.score : 0;
  const quest = dailyQuest(state.answers, p, profile, today);
  const readiness = computeReadiness(state.answers, p, profile, today);
  const stage = currentStage(stageViews(state.answers, p));
  const todayXp = p.days[today]?.xp ?? 0;
  const real = useBoard('daily', 'friends');
  const realFriends = real.ready && real.rows && real.rows.length > 1;
  const board = realFriends
    ? real.rows!.map((r) => ({ id: r.user_id, name: r.display_name, avatar: r.avatar, xp: r.is_me ? Math.max(r.xp, todayXp) : r.xp, isMe: r.is_me })).sort((a, b) => b.xp - a.xp)
    : buildBoard('daily', today, { name: profile.name, avatar: profile.avatar, xp: todayXp, public: profile.publicProfile }, 10);
  const myRank = board.findIndex((r) => r.isMe) + 1;
  const plan = dailyPlan(profile.minutesPerDay, p.ability);
  const daysLeft = daysUntil(profile.examDate, today);
  const band = bandFor(score);
  const tv = achievementViews(state);
  const trophies = { got: tv.filter((v) => v.unlockedAt).length, total: tv.length, next: nextUp(tv, 1)[0] };

  const startTarget = !profile.placementDone ? '/placement' : quest.tasks.find((t) => !t.done)?.to ?? '/practice';

  const claim = () => {
    let gained = 0;
    update((s) => {
      const r = claimQuest(s);
      gained = r.xp;
      return r.state;
    });
    if (gained) {
      ui.confetti();
      ui.toast(`🎯 Daily Quest הושלם! +${gained} XP`, 'success');
    }
  };

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 style={{ marginBottom: 0 }}>
            {greeting()}, {profile.name} {profile.avatar}
          </h1>
          <div className="muted">
            {streak > 0 ? (
              <>
                🔥 <b className="num">{streak}</b> <En>Day Streak</En>
                {streak >= 3 && <span className="en-inline"> · You're on fire!</span>}
              </>
            ) : (
              'בוא נתחיל רצף חדש היום 🔥'
            )}
          </div>
        </div>
      </div>

      {!profile.placementDone && (
        <Link to="/placement" className="card link" style={{ borderColor: 'var(--primary)' }}>
          <div className="row">
            <div className="emoji-badge">🧭</div>
            <div>
              <h3 style={{ marginBottom: 2 }}>עשה מבחן מיקום (20 שאלות)</h3>
              <div className="faint">כדי שהמסלול יתחיל מהרמה האמיתית שלך</div>
            </div>
          </div>
        </Link>
      )}

      {atRisk && (
        <div className="notice warn">
          🔥 הרצף שלך ({streak} ימים) בסכנה! ענה היום על 5 שאלות כדי לשמור עליו.
          {p.streak.freezes > 0 && <span> (יש לך {p.streak.freezes} ❄️ Streak Freeze שיגן עליך אם תפספס)</span>}
        </div>
      )}

      <div className="dash">
        <div className="stack">
          <div className="card hero pad-lg">
            <div className="spread" style={{ position: 'relative', zIndex: 1, alignItems: 'flex-start' }}>
              <div>
                <div className="faint">
                  <En>Your Goal</En>
                </div>
                <div className="bold" style={{ fontSize: '1.4rem' }}>
                  🎯 {target}
                </div>
                <div className="faint" style={{ marginTop: 10 }}>
                  <En>Current Estimated Score</En>
                </div>
                <div className="big-num num">{score}</div>
                <div className="faint">
                  {band.he} ·{' '}
                  {weekDelta !== 0 && (
                    <b className="en-inline">
                      {weekDelta > 0 ? '+' : ''}
                      {weekDelta} this week
                    </b>
                  )}
                </div>
              </div>
              <Ring pct={Math.max(0, progressPct)} size={108} stroke={11} color="#fff" track="rgba(255,255,255,0.22)" label="התקדמות ליעד">
                <div className="bold num" style={{ fontSize: '1.3rem' }}>
                  {Math.max(0, Math.round(progressPct))}%
                </div>
                <div className="xs">ליעד</div>
              </Ring>
            </div>
            <div style={{ marginTop: 14, position: 'relative', zIndex: 1 }}>
              <Bar pct={((score - 50) / (target - 50)) * 100} className="on-hero thick" label="ציון מול יעד" />
              <div className="spread xs" style={{ marginTop: 6, opacity: 0.85 }}>
                <span>{score >= target ? 'הגעת ליעד! 🏆' : `עוד ${target - score} נקודות ל-${target}`}</span>
                {daysLeft !== null && daysLeft >= 0 && <span>📅 {daysLeft} ימים למבחן</span>}
              </div>
            </div>
            <div className="xs" style={{ marginTop: 8, opacity: 0.7, position: 'relative', zIndex: 1 }}>
              * אומדן פנימי, לא ציון רשמי של מאל"ו
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              <h2>
                🎯 <En>TODAY'S MISSION</En>
              </h2>
              <span className="chip primary en-inline">+{quest.reward} XP</span>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {quest.tasks.map((t) => (
                <Link key={t.id} to={t.to} className="row" style={{ color: 'inherit' }}>
                  <span aria-hidden style={{ fontSize: '1.2rem' }}>
                    {t.done ? '✅' : '⬜'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="spread small">
                      <span className={t.done ? 'muted' : 'bold'} style={t.done ? { textDecoration: 'line-through' } : undefined}>
                        {t.emoji} {t.label}
                      </span>
                      <span className="num faint">
                        {t.progress}/{t.target}
                      </span>
                    </div>
                    <Bar pct={(t.progress / t.target) * 100} className={`thin ${t.done ? 'success' : ''}`} label={t.label} />
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              {quest.complete && !quest.claimed ? (
                <button className="btn block gold lg bounce-in" onClick={claim}>
                  🎁 אסוף {quest.reward} XP
                </button>
              ) : quest.claimed ? (
                <div className="notice accent">🏆 המשימה היומית הושלמה. נתראה מחר!</div>
              ) : (
                <button className="btn block lg" onClick={() => nav(startTarget)}>
                  <En>START</En> ▶
                </button>
              )}
            </div>
          </div>

          <Link to="/road" className="card link">
            <div className="faint">
              <En>CONTINUE</En>
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <div className="emoji-badge">{stage.stage.emoji}</div>
              <div style={{ flex: 1 }}>
                <div className="bold">
                  <En>{stage.stage.title}</En> · {stage.stage.titleHe}
                </div>
                <Bar pct={stage.status === 'done' ? 100 : Math.min(100, (stage.answered / stage.stage.requiredQuestions) * 100)} className="thin" label="התקדמות בשלב" />
                <div className="faint" style={{ marginTop: 4 }}>
                  {stage.status === 'boss' ? `⚔️ ה-Boss מחכה לך: ${stage.stage.boss.name}` : <En>{`${Math.min(100, Math.round((stage.answered / stage.stage.requiredQuestions) * 100))}% complete`}</En>}
                </div>
              </div>
              <span className="btn sm">המשך</span>
            </div>
          </Link>

          <div className="grid-2">
            <Link to="/daily" className="card link">
              <div className="row">
                <div className="emoji-badge" style={{ background: 'var(--warn-soft)' }}>
                  ⚡
                </div>
                <div>
                  <div className="bold">
                    <En>Daily Challenge</En>
                  </div>
                  <div className="faint">{p.dailyDone[today] !== undefined ? `הציון שלך היום: ${p.dailyDone[today]}%` : '10 שאלות · נגד השעון'}</div>
                </div>
              </div>
            </Link>
            <Link to={readiness.simulationUnlocked ? '/simulation' : '/ready'} className="card link">
              <div className="row">
                <div className="emoji-badge" style={{ background: 'var(--accent-soft)' }}>
                  🎓
                </div>
                <div>
                  <div className="bold">
                    <En>AmirNet Simulation</En>
                  </div>
                  <div className="faint">{readiness.simulationUnlocked ? 'פתוחה! 🔓' : `מוכנות: ${readiness.overall}% 🔒`}</div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="stack">
          <Link to="/achievements" className="card link">
            <div className="spread">
              <div className="row">
                <div className="emoji-badge" style={{ background: 'var(--warn-soft)' }}>
                  🏆
                </div>
                <div>
                  <b>גלריית הפרסים</b>
                  <div className="faint num">
                    {trophies.got}/{trophies.total} נאספו
                  </div>
                </div>
              </div>
              <span className="chip primary num">{Math.round((trophies.got / trophies.total) * 100)}%</span>
            </div>
            {trophies.next && (
              <div style={{ marginTop: 10 }}>
                <div className="spread xs muted">
                  <span>
                    הבא: {trophies.next.def.emoji} <span className="en-inline">{trophies.next.def.title}</span>
                  </span>
                  <span className="num en-inline">
                    {trophies.next.value}/{trophies.next.def.target}
                  </span>
                </div>
                <Bar pct={trophies.next.pct} className="thin" label="הפרס הבא" />
              </div>
            )}
          </Link>
          <div className="card">
            <div className="card-title">
              <h2>
                <En>YOUR STATS</En>
              </h2>
              <Link to="/progress" className="small">
                הכול ←
              </Link>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              <SkillBar label="Vocabulary" pct={readiness.vocabulary} to="/vocab" />
              <SkillBar label="Grammar" pct={readiness.grammar} to="/grammar" />
              <SkillBar label="Reading" pct={readiness.reading} to="/reading" />
              <SkillBar label="Restatements" pct={readiness.restatement} to="/play/practice?skill=restatement" />
              <SkillBar label="Speed" pct={readiness.speed} />
            </div>
            <div className="hr" style={{ margin: '14px 0' }} />
            <div className="spread small">
              <span>
                ⭐ <En>Level {lv.level}</En> · <En>{lv.def.name}</En>
              </span>
              <span className="num faint en-inline">
                {lv.isMax ? 'MAX' : `${lv.xpIntoLevel}/${lv.xpForNext} XP`}
              </span>
            </div>
            <Bar pct={lv.pct} className="thin" label="XP לרמה הבאה" />
          </div>

          <div className="card">
            <div className="card-title">
              <h2>
                ⏱ <En>Your Daily Plan</En>
              </h2>
              <span className="chip">{profile.minutesPerDay} דק׳</span>
            </div>
            <div className="stack" style={{ gap: 6 }}>
              {plan.map((it) => (
                <div key={it.key} className="spread small">
                  <span>
                    {it.emoji} <En>{it.label}</En>
                  </span>
                  <span className="num faint">{it.minutes} דק׳</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              <h2>
                🏆 <En>DAILY LEADERBOARD</En>
              </h2>
              <Link to="/leaderboard" className="small">
                הכול ←
              </Link>
            </div>
            <div className="list">
              {board.slice(0, 3).map((r, i) => (
                <div key={r.id} className={`list-item ${r.isMe ? 'me' : ''}`}>
                  <span className="rank">{['🥇', '🥈', '🥉'][i]}</span>
                  <span className="avatar">{r.avatar}</span>
                  <span style={{ flex: 1 }} className="bold">
                    {r.name}
                  </span>
                  <span className="num faint en-inline">{r.xp.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
            {!realFriends && (
              <p className="faint" style={{ marginTop: 8 }}>
                {real.ready ? (
                  <Link to="/friends">הוסף חברים כדי לראות אותם כאן במקום יריבים מדומים ←</Link>
                ) : (
                  <Link to="/account">התחבר כדי להתחרות בחברים אמיתיים ←</Link>
                )}
              </p>
            )}
            {myRank > 3 && (
              <p className="faint" style={{ marginTop: 8 }}>
                אתה במקום {myRank}. עוד {board[myRank - 2].xp - board[myRank - 1].xp + 1} XP כדי לעקוף את {board[myRank - 2].name}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
