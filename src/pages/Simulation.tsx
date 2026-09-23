import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { useUI } from '../store/UIContext';
import { useBank } from '../store/useBank';
import type { ContentBank } from '../domain/engine';
import { pickPassage, pickQuestions } from '../domain/engine';
import type { Difficulty, Passage, Question } from '../domain/types';
import { AMIRNET_SECTIONS, EXPERIMENTAL_SECTION, SCORE_DISCLAIMER, SOURCES, bandFor, type SimSectionSpec } from '../data/exam';
import { nextSectionTier, scoreSimulation, type SimResponse, type SimResult } from '../domain/simulation';
import { computeReadiness } from '../domain/readiness';
import { applyAnswer, finishSession } from '../services/game';
import { formatMs } from '../domain/util';
import { Bidi, En, Loading, PageHeader, Stars } from '../components/ui';
import { PassageView, QuestionBody } from '../components/SessionPlayer';

interface SectionRun {
  spec: SimSectionSpec;
  tier: Difficulty;
  questions: Question[];
  passage?: Passage;
  answers: (number | null)[];
}

function buildSection(bank: ContentBank, spec: SimSectionSpec, tier: Difficulty, used: Set<string>): SectionRun {
  if (spec.kind === 'reading') {
    const p = pickPassage(bank, tier, [], Math.random, spec.questions, used);
    if (p) used.add(p.id);
    const qs = p ? p.questions.slice(0, spec.questions) : [];
    return { spec, tier, questions: qs, passage: p, answers: qs.map(() => null) };
  }
  const types = spec.kind === 'experimental' ? (['grammar'] as const) : ([spec.kind] as const);
  const skills = spec.kind === 'restatement' ? (['restatement'] as const) : spec.kind === 'experimental' ? (['grammar'] as const) : (['vocabulary'] as const);
  const qs = pickQuestions(bank, { skills: [...skills], types: [...types], count: spec.questions, difficulties: [tier], history: [], exclude: used, includeGenerated: false });
  qs.forEach((q) => used.add(q.id));
  return { spec, tier, questions: qs, answers: qs.map(() => null) };
}

