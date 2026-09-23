import { Link } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { computeReadiness, SIM_REQUIREMENTS, READY_REQUIREMENTS } from '../domain/readiness';
import { SCORE_DISCLAIMER } from '../data/exam';
import { En, PageHeader, Ring, SkillBar } from '../components/ui';

export default function Ready() {
  const { state } = useGame();
  const r = computeReadiness(state.answers, state.progress, state.profile);
  const lastSim = [...state.attempts].reverse().find((a) => a.kind === 'simulation');
  const title = r.examReady ? '🏆 READY FOR AMIRNET' : r.simulationUnlocked ? '🎓 SIMULATION UNLOCKED' : '🧗 ON THE WAY';

  return (
    <div className="stack q-wrap">
      <PageHeader title={<En>{title}</En>} sub="המוכנות נמדדת ב-6 מדדים, לא רק לפי Level" />
      <div className={`card ${r.examReady ? 'hero' : ''} center pad-lg`}>
        <Ring pct={r.overall} size={150} stroke={14} color={r.examReady ? '#fff' : 'var(--primary)'} track={r.examReady ? 'rgba(255,255,255,.25)' : undefined} label="מוכנות כללית">
          <div className="big-num num" style={{ fontSize: '2.4rem' }}>
            {r.overall}%
          </div>
          <div className="xs">
            <En>Overall readiness</En>
          </div>
        </Ring>
        <div style={{ marginTop: 10 }}>
          <En>Estimated Score</En>: <b className="num">{r.estimated}</b>
          {lastSim && (
            <>
              {' '}
              · סימולציה אחרונה: <b className="num">{lastSim.score}</b>
            </>
          )}
        </div>
      </div>
      <div className="card stack" style={{ gap: 12 }}>
        <SkillBar label="Vocabulary" pct={r.vocabulary} />
        <SkillBar label="Grammar" pct={r.grammar} />
        <SkillBar label="Reading" pct={r.reading} />
        <SkillBar label="Restatements" pct={r.restatement} />
        <SkillBar label="Speed" pct={r.speed} />
        <SkillBar label="Consistency" pct={r.consistency} />
        <p className="faint" style={{ margin: 0 }}>
          דיוק משוקלל-קושי ב-40 התשובות האחרונות בכל תחום · מהירות = תשובות נכונות בזמן היעד · התמדה = ימי למידה ב-14 הימים האחרונים מול התוכנית.
        </p>
      </div>
      {r.simulationUnlocked ? (
        <Link to="/simulation" className="btn lg block accent">
          <En>Take the final simulation.</En> 🚀
        </Link>
      ) : (
        <div className="card">
          <h3>מה חסר כדי לפתוח את הסימולציה המלאה</h3>
          <ul style={{ lineHeight: 1.9 }}>
            {r.missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <p className="faint">
            תנאי פתיחה: לפחות {SIM_REQUIREMENTS.minAnswers} שאלות, כל מדד ≥ {SIM_REQUIREMENTS.minComponent}%, ומוכנות כללית ≥ {SIM_REQUIREMENTS.minOverall}%. "Ready" מלא: כל מדד ≥ {READY_REQUIREMENTS.minComponent}% וכללי ≥ {READY_REQUIREMENTS.minOverall}%.
          </p>
          <Link to="/practice" className="btn block">
            בוא נאמן את זה 💪
          </Link>
        </div>
      )}
      <div className="notice">ℹ️ {SCORE_DISCLAIMER}</div>
    </div>
  );
}
