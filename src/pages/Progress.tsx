import { useState } from 'react';
import { useGame } from '../store/GameContext';
import { levelFromXp } from '../domain/levels';
import { estimatedScore } from '../domain/scoring';
import { isLearned, isMastered } from '../domain/srs';
import { effectiveStreak } from '../domain/streak';
import { addDays, dayKey } from '../domain/util';
import { localDay } from '../domain/quests';
import type { AnswerRecord } from '../domain/types';
import { BarChart, En, LineChart, PageHeader, Stat, Tabs } from '../components/ui';
import { SCORE_DISCLAIMER } from '../data/exam';

type Range = 'week' | 'lastweek' | 'month' | 'all';

function inRange(day: string, range: Range, today: string): boolean {
  if (range === 'all') return true;
  if (range === 'week') return day > addDays(today, -7);
  if (range === 'lastweek') return day <= addDays(today, -7) && day > addDays(today, -14);
  return day > addDays(today, -30);
}

const acc = (as: AnswerRecord[]) => (as.length ? Math.round((as.filter((a) => a.correct).length / as.length) * 100) : 0);

export default function ProgressPage() {
  const { state } = useGame();
  const [range, setRange] = useState<Range>('week');
  const today = dayKey();
  const p = state.progress;
  const answers = state.answers.filter((a) => inRange(localDay(a.date), range, today));
  const words = Object.values(state.vocab);
  const lv = levelFromXp(p.xp);
  const hist = p.scoreHistory.filter((h) => inRange(h.date, range, today));
  const target = state.profile?.targetScore ?? 100;

  // last N days series
  const nDays = range === 'all' ? Math.min(60, Math.max(7, Object.keys(p.days).length)) : range === 'month' ? 30 : 7;
  const endDay = range === 'lastweek' ? addDays(today, -7) : today;
  const days = Array.from({ length: nDays }, (_, i) => addDays(endDay, i - nDays + 1));
  const studyMin = days.map((d) => Math.round((p.days[d]?.ms ?? 0) / 60000));
  const accSeries = days.map((d) => {
    const s = p.days[d];
    return s && s.questions ? Math.round((s.correct / s.questions) * 100) : 0;
  });
  const label = (d: string) => d.slice(8) + '/' + d.slice(5, 7);
  const avgMs = answers.length ? answers.reduce((s, a) => s + a.ms, 0) / answers.length : 0;
  const scoreMin = Math.min(50, ...hist.map((h) => h.score));
  const scoreMax = Math.max(target + 10, ...hist.map((h) => h.score));

  return (
    <div className="stack">
      <PageHeader title={<En>My Progress 📈</En>} />
      <Tabs
        value={range}
        onChange={setRange}
        options={[
          { value: 'week', label: 'This week' },
          { value: 'lastweek', label: 'Last week' },
          { value: 'month', label: 'This month' },
          { value: 'all', label: 'All time' },
        ]}
      />
      <div className="card">
        <div className="card-title">
          <h2>
            <En>Score</En>
          </h2>
          <span className="chip accent">— יעד {target}</span>
        </div>
        <LineChart points={hist.map((h) => h.score)} labels={hist.map((h) => label(h.date))} min={Math.floor(scoreMin / 10) * 10} max={Math.min(150, Math.ceil(scoreMax / 10) * 10)} target={target} />
        <p className="faint" style={{ margin: 0 }}>
          {SCORE_DISCLAIMER}
        </p>
      </div>
      <div className="grid-2">
        <div className="card">
          <h3>
            <En>Accuracy over time</En>
          </h3>
          <LineChart points={accSeries} labels={days.map(label)} min={0} max={100} height={150} />
        </div>
        <div className="card">
          <h3>
            <En>Study time</En> (דקות)
          </h3>
          <BarChart values={nDays <= 14 ? studyMin : studyMin.slice(-14)} labels={(nDays <= 14 ? days : days.slice(-14)).map((d) => d.slice(8))} />
        </div>
      </div>
      <h2 style={{ marginTop: 8 }}>
        <En>Analytics</En>
      </h2>
      <div className="grid-4">
        <Stat value={answers.length} label="Total questions" />
        <Stat value={answers.filter((a) => a.correct).length} label="Correct answers" />
        <Stat value={`${acc(answers)}%`} label="Accuracy" />
        <Stat value={`${(avgMs / 1000).toFixed(1)}s`} label="Avg response time" />
        <Stat value={words.filter(isLearned).length} label="Words learned" />
        <Stat value={words.filter(isMastered).length} label="Words mastered" />
        <Stat value={`${acc(answers.filter((a) => a.skill === 'reading'))}%`} label="Reading accuracy" />
        <Stat value={`${acc(answers.filter((a) => a.skill === 'grammar'))}%`} label="Grammar accuracy" />
        <Stat value={`${acc(answers.filter((a) => a.skill === 'vocabulary'))}%`} label="Vocabulary accuracy" />
        <Stat value={`${acc(answers.filter((a) => a.skill === 'restatement'))}%`} label="Restatement accuracy" />
        <Stat value={`🔥 ${effectiveStreak(p.streak, today)}`} label="Current streak" />
        <Stat value={p.streak.longest} label="Longest streak" />
        <Stat value={p.xp.toLocaleString()} label="XP" />
        <Stat value={lv.level} label={`Level · ${lv.def.name}`} />
        <Stat value={estimatedScore(p.ability)} label="Estimated score" />
        <Stat value={target} label="Target score" />
      </div>
    </div>
  );
}
