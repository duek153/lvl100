import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { useBank } from '../store/useBank';
import { En, Loading, PageHeader, Stars } from '../components/ui';

export default function Reading() {
  const bank = useBank();
  const { state } = useGame();
  const [topic, setTopic] = useState('all');

  const results = useMemo(() => {
    const m = new Map<string, { c: number; n: number }>();
    for (const a of state.answers) {
      if (a.skill !== 'reading') continue;
      const pid = a.questionId.split('-q')[0];
      const r = m.get(pid) ?? { c: 0, n: 0 };
      r.n++;
      if (a.correct) r.c++;
      m.set(pid, r);
    }
    return m;
  }, [state.answers]);

  if (!bank) return <Loading />;
  const topics = Array.from(new Set(bank.passages.map((p) => p.topic)));
  const list = bank.passages.filter((p) => topic === 'all' || p.topic === topic);

  return (
    <div className="stack">
      <PageHeader title="אנסינים 📖" sub={`${bank.passages.length} קטעי קריאה מקוריים בסגנון הבחינה`} />
      <div className="row wrap" style={{ gap: 6 }}>
        <button className={`chip ${topic === 'all' ? 'primary' : ''}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => setTopic('all')}>
          הכול
        </button>
        {topics.map((t) => (
          <button key={t} className={`chip ${topic === t ? 'primary' : ''}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => setTopic(t)}>
            {bank.passages.find((p) => p.topic === t)?.emoji} <En>{t}</En>
          </button>
        ))}
      </div>
      <div className="grid-2">
        {list.map((p) => {
          const r = results.get(p.id);
          return (
            <Link key={p.id} to={`/reading/${p.id}`} className="card link">
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <div className="emoji-badge">{p.emoji}</div>
                <div style={{ flex: 1 }}>
                  <b className="en" lang="en" style={{ display: 'block' }}>
                    {p.title}
                  </b>
                  <div className="row wrap xs muted" style={{ gap: 8, marginTop: 4 }}>
                    <Stars n={p.difficulty} />
                    <span>⏱ {p.minutes} דק׳</span>
                    <span>❓ {p.questions.length} שאלות</span>
                    {r && <span className={`chip ${r.c / r.n >= 0.7 ? 'success' : 'warn'}`}>{Math.round((r.c / r.n) * 100)}%</span>}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
