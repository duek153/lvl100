import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { useBank } from '../store/useBank';
import { gradeFlashcard } from '../services/game';
import { mastery, nextReviewLabel, pickReviewWords, type Grade } from '../domain/srs';
import { chooseDifficulty } from '../domain/adaptive';
import { dayKey } from '../domain/util';
import { wordPool } from '../services/sessions';
import { Bar, En, Loading, PageHeader, Stars } from '../components/ui';

export default function Flashcards() {
  const bank = useBank();
  const { state, update, getState } = useGame();
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ known: 0, again: 0 });

  const deck = useMemo(() => {
    if (!bank) return [];
    const s = getState();
    const tier = chooseDifficulty(s.progress.ability.vocabulary, s.progress.practiceLevel.vocabulary);
    return pickReviewWords(s.vocab, wordPool(bank, tier), dayKey(), 15).map((id) => bank.wordById.get(id)!).filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank]);

  if (!bank) return <Loading />;
  const w = deck[i];
  const today = dayKey();

  if (!w)
    return (
      <div className="q-wrap stack center fade-in">
        <div style={{ fontSize: '3rem' }}>🎉</div>
        <h1>סיימת את החבילה!</h1>
        <p className="muted">
          ✅ ידעת {stats.known} · 🔁 לחזרה {stats.again}
        </p>
        <button className="btn lg" onClick={() => nav('/vocab')}>
          חזרה לאוצר מילים
        </button>
      </div>
    );

  const uw = state.vocab[w.id];
  const grade = (g: Grade) => {
    update((s) => gradeFlashcard(s, w.id, g));
    setStats((st) => (g >= 2 ? { ...st, known: st.known + 1 } : { ...st, again: st.again + 1 }));
    setFlipped(false);
    setI((x) => x + 1);
  };

  return (
    <div className="q-wrap stack">
      <PageHeader title="Flashcards 🃏" back="/vocab" right={<span className="pill num">{i + 1}/{deck.length}</span>} />
      <Bar pct={(i / deck.length) * 100} />
      <div
        className={`flashcard ${flipped ? 'flipped' : ''}`}
        onClick={() => setFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        aria-label={flipped ? 'צד אחורי. לחץ להפוך' : 'לחץ כדי לראות פירוש'}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), setFlipped((f) => !f))}
      >
        <div className="flashcard-inner">
          <div className="flashcard-face">
            <span className="chip">{w.category}</span>
            <div className="word en" lang="en">
              {w.en.toUpperCase()}
            </div>
            <Stars n={w.difficulty} />
            <div className="faint">לחץ להפוך 👆</div>
          </div>
          <div className="flashcard-face back">
            <div className="word" style={{ fontSize: '2rem' }}>
              {w.he}
            </div>
            <div className="en muted" lang="en" style={{ textAlign: 'center' }}>
              “{w.example}”
            </div>
            <div className="row wrap" style={{ justifyContent: 'center' }}>
              <span className="chip primary">Mastery {mastery(uw)}%</span>
              <span className="chip">חזרה הבאה: {nextReviewLabel(uw, today)}</span>
            </div>
          </div>
        </div>
      </div>
      {flipped ? (
        <div className="grid-4">
          <button className="btn danger" onClick={() => grade(0)}>
            😵 שכחתי
          </button>
          <button className="btn accent" onClick={() => grade(1)}>
            🤔 קשה
          </button>
          <button className="btn success" onClick={() => grade(2)}>
            🙂 ידעתי
          </button>
          <button className="btn" onClick={() => grade(3)}>
            😎 קל
          </button>
        </div>
      ) : (
        <button className="btn lg block" onClick={() => setFlipped(true)}>
          הצג פירוש
        </button>
      )}
      <p className="faint center">
        <En>I know this</En> = הכרטיס יחזור בעוד זמן רב · <En>Need practice</En> = יחזור בקרוב
      </p>
    </div>
  );
}
