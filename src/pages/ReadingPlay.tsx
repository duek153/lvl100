import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useBank } from '../store/useBank';
import SessionPlayer from '../components/SessionPlayer';
import { Loading } from '../components/ui';

export default function ReadingPlay() {
  const { id } = useParams();
  const bank = useBank();
  const passages = useMemo(() => new Map(bank?.passages.map((p) => [p.id, p]) ?? []), [bank]);
  if (!bank) return <Loading />;
  const p = passages.get(id ?? '');
  if (!p) return <p>הקטע לא נמצא</p>;
  return <SessionPlayer key={p.id} title={`${p.emoji} ${p.title}`} mode="practice" questions={p.questions} passages={passages} exitTo="/reading" finish={(s) => ({ kind: 'practice', refId: p.id, total: s.total, correct: s.correct, ms: s.ms })} />;
}
