import { useMemo, useState } from 'react';
import { useGame } from '../store/GameContext';
import { useBank } from '../store/useBank';
import { mastery, nextReviewLabel } from '../domain/srs';
import { dayKey } from '../domain/util';
import { Loading, PageHeader, Stars } from '../components/ui';

const PAGE = 30;

export default function WordList() {
  const { state } = useGame();
  const bank = useBank();
  const [q, setQ] = useState('');
  const [diff, setDiff] = useState(0);
  const [page, setPage] = useState(1);
  const today = dayKey();

  const filtered = useMemo(() => {
    if (!bank) return [];
    const needle = q.trim().toLowerCase();
    return bank.words.filter((w) => (!diff || w.difficulty === diff) && (!needle || w.en.toLowerCase().includes(needle) || w.he.includes(needle)));
  }, [bank, q, diff]);

  if (!bank) return <Loading />;
  const shown = filtered.slice(0, page * PAGE);

  return (
    <div className="stack">
      <PageHeader title="מאגר המילים 🔎" sub={`${bank.words.length} מילים`} back="/vocab" />
      <div className="row">
        <input type="text" placeholder="חיפוש באנגלית או בעברית" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} aria-label="חיפוש מילה" />
        <select value={diff} onChange={(e) => (setDiff(Number(e.target.value)), setPage(1))} aria-label="סינון לפי קושי" style={{ width: 150 }}>
          <option value={0}>כל הרמות</option>
          <option value={1}>Easy</option>
          <option value={2}>Medium</option>
          <option value={3}>Hard</option>
          <option value={4}>Very Hard</option>
        </select>
      </div>
      <div className="card">
        <div className="list">
          {shown.map((w) => {
            const uw = state.vocab[w.id];
            return (
              <div key={w.id} className="list-item" style={{ flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <b className="en-inline">{w.en}</b> <span className="muted">· {w.he}</span>
                  <div className="faint en" lang="en">
                    {w.example}
                  </div>
                </div>
                <div className="row xs" style={{ gap: 8 }}>
                  <Stars n={w.difficulty} />
                  <span className="chip">{w.category}</span>
                  <span className="chip primary">{mastery(uw)}%</span>
                  <span className="chip">{nextReviewLabel(uw, today)}</span>
                </div>
              </div>
            );
          })}
        </div>
        {shown.length < filtered.length && (
          <button className="btn ghost block" style={{ marginTop: 12 }} onClick={() => setPage((p) => p + 1)}>
            טען עוד ({filtered.length - shown.length})
          </button>
        )}
      </div>
    </div>
  );
}
