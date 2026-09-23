import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { loadGrammarTopics } from '../data/content';
import type { GrammarTopic } from '../domain/types';
import { En, Loading, PageHeader, Ring } from '../components/ui';
import { topicMastery } from './Grammar';

export default function GrammarTopicPage() {
  const { id } = useParams();
  const { state } = useGame();
  const nav = useNavigate();
  const [topic, setTopic] = useState<GrammarTopic | null | undefined>(undefined);
  useEffect(() => {
    loadGrammarTopics().then((ts) => setTopic(ts.find((t) => t.id === id) ?? null));
  }, [id]);
  if (topic === undefined) return <Loading />;
  if (topic === null) return <p>נושא לא נמצא</p>;
  const m = topicMastery(state.answers, topic.id);
  const steps = [
    { k: 'Explanation', done: true },
    { k: 'Practice', done: m.n >= 5 },
    { k: 'Challenge', done: m.n >= 10 && m.pct >= 60 },
    { k: 'Mastery', done: m.pct >= 80 },
  ];
  return (
    <div className="stack q-wrap">
      <PageHeader title={<>{topic.emoji} <En>{topic.title}</En></>} sub={topic.titleHe} back="/grammar" />
      <div className="row wrap" style={{ gap: 6 }}>
        {steps.map((s, i) => (
          <span key={s.k} className={`chip ${s.done ? 'success' : ''}`}>
            {s.done ? '✓' : i + 1} <En>{s.k}</En>
          </span>
        ))}
      </div>
      <div className="card">
        <h2>📘 הסבר קצר</h2>
        <ul style={{ paddingInlineStart: 20, margin: 0, lineHeight: 1.9 }}>
          {topic.explanation.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
        <div className="hr" style={{ margin: '14px 0' }} />
        <h3>דוגמאות</h3>
        <div className="stack" style={{ gap: 6 }}>
          {topic.examples.map((e, i) => (
            <div key={i} className="en card soft" lang="en" style={{ padding: '10px 14px' }}>
              {e}
            </div>
          ))}
        </div>
      </div>
      <div className="card row">
        <Ring pct={m.pct} size={86} stroke={9} label="Mastery">
          <b className="num">{m.pct}%</b>
        </Ring>
        <div>
          <b>
            <En>Mastery</En>
          </b>
          <div className="faint">מבוסס על 15 התשובות האחרונות בנושא, בשקלול קושי. ב-80% הנושא נחשב בשליטה.</div>
        </div>
      </div>
      <div className="grid-2">
        <button className="btn lg" onClick={() => nav(`/play/practice?skill=grammar&topic=${topic.id}`)}>
          ✍️ <En>Practice</En>
        </button>
        <button className="btn lg accent" onClick={() => nav(`/play/practice?skill=grammar&topic=${topic.id}&challenge=1`)}>
          🔥 <En>Challenge</En>
        </button>
      </div>
    </div>
  );
}
