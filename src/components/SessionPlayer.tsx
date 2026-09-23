import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Passage, Question, SessionMode } from '../domain/types';
import { useGame } from '../store/GameContext';
import { useUI } from '../store/UIContext';
import { applyAnswer, applyConfidence, finishSession, type FinishInput } from '../services/game';
import { feedbackLine, sessionHeadline } from '../domain/motivation';
import { formatMs } from '../domain/util';
import { Bar, Bidi, En, Stars } from './ui';
import { GRAMMAR_LABELS } from './labels';

export interface AnsweredItem {
  q: Question;
  userAnswer: number | null;
  correct: boolean;
  ms: number;
  recordId: string;
}

export interface SessionSummary {
  items: AnsweredItem[];
  total: number;
  correct: number;
  ms: number;
  xp: number;
  timedOut: boolean;
}

export interface SessionProps {
  title: string;
  mode: SessionMode;
  questions?: Question[];
  /** dynamic (adaptive) question source; called before each question */
  next?: (used: Set<string>) => Question | null;
  count?: number;
  passages?: Map<string, Passage>;
  timeLimitSec?: number;
  feedback?: 'instant' | 'end';
  /** Build the attempt to record; return null for none. */
  finish?: (s: SessionSummary) => FinishInput | null;
  resultExtra?: (s: SessionSummary, passed?: boolean) => ReactNode;
  exitTo?: string;
  onDone?: (s: SessionSummary) => void;
}

const TYPE_LABEL: Record<Question['type'], string> = {
  word_meaning: 'Vocabulary · Meaning',
  word_reverse: 'Vocabulary · Translate',
  closest_meaning: 'Vocabulary · Closest Meaning',
  sentence_completion: 'Sentence Completion',
  restatement: 'Restatement',
  grammar: 'Grammar',
  reading: 'Reading Comprehension',
};

const KEYS = ['A', 'B', 'C', 'D'];

export function questionInstruction(q: Question): string | null {
  if (q.type === 'restatement') return 'Choose the sentence closest in meaning to the original sentence:';
  if (q.type === 'word_reverse') return 'Which English word means:';
  if (q.type === 'sentence_completion') return 'Choose the answer that best completes the sentence:';
  return null;
}

export function QuestionBody({ q }: { q: Question }) {
  const instr = questionInstruction(q);
  return (
    <>
      <div className="q-type en">
        {TYPE_LABEL[q.type]}
        {q.type === 'grammar' && GRAMMAR_LABELS[q.topic] ? ` · ${GRAMMAR_LABELS[q.topic]}` : ''} <Stars n={q.difficulty} />
      </div>
      {instr && (
        <En block>
          <div className="muted small" style={{ marginBottom: 6 }}>
            {instr}
          </div>
        </En>
      )}
      {q.type === 'word_reverse' ? (
        <div className="q-prompt he" dir="rtl">
          {q.prompt}
        </div>
      ) : (
        <div className="q-prompt en" lang="en" dir="ltr">
          {q.prompt}
        </div>
      )}
    </>
  );
}

export function PassageView({ p }: { p: Passage }) {
  return (
    <article className="passage en" lang="en" dir="ltr" aria-label="Reading passage" tabIndex={0}>
      <h3>
        {p.emoji} {p.title}
      </h3>
      {p.paragraphs.map((t, i) => (
        <p key={i}>
          <span className="pnum">({i + 1})</span>
          {t}
        </p>
      ))}
    </article>
  );
}

