import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { useBank } from '../store/useBank';
import SessionPlayer, { type SessionSummary } from '../components/SessionPlayer';
import { Loading, En, SkillBar } from '../components/ui';
import { PLACEMENT_PLAN, placementNext, placementStartDifficulty, scorePlacement, type PlacementResult } from '../domain/placement';
import { pickPassage, pickQuestions } from '../domain/engine';
import { completePlacement } from '../services/game';
import type { Difficulty, Passage, Question } from '../domain/types';
import { bandFor, nextBand, SCORE_DISCLAIMER } from '../data/exam';
import { levelFromXp } from '../domain/levels';
import { SKILL_HE } from '../components/labels';
import { skillScore } from '../domain/scoring';

export default function Placement() {
  const { state, update, getState } = useGame();
  const bank = useBank();
  const nav = useNavigate();
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const tier = useRef<Difficulty>(placementStartDifficulty(state.profile?.selfLevel ?? 'basic'));
  const step = useRef(0);
  const passage = useRef<Passage | null>(null);
  const passages = useMemo(() => new Map(bank?.passages.map((p) => [p.id, p]) ?? []), [bank]);

  if (!bank) return <Loading />;

  const next = (used: Set<string>): Question | null => {
    // staircase on the previous answer
    if (step.current > 0) {
      const last = getState().answers[getState().answers.length - 1];
      if (last && last.mode === 'placement') tier.current = placementNext(tier.current, last.correct);
    }
    const skill = PLACEMENT_PLAN[step.current];
    step.current++;
    if (!skill) return null;
    if (skill === 'reading') {
      if (!passage.current) passage.current = pickPassage(bank, Math.min(3, tier.current) as Difficulty, [], Math.random, 3) ?? null;
      return passage.current?.questions.find((q) => !used.has(q.id)) ?? null;
    }
    return pickQuestions(bank, { skills: [skill], count: 1, difficulties: [tier.current], history: [], exclude: used })[0] ?? null;
  };

  const onDone = (s: SessionSummary) => {
    const r = scorePlacement(
      s.items.map((i) => ({ skill: i.q.skill, difficulty: i.q.difficulty, correct: i.correct })),
      state.profile?.selfLevel ?? 'basic',
    );
    update((st) => completePlacement(st, r));
    setResult(r);
  };

  if (result) {
    const band = bandFor(result.score);
    const nb = nextBand(result.score);
    const lv = levelFromXp(getState().progress.xp);
    return (
      <div className="q-wrap stack fade-in">
        <div className="card hero result-hero">
          <div className="faint">PLACEMENT RESULT</div>
          <div className="faint" style={{ marginTop: 8 }}>
            Estimated Score
          </div>
          <div className="big-num bounce-in num">{result.score}</div>
          <h2>
            {band.he} · <En>{band.en}</En>
          </h2>
          {nb && (
            <p className="muted">
              עוד {nb.min - result.score} נקודות לרמה הבאה ({nb.he})
            </p>
          )}
        </div>
        <div className="card">
          <h2>רמות לפי מיומנות</h2>
          <div className="stack" style={{ gap: 10 }}>
            {(Object.keys(result.ability) as (keyof typeof result.ability)[]).map((s) => (
              <SkillBar key={s} label={SKILL_HE[s]} pct={((skillScore(result.ability[s]) - 50) / 100) * 100} />
            ))}
          </div>
        </div>
        <div className="grid-2">
          <div className="card">
            <h3>💪 חוזקות</h3>
            {result.strong.length ? result.strong.map((s) => <div key={s} className="chip success" style={{ margin: 2 }}>{SKILL_HE[s]}</div>) : <p className="faint">פרופיל מאוזן, בלי חוזקה בולטת</p>}
          </div>
          <div className="card">
            <h3>🎯 לחיזוק</h3>
            {result.weak.length ? result.weak.map((s) => <div key={s} className="chip warn" style={{ margin: 2 }}>{SKILL_HE[s]}</div>) : <p className="faint">אין חולשה בולטת, נתקדם בכל התחומים</p>}
          </div>
        </div>
        <div className="notice">ℹ️ {SCORE_DISCLAIMER}</div>
        <p className="center muted">
          התחלת ב-<En>Level {lv.level}</En> עם בונוס 100 XP. בניתי לך מסלול אישי שמתמקד בנקודות לחיזוק.
        </p>
        <button className="btn lg block accent" onClick={() => nav('/', { replace: true })}>
          למסלול שלי 🚀
        </button>
      </div>
    );
  }

  if (!started)
    return (
      <div className="q-wrap stack fade-in">
        <div className="card hero pad-lg">
          <div style={{ fontSize: '2.6rem' }}>🧭</div>
          <h1>
            <En>PLACEMENT TEST</En>
          </h1>
          <p className="muted">20 שאלות: אוצר מילים, דקדוק, ניסוח מחדש וקטע קריאה קצר. הקושי מתאים את עצמו אלייך תוך כדי, בדיוק כמו באמירנט.</p>
        </div>
        <div className="card soft stack" style={{ gap: 8 }}>
          <div>⏱ בערך 10–15 דקות</div>
          <div>🙈 בלי פידבק באמצע, רק בסוף</div>
          <div>🤔 לא יודע? עדיף לנחש. גם באמירנט שאלה בלי תשובה נחשבת טעות</div>
        </div>
        {state.profile?.placementDone && <div className="notice warn">כבר עשית מבחן מיקום. מבחן חוזר יעדכן את הרמה שלך.</div>}
        <button className="btn lg block" onClick={() => setStarted(true)}>
          מתחילים
        </button>
        {!state.profile?.placementDone && (
          <button className="link-btn" onClick={() => nav('/')}>
            דלג בינתיים (לא מומלץ)
          </button>
        )}
      </div>
    );

  return <SessionPlayer title="Placement Test" mode="placement" next={next} count={PLACEMENT_PLAN.length} passages={passages} feedback="end" onDone={onDone} finish={(s) => ({ kind: 'placement', total: s.total, correct: s.correct, ms: s.ms })} exitTo="/" />;
}
