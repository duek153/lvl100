import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { loadGrammarTopics } from '../data/content';
import type { AnswerRecord, GrammarTopic } from '../domain/types';
import { Bar, En, Loading, PageHeader } from '../components/ui';

export function topicMastery(answers: AnswerRecord[], topic: string): { pct: number; n: number } {
  const rel = answers.filter((a) => a.skill === 'grammar' && a.topic === topic).slice(-15);
  if (!rel.length) return { pct: 0, n: 0 };
  let num = 0;
  let den = 0;
  for (const a of rel) {
    den += a.difficulty;
    if (a.correct) num += a.difficulty;
  }
  return { pct: Math.round((num / den) * 100 * Math.min(1, rel.length / 8)), n: answers.filter((a) => a.topic === topic).length };
}

export default function Grammar() {
  const { state } = useGame();
  const [topics, setTopics] = useState<GrammarTopic[] | null>(null);
  useEffect(() => {
    loadGrammarTopics().then(setTopics);
  }, []);
  if (!topics) return <Loading />;
  return (
    <div className="stack">
      <PageHeader title="דקדוק 🧩" sub={<>כל נושא: הסבר קצר ← <En>Practice</En> ← <En>Challenge</En> ← <En>Mastery</En></>} />
      <Link to="/play/practice?skill=grammar" className="card hero link">
        <div className="row" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '2rem' }}>🎲</div>
          <div>
            <h3 style={{ marginBottom: 0 }}>
              <En>Mixed Grammar</En>
            </h3>
            <div className="muted">10 שאלות מכל הנושאים, מותאמות לרמה שלך</div>
          </div>
        </div>
      </Link>
      <div className="grid-2">
        {topics.map((t) => {
          const m = topicMastery(state.answers, t.id);
          return (
            <Link key={t.id} to={`/grammar/${t.id}`} className="card link">
              <div className="row">
                <div className="emoji-badge">{t.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div className="spread">
                    <b>
                      <En>{t.title}</En>
                    </b>
                    {m.pct >= 80 && <span className="chip success">Mastered</span>}
                  </div>
                  <div className="faint">{t.titleHe}</div>
                  <Bar pct={m.pct} className="thin" label="Mastery" />
                  <div className="xs muted" style={{ marginTop: 3 }}>
                    Mastery {m.pct}% · {m.n} שאלות
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