export default function SessionPlayer(props: SessionProps) {
  const { title, mode, passages, timeLimitSec, feedback = 'instant', exitTo = '/' } = props;
  const game = useGame();
  const ui = useUI();
  const nav = useNavigate();

  const fixed = props.questions;
  const total = fixed ? fixed.length : props.count ?? 10;
  const used = useRef(new Set<string>());
  const [queue, setQueue] = useState<Question[]>(() => {
    if (fixed) return fixed;
    const first = props.next?.(used.current);
    if (first) used.current.add(first.id);
    return first ? [first] : [];
  });
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [items, setItems] = useState<AnsweredItem[]>([]);
  const [combo, setCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [line, setLine] = useState('');
  const [conf, setConf] = useState<'know' | 'practice' | null>(null);
  const [done, setDone] = useState<null | { summary: SessionSummary; passed?: boolean; bonus: number }>(null);
  const qStart = useRef(Date.now());
  const sessionStart = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  const finishing = useRef(false);

  const q = queue[idx];
  const passage = q?.passageId ? passages?.get(q.passageId) : undefined;

  useEffect(() => {
    qStart.current = Date.now();
  }, [idx]);

  // session timer
  useEffect(() => {
    if (!timeLimitSec || done) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [timeLimitSec, done]);
  const remainingMs = timeLimitSec ? Math.max(0, timeLimitSec * 1000 - (now - sessionStart.current)) : 0;

  const finalize = useCallback(
    (all: AnsweredItem[], timedOut: boolean, xpSoFar: number) => {
      if (finishing.current) return;
      finishing.current = true;
      const summary: SessionSummary = {
        items: all,
        total: all.length,
        correct: all.filter((i) => i.correct).length,
        ms: Date.now() - sessionStart.current,
        xp: xpSoFar,
        timedOut,
      };
      const input = props.finish?.(summary);
      let passed: boolean | undefined;
      let bonus = 0;
      if (input) {
        game.update((s) => {
          const out = finishSession(s, input);
          passed = out.passed;
          bonus = out.bonusXp;
          return out.state;
        });
      }
      if ((passed || summary.correct / Math.max(1, summary.total) >= 0.8) && summary.total > 0) ui.confetti();
      setDone({ summary: { ...summary, xp: xpSoFar + bonus }, passed, bonus });
      props.onDone?.(summary);
    },
    [game, props, ui],
  );

  const record = useCallback(
    (answer: number | null, curItems: AnsweredItem[], curCombo: number, curXp: number) => {
      const ms = Date.now() - qStart.current;
      const correct = answer === q.answer;
      const newCombo = correct ? curCombo + 1 : 0;
      let gained = 0;
      let recordId = '';
      game.update((s) => {
        const out = applyAnswer(s, q, answer, ms, mode, newCombo);
        gained = out.xp.total + out.bonusXp;
        recordId = out.record.id;
        if (out.streakExtended) ui.toast(`🔥 היום נספר ברצף! ${out.state.progress.streak.current} ימים`, 'success');
        return out.state;
      });
      const item = { q, userAnswer: answer, correct, ms, recordId };
      return { items: [...curItems, item], combo: newCombo, xp: curXp + gained, gained, correct };
    },
    [game, mode, q, ui],
  );

  // time's up → mark the rest unanswered (official rule: unanswered = wrong)
  useEffect(() => {
    if (!timeLimitSec || done || remainingMs > 0 || !q) return;
    let cur = items;
    if (!checked) cur = record(selected, cur, combo, xp).items;
    const rest = (fixed ?? queue).slice(cur.length);
    for (const rq of rest) {
      let recordId = '';
      game.update((s) => {
        const out = applyAnswer(s, rq, null, 0, mode, 0);
        recordId = out.record.id;
        return out.state;
      });
      cur = [...cur, { q: rq, userAnswer: null, correct: false, ms: 0, recordId }];
    }
    ui.toast('⏰ הזמן נגמר', 'info');
    finalize(cur, true, xp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs]);

  const advance = useCallback(
    (curItems: AnsweredItem[], curXp: number) => {
      setSelected(null);
      setChecked(false);
      setConf(null);
      setLine('');
      if (curItems.length >= total) {
        finalize(curItems, false, curXp);
        return;
      }
      if (!fixed) {
        const nq = props.next?.(used.current);
        if (!nq) {
          finalize(curItems, false, curXp);
          return;
        }
        used.current.add(nq.id);
        setQueue((qq) => [...qq, nq]);
      }
      setIdx((i) => i + 1);
    },
    [finalize, fixed, props, total],
  );

  const onCheck = useCallback(
    (e?: { clientX: number; clientY: number }) => {
      if (selected === null || !q) return;
      const r = record(selected, items, combo, xp);
      setItems(r.items);
      setCombo(r.combo);
      setXp(r.xp);
      if (feedback === 'end') {
        advance(r.items, r.xp);
        return;
      }
      setChecked(true);
      setLine(feedbackLine(r.correct, q.difficulty, r.combo));
      if (r.gained > 0) ui.xpFloat(r.gained, e?.clientX, e?.clientY);
    },
    [advance, combo, feedback, items, q, record, selected, ui, xp],
  );

  const onConfidence = (c: 'know' | 'practice') => {
    const last = items[items.length - 1];
    if (!last) return;
    setConf(c);
    game.update((s) => applyConfidence(s, last.recordId, c));
  };

  // keyboard: 1-4 / A-D select, Enter check/continue
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toUpperCase();
      const n = ['1', '2', '3', '4'].indexOf(k) >= 0 ? Number(k) - 1 : KEYS.indexOf(k);
      if (!checked && n >= 0 && n < (q?.options.length ?? 0)) setSelected(n);
      if (e.key === 'Enter') {
        if (!checked && selected !== null) onCheck();
        else if (checked) advance(items, xp);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, checked, done, items, onCheck, q, selected, xp]);

  // focus mode (hide bottom nav) while playing
  useEffect(() => {
    document.body.classList.add('focus-mode');
    return () => document.body.classList.remove('focus-mode');
  }, []);

  const progressPct = (items.length / Math.max(1, total)) * 100;

  if (done) return <ResultScreen title={title} summary={done.summary} passed={done.passed} bonus={done.bonus} extra={props.resultExtra?.(done.summary, done.passed)} exitTo={exitTo} onRetryMistakes={(ids) => nav(`/play/review?ids=${ids.join(',')}`)} />;

  if (!q)
    return (
      <div className="empty">
        <div className="e">🤷</div>
        <h3>לא נמצאו שאלות מתאימות</h3>
        <button className="btn" onClick={() => nav(exitTo)}>
          חזרה
        </button>
      </div>
    );

  const isLast = items.length + (checked ? 0 : 1) >= total;
  const dir = q.optionsDir ?? 'ltr';

  return (
    <div className={passage ? 'reading-layout' : 'q-wrap'} style={passage ? { margin: '0 auto' } : undefined}>
      {passage && <PassageView p={passage} />}
      <div>
        <div className="q-head">
          <button className="icon-btn" aria-label="יציאה" onClick={() => nav(exitTo)} title="יציאה (ההתקדמות נשמרת אחרי כל תשובה)">
            ✕
          </button>
          <Bar pct={progressPct} className="thick" label="התקדמות בסשן" />
          {timeLimitSec ? (
            <div className={`timer ${remainingMs < 30_000 ? 'low' : ''}`} aria-live="off" aria-label="זמן שנותר">
              {formatMs(remainingMs)}
            </div>
          ) : (
            <span className="pill num" aria-label="שאלה">
              {Math.min(items.length + 1, total)}/{total}
            </span>
          )}
        </div>
        <div className="spread" style={{ marginBottom: 8 }}>
          <span className="faint">{title}</span>
          {combo >= 2 && feedback === 'instant' && <span className="chip accent">🔥 Combo x{combo}</span>}
        </div>

        <div className="card pad-lg fade-in" key={q.id}>
          <QuestionBody q={q} />
          <div className={`choices ${dir}`} role="radiogroup" aria-label="תשובות">
            {q.options.map((o, i) => {
              let cls = 'choice';
              if (checked) {
                if (i === q.answer) cls += ' correct';
                else if (i === selected) cls += ' wrong';
              } else if (i === selected) cls += ' selected';
              return (
                <button key={i} className={cls} role="radio" aria-checked={i === selected} disabled={checked} onClick={() => setSelected(i)} lang={dir === 'ltr' ? 'en' : 'he'}>
                  <span className="key" aria-hidden>
                    {dir === 'ltr' ? KEYS[i] : i + 1}
                  </span>
                  <span>{o}</span>
                </button>
              );
            })}
          </div>

          {checked && (
            <div className={`feedback ${items[items.length - 1]?.correct ? 'ok' : 'bad'}`} role="alert">
              <h3>
                {items[items.length - 1]?.correct ? '✅ ' : '❌ '}
                <En>{line}</En>
              </h3>
              {!items[items.length - 1]?.correct && (
                <p style={{ marginBottom: 6 }}>
                  התשובה הנכונה: <b lang={dir === 'ltr' ? 'en' : 'he'} className={dir === 'ltr' ? 'en-inline' : ''}>{q.options[q.answer]}</b>
                </p>
              )}
              <p style={{ marginBottom: 0 }}>
                <b>למה? </b>
                <Bidi text={q.explanation} />
              </p>
              <div className="row wrap" style={{ marginTop: 12 }}>
                <span className="faint">איך הרגשת?</span>
                <button className={`btn sm ${conf === 'know' ? 'success' : 'ghost'}`} onClick={() => onConfidence('know')} aria-pressed={conf === 'know'}>
                  💪 <En>I know this</En>
                </button>
                <button className={`btn sm ${conf === 'practice' ? 'accent' : 'ghost'}`} onClick={() => onConfidence('practice')} aria-pressed={conf === 'practice'}>
                  🔁 <En>Need practice</En>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="action-bar">
          {!checked ? (
            <button className="btn lg" disabled={selected === null} onClick={(e) => onCheck(e)}>
              {feedback === 'end' ? (isLast ? 'סיום' : 'הבא') : 'בדיקה'}
            </button>
          ) : (
            <button className={`btn lg ${items[items.length - 1]?.correct ? 'success' : ''}`} onClick={() => advance(items, xp)} autoFocus>
              {isLast ? 'לתוצאות 🏁' : 'המשך'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ResultScreen({ title, summary, passed, bonus, extra, exitTo, onRetryMistakes }: { title: string; summary: SessionSummary; passed?: boolean; bonus: number; extra?: ReactNode; exitTo: string; onRetryMistakes: (ids: string[]) => void }) {
  const nav = useNavigate();
  const pct = summary.total ? Math.round((summary.correct / summary.total) * 100) : 0;
  const head = sessionHeadline(pct);
  const mistakes = summary.items.filter((i) => !i.correct);
  const avg = summary.total ? summary.items.reduce((s, i) => s + i.ms, 0) / summary.total : 0;
  return (
    <div className="q-wrap stack fade-in">
      <div className="card hero result-hero">
        <div className="faint">{title}</div>
        <div className="big-num bounce-in num">
          {summary.correct}/{summary.total}
        </div>
        <h2 style={{ marginTop: 8 }}>{passed === true ? 'ניצחת! 🏆' : passed === false ? 'Not there yet 💪' : head.title}</h2>
        <p className="muted en" style={{ textAlign: 'center' }}>
          {passed === false ? `צריך 70% כדי לעבור. אתה ${Math.max(0, Math.ceil(summary.total * 0.7) - summary.correct)} תשובות מהמטרה.` : head.sub}
        </p>
      </div>
      <div className="grid-4">
        <div className="stat">
          <div className="v num">{pct}%</div>
          <div className="l">Accuracy</div>
        </div>
        <div className="stat">
          <div className="v num">{formatMs(summary.ms)}</div>
          <div className="l">Time</div>
        </div>
        <div className="stat">
          <div className="v num" style={{ color: 'var(--primary)' }}>
            +{summary.xp}
          </div>
          <div className="l">XP{bonus ? ` (כולל בונוס ${bonus})` : ''}</div>
        </div>
        <div className="stat">
          <div className="v num">{Math.round(avg / 1000)}s</div>
          <div className="l">ממוצע לשאלה</div>
        </div>
      </div>
      {summary.timedOut && <div className="notice warn">⏰ הזמן נגמר. שאלות שלא נענו נספרו כשגויות, בדיוק כמו באמירנט האמיתית.</div>}
      {extra}
      {mistakes.length > 0 ? (
        <div className="card">
          <div className="card-title">
            <h2>הטעויות שלך ({mistakes.length})</h2>
            <button className="btn sm accent" onClick={() => onRetryMistakes(mistakes.map((m) => m.q.id))}>
              🔁 <En>Practice Mistakes</En>
            </button>
          </div>
          <div className="list">
            {mistakes.map((m, i) => (
              <div key={i} className="list-item" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
                <div className={m.q.type === 'word_reverse' ? '' : 'en'} style={{ fontWeight: 600, width: '100%' }}>
                  {m.q.prompt}
                </div>
                <div className="small">
                  {m.userAnswer !== null ? (
                    <>
                      ענית: <span className="chip danger">{m.q.options[m.userAnswer]}</span>{' '}
                    </>
                  ) : (
                    <span className="chip">לא נענתה</span>
                  )}{' '}
                  נכון: <span className="chip success">{m.q.options[m.q.answer]}</span>
                </div>
                <div className="faint">
                  <Bidi text={m.q.explanation} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        summary.total > 0 && <div className="notice accent">🎯 אפס טעויות. ביצוע נקי!</div>
      )}
      <div className="row">
        <button className="btn block lg" onClick={() => nav(exitTo)}>
          המשך
        </button>
      </div>
    </div>
  );
}

export function useQuestionMap(questions: Question[]) {
  return useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
}
