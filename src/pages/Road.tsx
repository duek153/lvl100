import { Link, useNavigate } from 'react-router-dom';
import { Fragment } from 'react';
import { useGame } from '../store/GameContext';
import { stageViews, PROGRESS_TESTS, type StageView } from '../domain/road';
import { levelFromXp } from '../domain/levels';
import { estimatedScore } from '../domain/scoring';
import { computeReadiness } from '../domain/readiness';
import { Bar, En, PageHeader } from '../components/ui';
import { SKILL_EN, SKILL_EMOJI } from '../components/labels';

const STATUS: Record<StageView['status'], { t: string; cls: string }> = {
  locked: { t: '🔒 נעול', cls: '' },
  active: { t: '▶ בתהליך', cls: 'primary' },
  boss: { t: '⚔️ Boss זמין', cls: 'accent' },
  done: { t: '✅ הושלם', cls: 'success' },
};

// progress tests appear after these stage indexes
const TEST_AFTER: Record<number, string> = { 3: 'test-5', 6: 'test-10', 8: 'test-15' };

export default function Road() {
  const { state } = useGame();
  const nav = useNavigate();
  const views = stageViews(state.answers, state.progress);
  const lv = levelFromXp(state.progress.xp);
  const score = estimatedScore(state.progress.ability);
  const target = state.profile?.targetScore ?? 100;
  const ready = computeReadiness(state.answers, state.progress, state.profile);
  const lastSim = [...state.attempts].reverse().find((a) => a.kind === 'simulation');

  return (
    <div className="stack">
      <PageHeader title="הדרך שלי ל-100 🗺️" sub={<En>Road to 100 — every stage brings you closer.</En>} />
      <div className="card soft">
        <div className="spread">
          <span>
            ציון משוער: <b className="num">{score}</b> · יעד: <b className="num">{target}</b>
          </span>
          <span className="chip primary en-inline">Level {lv.level}</span>
        </div>
        <Bar pct={((score - 50) / (target - 50)) * 100} label="ציון מול יעד" />
      </div>

      <div className="road">
        <div className="road-node">
          <span className="road-flag">🚩 START</span>
        </div>
        {views.map((v) => (
          <Fragment key={v.stage.id}>
            <div className={`road-node ${v.status}`}>
              <span className="road-dot" aria-hidden>
                {v.status === 'done' ? '✓' : v.stage.index}
              </span>
              <div className={`card ${v.status === 'locked' ? 'locked' : ''}`}>
                <div className="spread" style={{ alignItems: 'flex-start' }}>
                  <div className="row">
                    <div className="emoji-badge">{v.stage.emoji}</div>
                    <div>
                      <div className="faint en-inline">Stage {v.stage.index}</div>
                      <h3 style={{ marginBottom: 0 }}>
                        <En>{v.stage.title}</En>
                      </h3>
                      <div className="faint">{v.stage.titleHe}</div>
                    </div>
                  </div>
                  <span className={`chip ${STATUS[v.status].cls}`}>{STATUS[v.status].t}</span>
                </div>
                <div className="grid-4" style={{ marginTop: 12 }}>
                  <div>
                    <div className="xs muted">ציון יעד</div>
                    <b className="num">{v.stage.scoreTarget}</b>
                  </div>
                  <div>
                    <div className="xs muted">שאלות</div>
                    <b className="num">
                      {Math.min(v.answered, v.stage.requiredQuestions)}/{v.stage.requiredQuestions}
                    </b>
                  </div>
                  <div>
                    <div className="xs muted">הצלחה</div>
                    <b className="num">{v.accuracy}%</b>
                  </div>
                  <div>
                    <div className="xs muted">זמן ממוצע</div>
                    <b className="num">{v.avgSeconds}s</b>
                  </div>
                </div>
                <div className="row wrap" style={{ marginTop: 10, gap: 6 }}>
                  {v.stage.skills.map((s) => (
                    <span key={s} className="chip">
                      {SKILL_EMOJI[s]} <En>{SKILL_EN[s]}</En>
                    </span>
                  ))}
                </div>
                {v.status !== 'locked' && v.status !== 'done' && (
                  <>
                    <div style={{ marginTop: 10 }}>
                      <Bar pct={(v.answered / v.stage.requiredQuestions) * 100} className="thin" label="התקדמות בשלב" />
                    </div>
                    <div className="row wrap" style={{ marginTop: 12 }}>
                      <button className="btn sm soft" onClick={() => nav(`/play/practice?skill=${v.stage.skills.length > 1 ? 'mixed' : v.stage.skills[0] === 'reading' ? 'mixed' : v.stage.skills[0]}`)}>
                        תרגול
                      </button>
                      {v.stage.skills.includes('reading') && (
                        <Link to="/reading" className="btn sm soft">
                          אנסינים
                        </Link>
                      )}
                      <button className={`btn sm ${v.status === 'boss' ? 'accent' : 'ghost'}`} disabled={v.status !== 'boss'} onClick={() => nav(`/play/boss?id=${v.stage.boss.id}`)}>
                        {v.stage.boss.emoji} <En>BOSS BATTLE</En>
                      </button>
                    </div>
                    {v.status === 'active' && <p className="faint" style={{ marginTop: 6 }}>ה-Boss ייפתח אחרי {v.stage.requiredQuestions - v.answered} שאלות נוספות. צריך לנצח אותו (70%+) כדי לעבור שלב.</p>}
                    {v.bossBest !== null && v.status === 'boss' && <p className="faint">הניסיון הכי טוב שלך: {v.bossBest}%. Not there yet, עוד ניסיון!</p>}
                  </>
                )}
                {v.status === 'done' && (
                  <p className="faint" style={{ marginTop: 8 }}>
                    {v.stage.boss.emoji} {v.stage.boss.name} הובס · {v.bossBest}%
                  </p>
                )}
              </div>
            </div>
            {TEST_AFTER[v.stage.index] && <TestNode id={TEST_AFTER[v.stage.index]} level={lv.level} best={state.progress.tests[TEST_AFTER[v.stage.index]]} />}
          </Fragment>
        ))}
        <div className={`road-node ${ready.simulationUnlocked ? 'active' : ''}`}>
          <span className="road-dot">🎓</span>
          <Link to={ready.simulationUnlocked ? '/simulation' : '/ready'} className={`card link ${ready.simulationUnlocked ? '' : 'locked'}`}>
            <h3>
              <En>AmirNet Ready</En> · סימולציה מלאה
            </h3>
            <p className="faint">{ready.simulationUnlocked ? 'הסימולציה פתוחה!' : `נפתח לפי מדדי מוכנות (לא רק לפי Level). כרגע: ${ready.overall}%`}</p>
          </Link>
        </div>
        <div className="road-node">
          <span className="road-flag">💯 {target}+ {lastSim ? `· סימולציה אחרונה: ${lastSim.score}` : ''}</span>
        </div>
      </div>
    </div>
  );
}

function TestNode({ id, level, best }: { id: string; level: number; best?: number }) {
  const nav = useNavigate();
  const spec = PROGRESS_TESTS.find((t) => t.id === id)!;
  const open = level >= spec.level;
  return (
    <div className={`road-node ${best !== undefined && best >= spec.passPct ? 'done' : open ? 'active' : ''}`}>
      <span className="road-dot">📝</span>
      <div className={`card soft ${open ? '' : 'locked'}`}>
        <div className="spread">
          <div>
            <b>
              <En>Level {spec.level} Test</En>
            </b>
            <div className="faint">
              {spec.count} שאלות · {spec.seconds / 60} דק׳ · מבחן התקדמות שמשפיע על הערכת הרמה
            </div>
          </div>
          {best !== undefined && <span className="chip success">{best}%</span>}
        </div>
        <button className="btn sm" style={{ marginTop: 10 }} disabled={!open} onClick={() => nav(`/play/test?id=${id}`)}>
          {open ? (best !== undefined ? 'שפר ציון' : 'התחל מבחן') : `🔒 נפתח ב-Level ${spec.level}`}
        </button>
      </div>
    </div>
  );
}