export default function Simulation() {
  const { state } = useGame();
  const bank = useBank();
  const [phase, setPhase] = useState<'intro' | 'run' | 'result'>('intro');
  const [withExp, setWithExp] = useState(true);
  const [result, setResult] = useState<{ sim: SimResult; sections: SectionRun[] } | null>(null);
  const readiness = computeReadiness(state.answers, state.progress, state.profile);
  const specs = useMemo(() => (withExp ? [...AMIRNET_SECTIONS, EXPERIMENTAL_SECTION] : AMIRNET_SECTIONS), [withExp]);

  if (!bank) return <Loading />;
  if (phase === 'run') return <SimRunner bank={bank} specs={specs} onFinish={(r) => (setResult(r), setPhase('result'))} />;
  if (phase === 'result' && result) return <SimResultView result={result} target={state.profile?.targetScore ?? 100} />;

  const scoredMinutes = AMIRNET_SECTIONS.reduce((s, x) => s + x.minutes, 0);
  const scoredQuestions = AMIRNET_SECTIONS.reduce((s, x) => s + x.questions, 0);

  return (
    <div className="stack q-wrap">
      <PageHeader title={<>🎓 <En>AMIRNET SIMULATION</En></>} sub="סימולציה במבנה העדכני של אמירנט" />
      {!readiness.simulationUnlocked ? (
        <div className="card">
          <h2>🔒 הסימולציה המלאה עוד נעולה</h2>
          <p className="muted">היא נפתחת לפי מדדי מוכנות אמיתיים, לא לפי Level. מה חסר:</p>
          <ul style={{ lineHeight: 1.9 }}>
            {readiness.missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <Link to="/ready" className="btn block">
            לדוח המוכנות שלי
          </Link>
        </div>
      ) : (
        <div className="card hero center pad-lg">
          <div style={{ fontSize: '3rem' }} className="bounce-in">
            🏆
          </div>
          <h2>
            <En>You're ready.</En>
          </h2>
          <p className="muted">המדדים שלך מספיק גבוהים. הגיע הזמן למבחן האמיתי שלך.</p>
        </div>
      )}
      <div className="card">
        <h2>מבנה הסימולציה</h2>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>פרק</th>
                <th>שאלות</th>
                <th>זמן</th>
              </tr>
            </thead>
            <tbody>
              {specs.map((s, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{s.titleHe}</td>
                  <td className="num">{s.questions}</td>
                  <td className="num">{s.minutes} דק׳</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="faint" style={{ marginTop: 8 }}>
          {scoredQuestions} שאלות מדורגות · {scoredMinutes} דקות. הסדר המדויק של הפרקים בבחינה האמיתית עשוי להיות שונה. פירוט הפרקים אומת מול מקורות משניים, ראו{' '}
          <Link to="/exam">על המבחן</Link>.
        </p>
        <label className="switch">
          <span>לכלול פרק ניסיוני (Grammar in Context): יכול רק להוסיף 1–2 נקודות</span>
          <input type="checkbox" checked={withExp} onChange={(e) => setWithExp(e.target.checked)} />
        </label>
      </div>
      <div className="card soft stack" style={{ gap: 6 }}>
        <b>כללים (לפי ההנחיות הרשמיות):</b>
        <div>↔️ אפשר לנוע בין שאלות בתוך הפרק</div>
        <div>⛔ אי אפשר לחזור לפרק קודם</div>
        <div>⏭️ מעבר מוקדם לפרק הבא רק אחרי שעונים על כל השאלות</div>
        <div>❗ שאלה בלי תשובה = טעות, ולכן תמיד כדאי לנחש</div>
        <div>📶 אדפטיבי: הפרק הראשון בינוני, והבאים מותאמים לביצועים שלך</div>
        <a className="small" href={SOURCES.tips} target="_blank" rel="noreferrer">
          מקור: הנחיות לנבחנים, מאל"ו ↗
        </a>
      </div>
      <div className="notice">ℹ️ {SCORE_DISCLAIMER}</div>
      <button className="btn lg block accent" disabled={!readiness.simulationUnlocked} onClick={() => setPhase('run')}>
        {readiness.simulationUnlocked ? <><En>TAKE FULL SIMULATION</En> 🚀</> : '🔒 נעול'}
      </button>
      <a className="small center" href={SOURCES.practice} target="_blank" rel="noreferrer">
        מומלץ גם: בחינות ההתנסות הרשמיות של מאל"ו ↗
      </a>
    </div>
  );
}

function SimRunner({ bank, specs, onFinish }: { bank: ContentBank; specs: SimSectionSpec[]; onFinish: (r: { sim: SimResult; sections: SectionRun[] }) => void }) {
  const { update } = useGame();
  const ui = useUI();
  const used = useRef(new Set<string>());
  const responses = useRef<SimResponse[]>([]);
  const done = useRef<SectionRun[]>([]);
  const [secIdx, setSecIdx] = useState(0);
  const [section, setSection] = useState<SectionRun>(() => buildSection(bank, specs[0], nextSectionTier([]), used.current));
  const [qi, setQi] = useState(0);
  const [start, setStart] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const simStart = useRef(Date.now());
  const closing = useRef(false);

  useEffect(() => {
    document.body.classList.add('focus-mode');
    return () => document.body.classList.remove('focus-mode');
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const remaining = Math.max(0, section.spec.minutes * 60_000 - (now - start));

  const closeSection = () => {
    if (closing.current) return;
    closing.current = true;
    const s = section;
    const perQ = Math.round((Date.now() - start) / Math.max(1, s.questions.length));
    // record answers (unanswered → null → wrong)
    update((st) => {
      let cur = st;
      s.questions.forEach((q, i) => {
        cur = applyAnswer(cur, q, s.answers[i], perQ, 'simulation', 0).state;
      });
      return cur;
    });
    if (s.spec.kind !== 'experimental') {
      s.questions.forEach((q, i) => responses.current.push({ difficulty: q.difficulty, correct: s.answers[i] === q.answer, section: secIdx }));
    }
    done.current.push(s);
    const nextIdx = secIdx + 1;
    if (nextIdx >= specs.length) {
      const exp = done.current.find((x) => x.spec.kind === 'experimental');
      const expCorrect = exp ? exp.questions.filter((q, i) => exp.answers[i] === q.answer).length : 0;
      const sim = scoreSimulation(responses.current, expCorrect, exp?.questions.length ?? 0);
      update((st) =>
        finishSession(st, {
          kind: 'simulation',
          total: sim.total,
          correct: sim.correct,
          ms: Date.now() - simStart.current,
          score: sim.score,
          meta: { bonus: sim.bonus, tiers: done.current.map((d) => d.tier) },
        }).state,
      );
      if (sim.score >= 100) ui.confetti();
      onFinish({ sim, sections: done.current });
      return;
    }
    const tier = nextSectionTier(responses.current);
    setSection(buildSection(bank, specs[nextIdx], tier, used.current));
    setSecIdx(nextIdx);
    setQi(0);
    setStart(Date.now());
    closing.current = false;
  };

  useEffect(() => {
    if (remaining <= 0) {
      ui.toast('⏰ הזמן לפרק נגמר', 'info');
      closeSection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining <= 0]);

  const allAnswered = section.answers.every((a) => a !== null);
  const q = section.questions[qi];
  const choose = (i: number) => setSection((s) => ({ ...s, answers: s.answers.map((a, k) => (k === qi ? i : a)) }));

  if (!q)
    return (
      <div className="empty">
        <p>אין מספיק שאלות לפרק הזה.</p>
        <button className="btn" onClick={closeSection}>
          לפרק הבא
        </button>
      </div>
    );

  const body = (
    <div>
      <div className="q-head">
        <span className="pill">
          פרק {secIdx + 1}/{specs.length}
        </span>
        <span className="faint" style={{ flex: 1 }}>
          {section.spec.titleHe} <Stars n={section.tier} />
        </span>
        <div className={`timer ${remaining < 30_000 ? 'low' : ''}`} aria-label="זמן שנותר לפרק">
          {formatMs(remaining)}
        </div>
      </div>
      <div className="row wrap" style={{ gap: 6, marginBottom: 12 }} role="tablist" aria-label="שאלות בפרק">
        {section.questions.map((_, i) => (
          <button key={i} role="tab" aria-selected={i === qi} className={`btn sm ${i === qi ? '' : section.answers[i] !== null ? 'soft' : 'ghost'}`} style={{ minWidth: 44 }} onClick={() => setQi(i)}>
            {i + 1}
            {section.answers[i] !== null ? ' ✓' : ''}
          </button>
        ))}
      </div>
      <div className="card pad-lg" key={q.id}>
        <QuestionBody q={q} />
        <div className="choices ltr" role="radiogroup">
          {q.options.map((o, i) => (
            <button key={i} className={`choice ${section.answers[qi] === i ? 'selected' : ''}`} role="radio" aria-checked={section.answers[qi] === i} onClick={() => choose(i)} lang="en">
              <span className="key">{'ABCD'[i]}</span>
              <span>{o}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="action-bar">
        <button className="btn ghost" disabled={qi === 0} onClick={() => setQi(qi - 1)}>
          הקודמת
        </button>
        {qi < section.questions.length - 1 ? (
          <button className="btn" onClick={() => setQi(qi + 1)}>
            הבאה
          </button>
        ) : (
          <button className="btn accent" disabled={!allAnswered} onClick={closeSection} title={allAnswered ? '' : 'צריך לענות על כל השאלות כדי לעבור מוקדם'}>
            {secIdx === specs.length - 1 ? 'סיום הבחינה' : 'לפרק הבא ⏭'}
          </button>
        )}
      </div>
      {!allAnswered && qi === section.questions.length - 1 && <p className="faint center">כדי לעבור לפרק הבא לפני תום הזמן, ענה על כל השאלות.</p>}
    </div>
  );

  return section.passage ? (
    <div className="reading-layout" style={{ margin: '0 auto' }}>
      <PassageView p={section.passage} />
      {body}
    </div>
  ) : (
    <div className="q-wrap">{body}</div>
  );
}

function SimResultView({ result, target }: { result: { sim: SimResult; sections: SectionRun[] }; target: number }) {
  const nav = useNavigate();
  const { sim, sections } = result;
  const diff = sim.score - target;
  const band = bandFor(sim.score);
  const mistakes = sections.flatMap((s) => s.questions.map((q, i) => ({ q, a: s.answers[i] }))).filter((x) => x.a !== x.q.answer);
  return (
    <div className="q-wrap stack fade-in">
      <div className="card hero result-hero">
        <div className="faint">
          <En>Estimated AmirNet Score</En>
        </div>
        <div className="big-num bounce-in num">{sim.score}</div>
        <h2>
          {band.he} · <En>{band.en}</En>
        </h2>
        <div className="grid-3" style={{ marginTop: 12, position: 'relative', zIndex: 1 }}>
          <div>
            <div className="faint">Target</div>
            <b className="num">{target}</b>
          </div>
          <div>
            <div className="faint">Difference</div>
            <b className="num en-inline">
              {diff >= 0 ? '+' : ''}
              {diff}
            </b>
          </div>
          <div>
            <div className="faint">Correct</div>
            <b className="num">
              {sim.correct}/{sim.total}
            </b>
          </div>
        </div>
      </div>
      <div className="notice warn">⚠️ {SCORE_DISCLAIMER} הציון מחושב במודל IRT פשוט שמתחשב בקושי השאלות (כמו מבחן אדפטיבי), אבל הוא לא כויל מול ציוני אמת.</div>
      <div className="card">
        <h2>פירוט לפי פרקים</h2>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>פרק</th>
                <th>קושי</th>
                <th>נכונות</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s, i) => (
                <tr key={i}>
                  <td>{s.spec.titleHe}</td>
                  <td>
                    <Stars n={s.tier} />
                  </td>
                  <td className="num">
                    {s.questions.filter((q, k) => s.answers[k] === q.answer).length}/{s.questions.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sim.bonus > 0 && <p className="faint">בונוס פרק ניסיוני: +{sim.bonus}</p>}
      </div>
      {mistakes.length > 0 && (
        <div className="card">
          <div className="card-title">
            <h2>טעויות ({mistakes.length})</h2>
            <button className="btn sm accent" onClick={() => nav(`/play/review?ids=${mistakes.map((m) => m.q.id).join(',')}`)}>
              🔁 <En>Practice Mistakes</En>
            </button>
          </div>
          <div className="list">
            {mistakes.slice(0, 30).map(({ q, a }) => (
              <div key={q.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <div className="en bold" lang="en">
                  {q.prompt}
                </div>
                <div className="small">
                  {a === null ? <span className="chip">לא נענתה</span> : <span className="chip danger">{q.options[a]}</span>} ← <span className="chip success">{q.options[q.answer]}</span>
                </div>
                <div className="faint">
                  <Bidi text={q.explanation} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <button className="btn lg block" onClick={() => nav('/ready')}>
        לדוח המוכנות
      </button>
    </div>
  );
}
