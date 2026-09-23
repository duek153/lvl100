import { Link } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { isDue, isLearned, isMastered, weakWords } from '../domain/srs';
import { dayKey } from '../domain/util';
import { En, PageHeader, Stat } from '../components/ui';

export default function Vocab() {
  const { state } = useGame();
  const today = dayKey();
  const words = Object.values(state.vocab);
  const learned = words.filter(isLearned).length;
  const mastered = words.filter(isMastered).length;
  const due = words.filter((w) => w.seen > 0 && isDue(w, today)).length;
  const weak = weakWords(state.vocab).length;

  return (
    <div className="stack">
      <PageHeader title="אוצר מילים 📚" sub="Spaced Repetition: מילים שאתה יודע חוזרות פחות, ומילים שקשות לך חוזרות יותר." />
      <div className="grid-4">
        <Stat value={learned} label="מילים שנלמדו" icon="📗" />
        <Stat value={mastered} label="בשליטה מלאה" icon="🏅" />
        <Stat value={due} label="לחזרה היום" icon="🔄" />
        <Stat value={weak} label="מילים חלשות" icon="🎯" />
      </div>
      <Link to="/play/srs" className="card hero link pad-lg">
        <div className="row" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '2.4rem' }}>🔄</div>
          <div>
            <h2 style={{ marginBottom: 2 }}>
              <En>Smart Review</En>
            </h2>
            <div className="muted">{due ? `${due} מילים מחכות לחזרה, ועוד מילים חדשות` : 'מילים חדשות ברמה שלך'}</div>
          </div>
        </div>
      </Link>
      <div className="grid-2">
        <Link to="/vocab/cards" className="card link">
          <div className="row">
            <div className="emoji-badge">🃏</div>
            <div>
              <b>
                <En>Flashcards</En>
              </b>
              <div className="faint">הופכים כרטיס ומדרגים את עצמכם</div>
            </div>
          </div>
        </Link>
        <Link to="/play/practice?skill=vocabulary" className="card link">
          <div className="row">
            <div className="emoji-badge">✍️</div>
            <div>
              <b>
                <En>Sentence Completion</En>
              </b>
              <div className="faint">השלמת משפטים ומילים נרדפות בסגנון הבחינה</div>
            </div>
          </div>
        </Link>
        <Link to="/vocab/weak" className="card link">
          <div className="row">
            <div className="emoji-badge" style={{ background: 'var(--danger-soft)' }}>
              🎯
            </div>
            <div>
              <b>
                <En>My Weak Words</En>
              </b>
              <div className="faint">{weak} מילים שטעית בהן 3 פעמים או יותר</div>
            </div>
          </div>
        </Link>
        <Link to="/vocab/list" className="card link">
          <div className="row">
            <div className="emoji-badge">🔎</div>
            <div>
              <b>
                <En>Word Bank</En>
              </b>
              <div className="faint">כל המילים, עם חיפוש ו-Mastery</div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
