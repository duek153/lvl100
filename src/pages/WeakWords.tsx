import { useNavigate } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { useBank } from '../store/useBank';
import { accuracy, mastery, weakWords } from '../domain/srs';
import { Bar, Empty, En, Loading, PageHeader } from '../components/ui';

export default function WeakWords() {
  const { state } = useGame();
  const bank = useBank();
  const nav = useNavigate();
  if (!bank) return <Loading />;
  const weak = weakWords(state.vocab);
  return (
    <div className="stack">
      <PageHeader title={<En>My Weak Words 🎯</En>} sub="מילים שטעית בהן 3 פעמים או יותר, מהקשה ביותר" back="/vocab" />
      {weak.length === 0 ? (
        <div className="card">
          <Empty emoji="💪" title="אין מילים חלשות כרגע">
            <p className="muted">כשתטעה במילה 3 פעמים, היא תופיע כאן לתרגול ממוקד.</p>
          </Empty>
        </div>
      ) : (
        <>
          <button className="btn lg block accent" onClick={() => nav('/play/weak')}>
            🎯 <En>Practice Weak Words</En>
          </button>
          <div className="card">
            <div className="list">
              {weak.map((uw, i) => {
                const w = bank.wordById.get(uw.wordId);
                if (!w) return null;
                return (
                  <div key={uw.wordId} className="list-item" style={{ flexWrap: 'wrap' }}>
                    <span className="rank num">{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div className="bold en-inline">{w.en}</div> <span className="muted">· {w.he}</span>
                      <Bar pct={mastery(uw)} className="thin" label="Mastery" />
                    </div>
                    <div className="row xs muted" style={{ gap: 10 }}>
                      <span>🎯 {accuracy(uw)}%</span>
                      <span>❌ {uw.wrong}</span>
                      <span>📅 {uw.lastMistake ?? '—'}</span>
                      <span className="chip primary">{mastery(uw)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
