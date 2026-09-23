import { useMemo, useState } from 'react';
import { useGame } from '../store/GameContext';
import { useBank } from '../store/useBank';
import SessionPlayer, { type SessionSummary } from '../components/SessionPlayer';
import { En, Loading, PageHeader } from '../components/ui';
import { pickQuestions } from '../domain/engine';
import { chooseDifficulty, sessionDifficulties } from '../domain/adaptive';
import { overallTheta } from '../domain/scoring';
import { dayKey, hashString, rng } from '../domain/util';
import { XP } from '../domain/xp';

const COUNT = 10;
const SECONDS = 240;

/** Simulated field for the daily ranking (seeded per day). */
function dailyField(today: string): number[] {
  const r = rng(hashString('daily-field' + today));
  return Array.from({ length: 49 }, () => Math.max(2, Math.min(10, Math.round(5.5 + (r() + r() + r() - 1.5) * 3.2))));
}

export default function Daily() {
  const bank = useBank();
  const { state, getState } = useGame();
  const [playing, setPlaying] = useState(false);
  const today = dayKey();
  const doneToday = state.progress.dailyDone[today];

  const questions = useMemo(() => {
    if (!bank) return [];
    const s = getState();
    const d = chooseDifficulty(overallTheta(s.progress.ability), Math.round((s.progress.practiceLevel.vocabulary + s.progress.practiceLevel.grammar) / 2) as 1 | 2 | 3 | 4);
    const rand = rng(hashString('daily' + today));
    return pickQuestions(bank, { skills: ['vocabulary', 'grammar', 'restatement'], count: COUNT, difficulties: sessionDifficulties(d, COUNT, rand), history: [], rand, includeGenerated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank, today, playing]);

  if (!bank) return <Loading />;

  if (playing)
    return (
      <SessionPlayer
        title="⚡ Daily Challenge"
        mode="daily"
        questions={questions}
        timeLimitSec={SECONDS}
        exitTo="/"
        finish={(s) => ({ kind: 'daily', total: s.total, correct: s.correct, ms: s.ms })}
        resultExtra={(s: SessionSummary) => {
          const field = dailyField(today);
          const better = field.filter((x) => x > s.correct).length;
          return (
            <div className="card center">
              <h2>
                🔥 <En>Daily Score</En>
              </h2>
              <p className="big-num num">
                #{better + 1}
                <span className="faint" style={{ fontSize: '1rem' }}>
                  {' '}
                  / {field.length + 1}
                </span>
              </p>
              <p className="faint">דירוג מול שחקני האתגר של היום (יריבים מדומים עד שיהיה שרת)</p>
              {doneToday !== undefined && <p className="faint">XP על האתגר ניתן פעם אחת ביום. הסבב הזה הוא לאימון.</p>}
            </div>
          );
        }}
      />
    );

  return (
    <div className="q-wrap stack">
      <PageHeader title={<><En>Daily Challenge</En> ⚡</>} sub="אותו אתגר לכל היום. חוזרים מחר לאתגר חדש." />
      <div className="card hero pad-lg center">
        <div style={{ fontSize: '3rem' }} className="bounce-in">
          ⚡
        </div>
        <h2>{COUNT} שאלות · {SECONDS / 60} דקות</h2>
        <p className="muted">
          עד {XP.dailyChallengeMax} XP, לפי הדיוק. שאלה שלא נענתה עד תום הזמן נחשבת טעות.
        </p>
        {doneToday !== undefined && <div className="chip" style={{ background: 'rgba(255,255,255,.2)', color: '#fff' }}>הציון שלך היום: {doneToday}%</div>}
      </div>
      <button className="btn lg block" onClick={() => setPlaying(true)}>
        {doneToday !== undefined ? 'שחק שוב (אימון)' : 'START ▶'}
      </button>
    </div>
  );
}
