import { Link } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { computeReadiness } from '../domain/readiness';
import { weakWords } from '../domain/srs';
import { En, PageHeader, Stars } from '../components/ui';
import { chooseDifficulty } from '../domain/adaptive';

export default function Practice() {
  const { state } = useGame();
  const r = computeReadiness(state.answers, state.progress, state.profile);
  const p = state.progress;
  const tier = (s: 'vocabulary' | 'grammar' | 'reading' | 'restatement') => chooseDifficulty(p.ability[s], p.practiceLevel[s]);
  const weak = weakWords(state.vocab).length;
  const lastWrong = [...state.answers].reverse().filter((a) => !a.correct).slice(0, 10).map((a) => a.questionId);

  const cards = [
    { to: '/vocab', e: '📚', t: 'Vocabulary', h: 'אוצר מילים, Flashcards וחזרות', pct: r.vocabulary, d: tier('vocabulary') },
    { to: '/grammar', e: '🧩', t: 'Grammar', h: '11 נושאים: הסבר, תרגול, אתגר', pct: r.grammar, d: tier('grammar') },
    { to: '/reading', e: '📖', t: 'Reading', h: '50 אנסינים קצרים ומעניינים', pct: r.reading, d: tier('reading') },
    { to: '/play/practice?skill=restatement', e: '🔁', t: 'Restatements', h: 'ניסוח מחדש בסגנון הבחינה', pct: r.restatement, d: tier('restatement') },
  ];

  return (
    <div className="stack">
      <PageHeader title="תרגול 🎯" sub="הקושי מתאים את עצמו אליך בזמן אמת" />
      <Link to="/play/practice?skill=mixed" className="card hero link pad-lg">
        <div className="row" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '2.4rem' }}>⚡</div>
          <div>
            <h2 style={{ marginBottom: 2 }}>
              <En>Smart Mix</En>
            </h2>
            <div className="muted">10 שאלות מותאמות אישית, עם יותר ממה שחלש אצלך</div>
          </div>
        </div>
      </Link>
      <div className="grid-2">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="card link">
            <div className="row">
              <div className="emoji-badge">{c.e}</div>
              <div style={{ flex: 1 }}>
                <div className="spread">
                  <b>
                    <En>{c.t}</En>
                  </b>
                  <Stars n={c.d} />
                </div>
                <div className="faint">{c.h}</div>
                <div className="xs muted" style={{ marginTop: 4 }}>
                  מוכנות: {c.pct}%
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="grid-2">
        <Link to="/vocab/weak" className="card link">
          <div className="row">
            <div className="emoji-badge" style={{ background: 'var(--danger-soft)' }}>
              🎯
            </div>
            <div>
              <b>
                <En>My Weak Words</En>
              </b>
              <div className="faint">{weak ? `${weak} מילים מחכות לחיזוק` : 'אין כרגע מילים חלשות 💪'}</div>
            </div>
          </div>
        </Link>
        <Link to={lastWrong.length ? `/play/review?ids=${lastWrong.join(',')}` : '/practice'} className={`card link ${lastWrong.length ? '' : 'locked'}`}>
          <div className="row">
            <div className="emoji-badge" style={{ background: 'var(--accent-soft)' }}>
              🔁
            </div>
            <div>
              <b>
                <En>Practice Mistakes</En>
              </b>
              <div className="faint">{lastWrong.length ? `${lastWrong.length} הטעויות האחרונות שלך` : 'עוד אין טעויות לתרגל'}</div>
            </div>
          </div>
        </Link>
        <Link to="/daily" className="card link">
          <div className="row">
            <div className="emoji-badge" style={{ background: 'var(--warn-soft)' }}>
              ⚡
            </div>
            <div>
              <b>
                <En>Daily Challenge</En>
              </b>
              <div className="faint">10 שאלות נגד השעון</div>
            </div>
          </div>
        </Link>
        <Link to="/road" className="card link">
          <div className="row">
            <div className="emoji-badge">⚔️</div>
            <div>
              <b>
                <En>Boss Battles</En>
              </b>
              <div className="faint">נצח את ה-Boss כדי לעבור Stage</div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
